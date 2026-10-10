/** PostgreSQL 18 WASM AST adapter. SQL is parsed as data and never executed. */
import fs from "node:fs";
import path from "node:path";
import { loadModule, parseSync } from "libpg-query";
import {
  Builder,
  digest,
  display,
  safe_path,
  json_sorted,
  compare,
  quoted,
} from "./model.mjs";

await loadModule();
export const RELATIONS = new Set([
  "table",
  "partitioned_table",
  "view",
  "materialized_view",
  "sequence",
]);
export const strings = (items) =>
  (items ?? []).filter((i) => i.String).map((i) => i.String.sval);
export function* walk(value, kind) {
  if (Array.isArray(value)) {
    for (const v of value) yield* walk(v, kind);
  } else if (value && typeof value === "object") {
    if (Object.hasOwn(value, kind)) yield value[kind];
    for (const v of Object.values(value)) yield* walk(v, kind);
  }
}
export function typename(t) {
  let names = strings(t.names ?? []);
  if (names[0] === "pg_catalog") names = names.slice(1);
  let name =
    names.map(quoted).join(".") + "[]".repeat((t.arrayBounds ?? []).length);
  if (t.typmods?.length)
    name +=
      "(" + t.typmods.map((x) => x.A_Const?.ival?.ival ?? 0).join(",") + ")";
  return name;
}
export function clean_ast(value) {
  if (Array.isArray(value)) return value.map(clean_ast);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) =>
            !["location", "stmt_location", "stmt_len", "arg_location"].includes(
              k,
            ),
        )
        .map(([k, v]) => [k, clean_ast(v)]),
    );
  return value;
}
export const ast_hash = (value) => digest(json_sorted(clean_ast(value)));
export function statements(text) {
  try {
    return parseSync(text).stmts ?? [];
  } catch {
    throw new Error(
      "Invalid PostgreSQL syntax; inspect the local input with a PostgreSQL parser",
    );
  }
}
export function read_statements(file, builder, origin = "sql_file") {
  const raw = fs.readFileSync(file);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  // Parse without the BOM while keeping evidence tied to original file bytes.
  const prefix =
    raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
      ? 3
      : 0;
  return statements(text).map((item) => {
    const start = (item.stmt_location ?? 0) + prefix,
      length = item.stmt_len || raw.length - start;
    const ev = builder.evidence(file, raw, start, length, "PARSED", origin);
    const [kind, body] = Object.entries(item.stmt)[0];
    return [kind, body, ev];
  });
}
export class Inspector {
  constructor(version = "18") {
    this.b = new Builder(version);
    this.pending = [];
  }
  relation(rv, ev) {
    const candidates = [...this.b.nodes.values()].filter(
      (n) =>
        RELATIONS.has(n.kind) &&
        n.name === rv.relname &&
        (!rv.schemaname || n.schema === rv.schemaname),
    );
    if (candidates.length !== 1) {
      this.b.unknown(
        `${candidates.length ? "Ambiguous" : "Unresolved"} relation ${display(rv.schemaname ?? "", rv.relname ?? "?")}; search_path is not assumed.`,
        ev,
      );
      return null;
    }
    return candidates[0];
  }
  column(rel, name) {
    return (
      [...this.b.nodes.values()].find(
        (n) =>
          n.kind === "column" &&
          n.schema === rel.schema &&
          n.parent === rel.name &&
          n.name === name,
      ) ?? null
    );
  }
  add_column(rel, col, ev) {
    const constraints = (col.constraints ?? []).map((c) => c.Constraint);
    const props = {
      type: typename(col.typeName ?? {}),
      nullable: !constraints.some((c) =>
        ["CONSTR_NOTNULL", "CONSTR_PRIMARY"].includes(c.contype),
      ),
      definition_hash: ast_hash(col),
    };
    for (const c of constraints)
      if (
        ["CONSTR_DEFAULT", "CONSTR_GENERATED", "CONSTR_IDENTITY"].includes(
          c.contype,
        )
      )
        props[c.contype.slice(7).toLowerCase()] = ast_hash(c);
    const node = this.b.node(
      "column",
      rel.schema,
      col.colname,
      ev,
      rel.name,
      "",
      props,
    );
    this.b.edge(node, rel, "contains", ev);
    this.pending.push(["type", [node, col.typeName ?? {}], ev]);
    for (const c of constraints)
      this.pending.push(["constraint", [rel, c, [col.colname]], ev]);
    return node;
  }
  declare(kind, body, ev, file) {
    const b = this.b;
    if (kind === "CreateSchemaStmt")
      b.node("schema", body.schemaname, body.schemaname, ev);
    else if (
      ["CreateEnumStmt", "CompositeTypeStmt", "CreateDomainStmt"].includes(kind)
    ) {
      const names =
        kind === "CompositeTypeStmt"
          ? [body.typevar.schemaname ?? "public", body.typevar.relname]
          : strings(
              kind === "CreateDomainStmt"
                ? body.domainname
                : (body.typeName ?? []),
            );
      b.node(
        "type",
        names.length > 1 ? names.at(-2) : "public",
        names.at(-1),
        ev,
        "",
        "",
        { definition_hash: ast_hash(body) },
      );
    } else if (kind === "CreateStmt") {
      const rv = body.relation;
      const rel = b.node(
        body.partspec ? "partitioned_table" : "table",
        rv.schemaname ?? "public",
        rv.relname,
        ev,
        "",
        "",
        { definition_hash: ast_hash(body) },
      );
      for (const elt of body.tableElts ?? []) {
        if (elt.ColumnDef) this.add_column(rel, elt.ColumnDef, ev);
        else if (elt.Constraint)
          this.pending.push(["constraint", [rel, elt.Constraint, []], ev]);
        else b.unknown("Unsupported table element", ev, rel.id);
      }
      for (const parent of body.inhRelations ?? [])
        this.pending.push([
          "inherit",
          [rel, parent.RangeVar ?? parent, Boolean(body.partbound)],
          ev,
        ]);
    } else if (["ViewStmt", "CreateTableAsStmt"].includes(kind)) {
      const materialized =
        kind === "CreateTableAsStmt" && body.objtype === "OBJECT_MATVIEW";
      if (kind === "CreateTableAsStmt" && !materialized) {
        b.unknown(
          "CREATE TABLE AS needs catalog columns; not modeled offline.",
          ev,
        );
        return;
      }
      const rv = materialized ? body.into.rel : body.view,
        query = body.query;
      const rel = b.node(
        materialized ? "materialized_view" : "view",
        rv.schemaname ?? "public",
        rv.relname,
        ev,
        "",
        "",
        { definition_hash: ast_hash(query) },
      );
      const targets = query.SelectStmt?.targetList ?? [],
        aliases = strings(body.aliases ?? []);
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i].ResTarget,
          fieldNodes = t.val?.ColumnRef?.fields ?? [],
          fields = strings(fieldNodes),
          star = fieldNodes.some((field) => field.A_Star);
        const name =
          i < aliases.length
            ? aliases[i]
            : t.name || (star ? null : fields.at(-1));
        if (name) this.add_column(rel, { colname: name }, ev);
        else
          b.unknown(
            "View output expression/star without explicit alias needs catalog column metadata.",
            ev,
            rel.id,
          );
      }
      this.pending.push(["query", [rel, query], ev]);
    } else if (kind === "CreateSeqStmt") {
      const rv = body.sequence,
        rel = b.node(
          "sequence",
          rv.schemaname ?? "public",
          rv.relname,
          ev,
          "",
          "",
          { definition_hash: ast_hash(body) },
        );
      this.pending.push(["sequence", [rel, body], ev]);
    } else if (kind === "CreateFunctionStmt") {
      const names = strings(body.funcname),
        params = (body.parameters ?? []).map((p) => p.FunctionParameter);
      const signature = params
        .filter((p) => p.mode !== "FUNC_PARAM_OUT")
        .map((p) => typename(p.argType))
        .join(",");
      const fn = b.node(
        body.is_procedure ? "procedure" : "function",
        names.length > 1 ? names.at(-2) : "public",
        names.at(-1),
        ev,
        "",
        signature,
        { definition_hash: ast_hash(body) },
      );
      b.unknown(
        "Routine body/runtime references are not exhaustively analyzed offline, including dynamic SQL.",
        ev,
        fn.id,
      );
      for (const parameter of params) {
        const names = strings(parameter.argType.names ?? []);
        if (
          names.length === 1 &&
          [...b.nodes.values()].filter(
            (n) => n.kind === "type" && n.name === names[0],
          ).length > 1
        )
          b.unknown(
            "Ambiguous routine parameter type; search_path and overload identity require catalog resolution.",
            ev,
            fn.id,
          );
      }
    } else if (kind === "CreateTrigStmt")
      this.pending.push(["trigger", body, ev]);
    else if (kind === "IndexStmt") this.pending.push(["index", body, ev]);
    else if (
      ["SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt"].includes(kind)
    ) {
      const query = b.node(
        "query",
        "application",
        `${safe_path(file)}:${ev}`,
        ev,
        "",
        "",
        { query_type: kind },
        "PARSED",
        "application_source",
      );
      this.pending.push(["query", [query, { [kind]: body }], ev]);
    } else if (kind === "AlterTableStmt")
      this.pending.push(["alter", body, ev]);
    else if (kind === "VariableSetStmt") {
      if (body.name === "search_path")
        b.unknown(
          "search_path changes are not applied; unqualified collisions remain ambiguous.",
          ev,
        );
    } else if (kind === "CreateExtensionStmt")
      b.node("extension", "public", body.extname, ev);
    else
      b.unknown(
        `Unsupported offline statement ${kind}; snapshot is partial.`,
        ev,
      );
  }
  constraints(rel, c, local, ev) {
    const b = this.b,
      typ = c.contype;
    if (["CONSTR_NOTNULL", "CONSTR_NULL"].includes(typ)) return;
    if (
      ["CONSTR_DEFAULT", "CONSTR_GENERATED", "CONSTR_IDENTITY"].includes(typ)
    ) {
      const col = local.length ? this.column(rel, local[0]) : null;
      if (col && c.raw_expr) {
        this.local_refs(col, rel, c.raw_expr, ev);
        if ([...walk(c.raw_expr, "FuncCall")].length)
          b.unknown(
            "Default/generated function and sequence expression targets need catalog resolution.",
            ev,
            col.id,
          );
      }
      if (typ === "CONSTR_IDENTITY")
        b.unknown(
          "Identity sequence exists but its actual name/OID needs catalog metadata.",
          ev,
          col?.id ?? rel.id,
        );
      return;
    }
    const mapped = {
      CONSTR_FOREIGN: "foreign_key",
      CONSTR_PRIMARY: "primary_key",
      CONSTR_UNIQUE: "unique",
      CONSTR_CHECK: "check",
      CONSTR_EXCLUSION: "exclusion",
    };
    if (!mapped[typ]) {
      b.unknown(`Unsupported constraint ${typ}`, ev, rel.id);
      return;
    }
    const explicit = strings(c.fk_attrs ?? c.keys ?? []);
    local = explicit.length ? explicit : local;
    const suffix = {
      CONSTR_FOREIGN: "fkey",
      CONSTR_PRIMARY: "pkey",
      CONSTR_UNIQUE: "key",
      CONSTR_CHECK: "check",
      CONSTR_EXCLUSION: "excl",
    }[typ];
    let name =
      c.conname ||
      [rel.name, ...(typ === "CONSTR_PRIMARY" ? [] : local), suffix].join("_");
    if (!c.conname && ["CONSTR_CHECK", "CONSTR_EXCLUSION"].includes(typ)) {
      name += "__" + ast_hash(c).slice(7, 19);
      const base = name;
      let occurrence = 1;
      while (
        [...b.nodes.values()].some(
          (n) =>
            n.kind === "constraint" &&
            n.schema === rel.schema &&
            n.parent === rel.name &&
            n.name === name,
        )
      )
        name = `${base}_${++occurrence}`;
    }
    let signature = !c.conname ? ast_hash(c).slice(7, 31) : "";
    if (!c.conname) {
      const base = signature;
      let occurrence = 1;
      while (
        [...b.nodes.values()].some(
          (n) =>
            n.kind === "constraint" &&
            n.schema === rel.schema &&
            n.parent === rel.name &&
            n.name === name &&
            n.signature === signature,
        )
      )
        signature = `${base}_${++occurrence}`;
    }
    const constraint = b.node(
      "constraint",
      rel.schema,
      name,
      ev,
      rel.name,
      signature,
      {
        constraint_type: mapped[typ],
        columns: local,
        definition_hash: ast_hash(c),
        name_inferred: !c.conname,
      },
    );
    b.edge(constraint, rel, "contains", ev);
    for (const name of local) {
      const n = this.column(rel, name);
      if (n) {
        if (typ === "CONSTR_PRIMARY") n.properties.nullable = false;
        b.edge(constraint, n, "expression_reference", ev);
      } else
        b.unknown(`Unresolved constraint column ${name}`, ev, constraint.id);
    }
    this.local_refs(constraint, rel, c.raw_expr ?? {}, ev);
    if (typ === "CONSTR_FOREIGN") {
      const target = this.relation(c.pktable, ev);
      if (!target) return;
      b.edge(rel, target, "foreign_key", ev, "PARSED", "sql_file", {
        constraint: constraint.id,
        columns: local,
      });
      b.edge(constraint, target, "foreign_key", ev);
      let remote = strings(c.pk_attrs ?? []);
      if (!remote.length) {
        const pks = [...b.nodes.values()].filter(
          (n) =>
            n.kind === "constraint" &&
            n.schema === target.schema &&
            n.parent === target.name &&
            n.properties.constraint_type === "primary_key",
        );
        if (pks.length === 1) remote = pks[0].properties.columns;
      }
      if (remote.length !== local.length)
        b.unknown("FK key column resolution incomplete", ev, constraint.id);
      for (let i = 0; i < Math.min(local.length, remote.length); i++) {
        const cn = this.column(rel, local[i]),
          tn = this.column(target, remote[i]);
        if (tn) {
          b.edge(constraint, tn, "foreign_key", ev);
          if (cn)
            b.edge(cn, tn, "foreign_key", ev, "PARSED", "sql_file", {
              constraint: constraint.id,
            });
        } else
          b.unknown(
            `Unresolved referenced key column ${remote[i]}`,
            ev,
            constraint.id,
          );
      }
    }
  }
  local_refs(source, relation, expr, ev) {
    for (const c of walk(expr, "ColumnRef")) {
      const fields = strings(c.fields ?? []),
        n = fields.length ? this.column(relation, fields.at(-1)) : null;
      if (n) this.b.edge(source, n, "expression_reference", ev);
      else this.b.unknown("Unresolved expression column", ev, source.id);
    }
  }
  query(source, query, ev) {
    const b = this.b,
      cteNames = new Set(
        [...walk(query, "CommonTableExpr")].map((c) => c.ctename),
      );
    const relations = [],
      aliases = new Map(),
      targets = [];
    for (const kind of ["InsertStmt", "UpdateStmt", "DeleteStmt"])
      for (const stmt of walk(query, kind)) targets.push([kind, stmt]);
    const rangevars = [
        ...walk(query, "RangeVar"),
        ...targets.map(([, stmt]) => stmt.relation),
      ],
      resolved = new Map();
    for (const rv of rangevars) {
      if (cteNames.has(rv.relname) && !rv.schemaname) continue;
      const rel = this.relation(rv, ev);
      if (rel) {
        relations.push(rel);
        const alias = rv.alias?.aliasname ?? rel.name;
        if (!aliases.has(alias)) aliases.set(alias, []);
        aliases.get(alias).push(rel);
        b.edge(source, rel, "query_reference", ev);
        resolved.set(rv, rel);
      }
    }
    const joins = [...walk(query, "JoinExpr")];
    if (
      rangevars.some((rv) => rv.alias?.colnames?.length) ||
      joins.some((join) => join.alias?.colnames?.length)
    ) {
      b.unknown(
        "Relation alias column lists rename columns by position; column scope is unsupported. Only grounded relation references are retained.",
        ev,
        source.id,
      );
      return;
    }
    if (joins.some((join) => join.usingClause?.length || join.isNatural)) {
      b.unknown(
        "JOIN USING/NATURAL column merging and implicit join-key references require scope/catalog resolution. Only grounded relation references are retained.",
        ev,
        source.id,
      );
      return;
    }
    for (const [kind, stmt] of targets) {
      const target = resolved.get(stmt.relation);
      if (!target) continue;
      const attrs =
        kind === "InsertStmt"
          ? (stmt.cols ?? [])
          : kind === "UpdateStmt"
            ? (stmt.targetList ?? [])
            : [];
      for (const attr of attrs) {
        const name = attr.ResTarget.name,
          col = this.column(target, name);
        if (col) b.edge(source, col, "query_reference", ev);
        else b.unknown(`Unresolved DML target column ${name}`, ev, source.id);
      }
      if (kind === "InsertStmt" && !attrs.length) {
        b.unknown(
          "Implicit INSERT column order/default mapping needs catalog verification.",
          ev,
          source.id,
        );
        for (const col of b.nodes.values())
          if (
            col.kind === "column" &&
            col.schema === target.schema &&
            col.parent === target.name
          )
            b.edge(source, col, "query_reference", ev);
      }
    }
    const complex =
      [...walk(query, "SelectStmt")].length > 1 ||
      cteNames.size ||
      [...walk(query, "RangeSubselect")].length ||
      targets.some(
        ([kind, stmt]) =>
          kind === "InsertStmt" &&
          stmt.selectStmt?.SelectStmt?.fromClause?.length,
      );
    if (complex) {
      b.unknown(
        "Nested/CTE/set-operation column scope is unsupported; only grounded table references retained.",
        ev,
        source.id,
      );
      return;
    }
    for (const c of walk(query, "ColumnRef")) {
      const fields = strings(c.fields ?? []),
        star = (c.fields ?? []).some((f) => f.A_Star);
      let candidates = [...new Map(relations.map((r) => [r.id, r])).values()];
      if (star) {
        if (fields.length) candidates = aliases.get(fields.at(-1)) ?? [];
        if (fields.length === 2)
          candidates = candidates.filter((r) => r.schema === fields[0]);
      } else {
        if (fields.length >= 2) candidates = aliases.get(fields.at(-2)) ?? [];
        if (fields.length === 3)
          candidates = candidates.filter((r) => r.schema === fields[0]);
      }
      if (star) {
        for (const rel of candidates)
          for (const n of b.nodes.values())
            if (
              n.kind === "column" &&
              n.schema === rel.schema &&
              n.parent === rel.name
            )
              b.edge(source, n, "query_reference", ev);
        b.unknown(
          "SELECT star consumers also depend on output shape and future columns.",
          ev,
          source.id,
        );
        continue;
      }
      const nodes = new Map(
        (fields.length
          ? candidates.map((r) => this.column(r, fields.at(-1)))
          : []
        )
          .filter(Boolean)
          .map((n) => [n.id, n]),
      );
      if (nodes.size === 1)
        b.edge(source, nodes.values().next().value, "query_reference", ev);
      else if (fields.length)
        b.unknown(
          `${nodes.size ? "Ambiguous" : "Unresolved"} query column ${fields.join(".")}`,
          ev,
          source.id,
        );
    }
    for (const fc of walk(query, "FuncCall")) {
      const names = strings(fc.funcname ?? []);
      if (
        names.length &&
        [...b.nodes.values()].some(
          (n) =>
            ["function", "procedure"].includes(n.kind) &&
            n.name === names.at(-1),
        )
      )
        b.unknown(
          "Routine call overload resolution requires argument type analysis/catalogs.",
          ev,
          source.id,
        );
    }
  }
  resolve() {
    const pending = [...this.pending].sort(
      (a, b) =>
        (a[0] === "constraint" ? 0 : 1) - (b[0] === "constraint" ? 0 : 1),
    );
    for (const [kind, data, ev] of pending) {
      const b = this.b;
      if (kind === "constraint") this.constraints(...data, ev);
      else if (kind === "query") this.query(...data, ev);
      else if (kind === "inherit") {
        const [rel, rv, partition] = data,
          parent = this.relation(rv, ev);
        if (parent) {
          b.edge(rel, parent, partition ? "partition" : "inheritance", ev);
          b.unknown(
            "Inherited column definitions/partition bounds are not expanded offline; capture catalogs.",
            ev,
            rel.id,
          );
        }
      } else if (kind === "type") {
        const [col, t] = data,
          names = strings(t.names ?? []);
        const candidates = [...b.nodes.values()].filter(
          (n) =>
            n.kind === "type" &&
            n.name === names.at(-1) &&
            (names.length < 2 || n.schema === names.at(-2)),
        );
        if (candidates.length === 1)
          b.edge(col, candidates[0], "type_reference", ev);
        else if (candidates.length > 1)
          b.unknown(
            "Ambiguous custom type; search_path is not assumed.",
            ev,
            col.id,
          );
      } else if (["index", "trigger"].includes(kind)) {
        const rel = this.relation(data.relation, ev);
        if (!rel) continue;
        const name = data.idxname ?? data.trigname;
        if (!name) {
          b.unknown("Unnamed index needs catalog-generated name", ev, rel.id);
          continue;
        }
        const obj = b.node(
          kind,
          rel.schema,
          name,
          ev,
          kind === "trigger" ? rel.name : "",
          "",
          { definition_hash: ast_hash(data) },
        );
        b.edge(
          obj,
          rel,
          kind === "trigger" ? "trigger_association" : "contains",
          ev,
        );
        this.local_refs(obj, rel, data, ev);
        for (const ie of walk(data, "IndexElem")) {
          const n = this.column(rel, ie.name);
          if (n) b.edge(obj, n, "expression_reference", ev);
        }
        if (kind === "trigger") {
          const names = strings(data.funcname),
            fns = [...b.nodes.values()].filter(
              (n) =>
                n.kind === "function" &&
                n.name === names.at(-1) &&
                n.signature === "" &&
                (names.length === 1 || n.schema === names.at(-2)),
            );
          if (fns.length === 1) b.edge(obj, fns[0], "trigger_association", ev);
          else b.unknown("Unresolved trigger function", ev, obj.id);
          for (const name of strings(data.columns ?? [])) {
            const col = this.column(rel, name);
            if (col) b.edge(obj, col, "expression_reference", ev);
          }
        }
      } else if (kind === "alter") {
        const rel = this.relation(data.relation, ev);
        for (const item of data.cmds ?? []) {
          const c = item.AlterTableCmd;
          if (rel && c.subtype === "AT_AddConstraint")
            this.constraints(rel, c.def.Constraint, [], ev);
          else
            b.unknown(
              `Offline snapshot does not replay ${c.subtype}; supply final DDL/catalogs.`,
              ev,
              rel?.id ?? null,
            );
        }
      } else if (kind === "sequence")
        b.unknown(
          "Sequence ownership/options require catalog resolution in offline mode.",
          ev,
          data[0].id,
        );
    }
  }
}
function files_under(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...files_under(full));
    else if (entry.isFile()) files.push(full);
  }
  return files.sort(compare);
}
export function inspect_ddl(file, repo = null, version = "18") {
  const inspector = new Inspector(version),
    files = fs.statSync(file).isDirectory()
      ? files_under(file).filter((f) => path.extname(f) === ".sql")
      : [file];
  if (!files.length) throw new Error("No SQL schema files found");
  for (const f of files)
    for (const [kind, body, ev] of read_statements(f, inspector.b))
      inspector.declare(kind, body, ev, f);
  if (repo) {
    inspector.b.model.coverage.repository_scan = true;
    for (const f of files_under(repo)) {
      const suffix = path.extname(f);
      if (
        ![".sql", ".ts", ".js", ".py", ".cs", ".prisma", ".java"].includes(
          suffix,
        )
      )
        continue;
      if (suffix === ".sql")
        for (const [kind, body, ev] of read_statements(
          f,
          inspector.b,
          "application_source",
        ))
          inspector.declare(kind, body, ev, f);
      else {
        const raw = fs.readFileSync(f),
          ev = inspector.b.evidence(
            f,
            raw,
            0,
            raw.length,
            "UNKNOWN",
            "application_source",
          );
        inspector.b.unknown(
          "Host-language SQL/ORM extraction is unsupported; dynamic paths remain UNKNOWN.",
          ev,
        );
      }
    }
  }
  inspector.resolve();
  inspector.b.model.coverage.capabilities = [
    "ddl_ast",
    "simple_sql_references",
    "reverse_dependencies",
  ];
  return inspector.b.finish();
}
