"""PostgreSQL AST adapter. Input SQL is data and never executed."""

import json
from pathlib import Path

from pglast import parser

from .model import Builder, digest, display

RELATIONS = {"table", "partitioned_table", "view", "materialized_view", "sequence"}


def strings(items):
    return [i["String"]["sval"] for i in items if "String" in i]


def walk(value, kind):
    if isinstance(value, dict):
        if kind in value:
            yield value[kind]
        for v in value.values():
            yield from walk(v, kind)
    elif isinstance(value, list):
        for v in value:
            yield from walk(v, kind)


def typename(t):
    names = strings(t.get("names", []))
    if names[:1] == ["pg_catalog"]:
        names = names[1:]
    name = ".".join(names)
    name += "[]" * len(t.get("arrayBounds", []))
    if t.get("typmods"):
        name += (
            "("
            + ",".join(
                str(x.get("A_Const", {}).get("ival", {}).get("ival", 0)) for x in t["typmods"]
            )
            + ")"
        )
    return name


def clean_ast(v):
    if isinstance(v, dict):
        return {
            k: clean_ast(x)
            for k, x in v.items()
            if k not in {"location", "stmt_location", "stmt_len", "arg_location"}
        }
    if isinstance(v, list):
        return [clean_ast(x) for x in v]
    return v


def ast_hash(v):
    return digest(json.dumps(clean_ast(v), sort_keys=True))


def statements(text):
    try:
        return json.loads(parser.parse_sql_json(text))["stmts"]
    except parser.ParseError as exc:
        # Parser messages can echo SQL values. Never expose the raw exception.
        raise ValueError(
            "Invalid PostgreSQL syntax; inspect the local input with a PostgreSQL parser"
        ) from exc


def read_statements(path, builder, origin="sql_file"):
    raw = Path(path).read_bytes()
    text = raw.decode("utf-8-sig")
    # Remove the UTF-8 BOM before hashing and computing parser byte locations.
    raw = text.encode("utf-8")
    result = []
    for item in statements(text):
        start = item.get("stmt_location", 0)
        length = item.get("stmt_len", 0) or len(raw) - start
        ev = builder.evidence(path, raw, start, length, origin=origin)
        kind, body = next(iter(item["stmt"].items()))
        result.append((kind, body, ev))
    return result


class Inspector:
    def __init__(self, version="18"):
        self.b = Builder(version)
        self.pending = []

    def relation(self, rv, ev):
        candidates = [
            n
            for n in self.b.nodes.values()
            if n["kind"] in RELATIONS
            and n["name"] == rv.get("relname")
            and (not rv.get("schemaname") or n["schema"] == rv["schemaname"])
        ]
        if len(candidates) != 1:
            self.b.unknown(
                f"{'Ambiguous' if candidates else 'Unresolved'} relation {display(rv.get('schemaname', ''), rv.get('relname', '?'))}; search_path is not assumed.",
                ev,
            )
            return None
        return candidates[0]

    def column(self, rel, name):
        return next(
            (
                n
                for n in self.b.nodes.values()
                if n["kind"] == "column"
                and n["schema"] == rel["schema"]
                and n["parent"] == rel["name"]
                and n["name"] == name
            ),
            None,
        )

    def add_column(self, rel, col, ev):
        constraints = [c["Constraint"] for c in col.get("constraints", [])]
        props = {
            "type": typename(col.get("typeName", {})),
            "nullable": not any(
                c["contype"] in {"CONSTR_NOTNULL", "CONSTR_PRIMARY"} for c in constraints
            ),
            "definition_hash": ast_hash(col),
        }
        for c in constraints:
            if c["contype"] in {"CONSTR_DEFAULT", "CONSTR_GENERATED", "CONSTR_IDENTITY"}:
                props[c["contype"].removeprefix("CONSTR_").lower()] = ast_hash(c)
        node = self.b.node(
            "column", rel["schema"], col["colname"], ev, rel["name"], properties=props
        )
        self.b.edge(node, rel, "contains", ev)
        self.pending.append(("type", (node, col.get("typeName", {})), ev))
        for c in constraints:
            self.pending.append(("constraint", (rel, c, [col["colname"]]), ev))
        return node

    def declare(self, kind, body, ev, path):
        b = self.b
        if kind == "CreateSchemaStmt":
            b.node("schema", body["schemaname"], body["schemaname"], ev)
        elif kind in {"CreateEnumStmt", "CompositeTypeStmt", "CreateDomainStmt"}:
            if kind == "CompositeTypeStmt":
                names = [body["typevar"].get("schemaname", "public"), body["typevar"]["relname"]]
            else:
                names = strings(body.get("typeName", body.get("domainname", [])))
            b.node(
                "type",
                names[-2] if len(names) > 1 else "public",
                names[-1],
                ev,
                properties={"definition_hash": ast_hash(body)},
            )
        elif kind == "CreateStmt":
            rv = body["relation"]
            rel = b.node(
                "partitioned_table" if body.get("partspec") else "table",
                rv.get("schemaname", "public"),
                rv["relname"],
                ev,
                properties={"definition_hash": ast_hash(body)},
            )
            for elt in body.get("tableElts", []):
                if "ColumnDef" in elt:
                    self.add_column(rel, elt["ColumnDef"], ev)
                elif "Constraint" in elt:
                    self.pending.append(("constraint", (rel, elt["Constraint"], []), ev))
                else:
                    b.unknown("Unsupported table element", ev, rel["id"])
            for parent in body.get("inhRelations", []):
                self.pending.append(
                    (
                        "inherit",
                        (rel, parent.get("RangeVar", parent), bool(body.get("partbound"))),
                        ev,
                    )
                )
        elif kind in {"ViewStmt", "CreateTableAsStmt"}:
            materialized = kind == "CreateTableAsStmt" and body.get("objtype") == "OBJECT_MATVIEW"
            if kind == "CreateTableAsStmt" and not materialized:
                b.unknown("CREATE TABLE AS needs catalog columns; not modeled offline.", ev)
                return
            rv = body["into"]["rel"] if materialized else body["view"]
            query = body["query"]
            rel = b.node(
                "materialized_view" if materialized else "view",
                rv.get("schemaname", "public"),
                rv["relname"],
                ev,
                properties={"definition_hash": ast_hash(query)},
            )
            targets = query.get("SelectStmt", {}).get("targetList", [])
            aliases = strings(body.get("aliases", []))
            for i, t in enumerate(targets):
                t = t["ResTarget"]
                fields = strings(t.get("val", {}).get("ColumnRef", {}).get("fields", []))
                name = (
                    aliases[i]
                    if i < len(aliases)
                    else t.get("name") or (fields[-1] if fields else None)
                )
                if name:
                    self.add_column(rel, {"colname": name}, ev)
                else:
                    b.unknown(
                        "View output expression/star without explicit alias needs catalog column metadata.",
                        ev,
                        rel["id"],
                    )
            self.pending.append(("query", (rel, query), ev))
        elif kind == "CreateSeqStmt":
            rv = body["sequence"]
            rel = b.node(
                "sequence",
                rv.get("schemaname", "public"),
                rv["relname"],
                ev,
                properties={"definition_hash": ast_hash(body)},
            )
            self.pending.append(("sequence", (rel, body), ev))
        elif kind == "CreateFunctionStmt":
            names = strings(body["funcname"])
            params = [p["FunctionParameter"] for p in body.get("parameters", [])]
            signature = ",".join(
                typename(p["argType"]) for p in params if p.get("mode") != "FUNC_PARAM_OUT"
            )
            fn = b.node(
                "procedure" if body.get("is_procedure") else "function",
                names[-2] if len(names) > 1 else "public",
                names[-1],
                ev,
                signature=signature,
                properties={"definition_hash": ast_hash(body)},
            )
            # SQL/PLpgSQL strings, SQL-standard bodies, and dynamic SQL require
            # separate scope/type analysis. Never guess runtime references.
            b.unknown(
                "Routine body/runtime references are not exhaustively analyzed offline, including dynamic SQL.",
                ev,
                fn["id"],
            )
        elif kind == "CreateTrigStmt":
            self.pending.append(("trigger", body, ev))
        elif kind == "IndexStmt":
            self.pending.append(("index", body, ev))
        elif kind in {"SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt"}:
            from .model import safe_path

            query = b.node(
                "query",
                "application",
                f"{safe_path(path)}:{ev}",
                ev,
                properties={"query_type": kind},
                origin="application_source",
            )
            self.pending.append(("query", (query, {kind: body}), ev))
        elif kind == "AlterTableStmt":
            self.pending.append(("alter", body, ev))
        elif kind == "VariableSetStmt":
            if body.get("name") == "search_path":
                b.unknown(
                    "search_path changes are not applied; unqualified collisions remain ambiguous.",
                    ev,
                )
        elif kind == "CreateExtensionStmt":
            b.node("extension", "public", body["extname"], ev)
        else:
            b.unknown(f"Unsupported offline statement {kind}; snapshot is partial.", ev)

    def constraints(self, rel, c, local, ev):
        b = self.b
        typ = c["contype"]
        if typ in {"CONSTR_NOTNULL", "CONSTR_NULL"}:
            return
        if typ in {"CONSTR_DEFAULT", "CONSTR_GENERATED", "CONSTR_IDENTITY"}:
            col = self.column(rel, local[0]) if local else None
            if col and c.get("raw_expr"):
                self.local_refs(col, rel, c["raw_expr"], ev)
                if any(True for _ in walk(c["raw_expr"], "FuncCall")):
                    b.unknown(
                        "Default/generated function and sequence expression targets need catalog resolution.",
                        ev,
                        col["id"],
                    )
            if typ == "CONSTR_IDENTITY":
                b.unknown(
                    "Identity sequence exists but its actual name/OID needs catalog metadata.",
                    ev,
                    col["id"] if col else rel["id"],
                )
            return
        mapped = {
            "CONSTR_FOREIGN": "foreign_key",
            "CONSTR_PRIMARY": "primary_key",
            "CONSTR_UNIQUE": "unique",
            "CONSTR_CHECK": "check",
            "CONSTR_EXCLUSION": "exclusion",
        }
        if typ not in mapped:
            b.unknown(f"Unsupported constraint {typ}", ev, rel["id"])
            return
        local = strings(c.get("fk_attrs", c.get("keys", []))) or local
        suffix = {
            "CONSTR_FOREIGN": "fkey",
            "CONSTR_PRIMARY": "pkey",
            "CONSTR_UNIQUE": "key",
            "CONSTR_CHECK": "check",
            "CONSTR_EXCLUSION": "excl",
        }[typ]
        name = c.get("conname") or "_".join(
            [rel["name"], *([] if typ == "CONSTR_PRIMARY" else local), suffix]
        )
        # PostgreSQL's generated names depend on catalog state. A content-based
        # synthetic CHECK identity remains stable when a sibling is removed.
        if not c.get("conname") and typ in {"CONSTR_CHECK", "CONSTR_EXCLUSION"}:
            name += "__" + ast_hash(c)[7:19]
            base = name
            occurrence = 1
            while any(
                n["kind"] == "constraint"
                and n["schema"] == rel["schema"]
                and n["parent"] == rel["name"]
                and n["name"] == name
                for n in b.nodes.values()
            ):
                occurrence += 1
                name = f"{base}_{occurrence}"
        signature = ast_hash(c)[7:31] if not c.get("conname") else ""
        if not c.get("conname"):
            base_signature = signature
            occurrence = 1
            while any(
                n["kind"] == "constraint"
                and n["schema"] == rel["schema"]
                and n["parent"] == rel["name"]
                and n["name"] == name
                and n["signature"] == signature
                for n in b.nodes.values()
            ):
                occurrence += 1
                signature = f"{base_signature}_{occurrence}"
        constraint = b.node(
            "constraint",
            rel["schema"],
            name,
            ev,
            rel["name"],
            signature=signature,
            properties={
                "constraint_type": mapped[typ],
                "columns": local,
                "definition_hash": ast_hash(c),
                "name_inferred": not bool(c.get("conname")),
            },
        )
        b.edge(constraint, rel, "contains", ev)
        for col in local:
            n = self.column(rel, col)
            if n:
                if typ == "CONSTR_PRIMARY":
                    n["properties"]["nullable"] = False
                b.edge(constraint, n, "expression_reference", ev)
            else:
                b.unknown(f"Unresolved constraint column {col}", ev, constraint["id"])
        self.local_refs(constraint, rel, c.get("raw_expr", {}), ev)
        if typ == "CONSTR_FOREIGN":
            target = self.relation(c["pktable"], ev)
            if not target:
                return
            b.edge(
                rel,
                target,
                "foreign_key",
                ev,
                properties={"constraint": constraint["id"], "columns": local},
            )
            b.edge(constraint, target, "foreign_key", ev)
            remote = strings(c.get("pk_attrs", []))
            if not remote:
                pks = [
                    n
                    for n in b.nodes.values()
                    if n["kind"] == "constraint"
                    and n["schema"] == target["schema"]
                    and n["parent"] == target["name"]
                    and n["properties"].get("constraint_type") == "primary_key"
                ]
                if len(pks) == 1:
                    remote = pks[0]["properties"]["columns"]
            if len(remote) != len(local):
                b.unknown("FK key column resolution incomplete", ev, constraint["id"])
            for local_name, r in zip(local, remote):
                cn, tn = self.column(rel, local_name), self.column(target, r)
                if tn:
                    b.edge(constraint, tn, "foreign_key", ev)
                    if cn:
                        b.edge(
                            cn, tn, "foreign_key", ev, properties={"constraint": constraint["id"]}
                        )
                else:
                    b.unknown(f"Unresolved referenced key column {r}", ev, constraint["id"])

    def local_refs(self, source, relation, expr, ev):
        for c in walk(expr, "ColumnRef"):
            fields = strings(c.get("fields", []))
            n = self.column(relation, fields[-1]) if fields else None
            if n:
                self.b.edge(source, n, "expression_reference", ev)
            else:
                self.b.unknown("Unresolved expression column", ev, source["id"])

    def query(self, source, query, ev):
        b = self.b
        cte_names = {c["ctename"] for c in walk(query, "CommonTableExpr")}
        relations = []
        aliases = {}
        targets = []
        for kind in ("InsertStmt", "UpdateStmt", "DeleteStmt"):
            targets.extend((kind, stmt) for stmt in walk(query, kind))
        # DML target RangeVars are unwrapped by libpg_query, unlike FROM nodes.
        rangevars = list(walk(query, "RangeVar")) + [stmt["relation"] for _, stmt in targets]
        resolved_targets = {}
        for rv in rangevars:
            if rv["relname"] in cte_names and not rv.get("schemaname"):
                continue
            rel = self.relation(rv, ev)
            if rel:
                relations.append(rel)
                aliases.setdefault(rv.get("alias", {}).get("aliasname", rel["name"]), []).append(
                    rel
                )
                b.edge(source, rel, "query_reference", ev)
                resolved_targets[id(rv)] = rel
        for kind, stmt in targets:
            target = resolved_targets.get(id(stmt["relation"]))
            if not target:
                continue
            attrs = (
                stmt.get("cols", [])
                if kind == "InsertStmt"
                else stmt.get("targetList", [])
                if kind == "UpdateStmt"
                else []
            )
            for attr in attrs:
                name = attr["ResTarget"].get("name")
                col = self.column(target, name)
                if col:
                    b.edge(source, col, "query_reference", ev)
                else:
                    b.unknown(f"Unresolved DML target column {name}", ev, source["id"])
            if kind == "InsertStmt" and not attrs:
                b.unknown(
                    "Implicit INSERT column order/default mapping needs catalog verification.",
                    ev,
                    source["id"],
                )
                for col in list(b.nodes.values()):
                    if (
                        col["kind"] == "column"
                        and col["schema"] == target["schema"]
                        and col["parent"] == target["name"]
                    ):
                        b.edge(source, col, "query_reference", ev)
        # Avoid flattening nested scopes into false column-level facts.
        select_count = sum(1 for _ in walk(query, "SelectStmt"))
        complex_scope = (
            select_count > 1
            or bool(cte_names)
            or any(True for _ in walk(query, "RangeSubselect"))
            or any(
                kind == "InsertStmt"
                and stmt.get("selectStmt", {}).get("SelectStmt", {}).get("fromClause")
                for kind, stmt in targets
            )
        )
        if complex_scope:
            b.unknown(
                "Nested/CTE/set-operation column scope is unsupported; only grounded table references retained.",
                ev,
                source["id"],
            )
            return
        for c in walk(query, "ColumnRef"):
            fields = strings(c.get("fields", []))
            star = any("A_Star" in f for f in c.get("fields", []))
            candidates = list({r["id"]: r for r in relations}.values())
            if len(fields) >= 2:
                candidates = aliases.get(fields[-2], [])
            if len(fields) == 3:
                candidates = [r for r in candidates if r["schema"] == fields[0]]
            if star:
                for rel in candidates:
                    for n in list(b.nodes.values()):
                        if (
                            n["kind"] == "column"
                            and n["schema"] == rel["schema"]
                            and n["parent"] == rel["name"]
                        ):
                            b.edge(source, n, "query_reference", ev)
                b.unknown(
                    "SELECT star consumers also depend on output shape and future columns.",
                    ev,
                    source["id"],
                )
                continue
            nodes = [self.column(r, fields[-1]) for r in candidates] if fields else []
            nodes = {n["id"]: n for n in nodes if n}
            if len(nodes) == 1:
                b.edge(source, next(iter(nodes.values())), "query_reference", ev)
            elif fields:
                b.unknown(
                    f"{'Ambiguous' if nodes else 'Unresolved'} query column {'.'.join(fields)}",
                    ev,
                    source["id"],
                )
        for fc in walk(query, "FuncCall"):
            names = strings(fc.get("funcname", []))
            user_fns = (
                [
                    n
                    for n in b.nodes.values()
                    if n["kind"] in {"function", "procedure"} and n["name"] == names[-1]
                ]
                if names
                else []
            )
            if user_fns:
                b.unknown(
                    "Routine call overload resolution requires argument type analysis/catalogs.",
                    ev,
                    source["id"],
                )

    def resolve(self):
        # Constraints before query references ensure omitted FK keys can resolve.
        pending = sorted(self.pending, key=lambda x: 0 if x[0] == "constraint" else 1)
        for kind, data, ev in pending:
            b = self.b
            if kind == "constraint":
                self.constraints(*data, ev)
            elif kind == "query":
                self.query(*data, ev)
            elif kind == "inherit":
                rel, rv, partition = data
                parent = self.relation(rv, ev)
                if parent:
                    b.edge(rel, parent, "partition" if partition else "inheritance", ev)
                    b.unknown(
                        "Inherited column definitions/partition bounds are not expanded offline; capture catalogs.",
                        ev,
                        rel["id"],
                    )
            elif kind == "type":
                col, t = data
                names = strings(t.get("names", []))
                candidates = [
                    n
                    for n in b.nodes.values()
                    if (
                        n["kind"] == "type"
                        and n["name"] == (names[-1] if names else None)
                        and (len(names) < 2 or n["schema"] == names[-2])
                    )
                ]
                if len(candidates) == 1:
                    b.edge(col, candidates[0], "type_reference", ev)
                elif len(candidates) > 1:
                    b.unknown("Ambiguous custom type; search_path is not assumed.", ev, col["id"])
            elif kind in {"index", "trigger"}:
                rel = self.relation(data["relation"], ev)
                if not rel:
                    continue
                name = data.get("idxname", data.get("trigname"))
                if not name:
                    b.unknown("Unnamed index needs catalog-generated name", ev, rel["id"])
                    continue
                obj = b.node(
                    kind,
                    rel["schema"],
                    name,
                    ev,
                    rel["name"] if kind == "trigger" else "",
                    properties={"definition_hash": ast_hash(data)},
                )
                b.edge(obj, rel, "trigger_association" if kind == "trigger" else "contains", ev)
                self.local_refs(obj, rel, data, ev)
                for ie in walk(data, "IndexElem"):
                    n = self.column(rel, ie.get("name"))
                    if n:
                        b.edge(obj, n, "expression_reference", ev)
                if kind == "trigger":
                    names = strings(data["funcname"])
                    fns = [
                        n
                        for n in b.nodes.values()
                        if n["kind"] == "function"
                        and n["name"] == names[-1]
                        and n["signature"] == ""
                        and (len(names) == 1 or n["schema"] == names[-2])
                    ]
                    if len(fns) == 1:
                        b.edge(obj, fns[0], "trigger_association", ev)
                    else:
                        b.unknown("Unresolved trigger function", ev, obj["id"])
                    for name in strings(data.get("columns", [])):
                        col = self.column(rel, name)
                        if col:
                            b.edge(obj, col, "expression_reference", ev)
            elif kind == "alter":
                rel = self.relation(data["relation"], ev)
                for c in data.get("cmds", []):
                    c = c["AlterTableCmd"]
                    if rel and c["subtype"] == "AT_AddConstraint":
                        self.constraints(rel, c["def"]["Constraint"], [], ev)
                    else:
                        b.unknown(
                            f"Offline snapshot does not replay {c['subtype']}; supply final DDL/catalogs.",
                            ev,
                            rel["id"] if rel else None,
                        )
            elif kind == "sequence":
                b.unknown(
                    "Sequence ownership/options require catalog resolution in offline mode.",
                    ev,
                    data[0]["id"],
                )


def inspect_ddl(path, repo=None, version="18"):
    inspector = Inspector(version)
    p = Path(path)
    files = sorted(p.rglob("*.sql")) if p.is_dir() else [p]
    if not files:
        raise ValueError("No SQL schema files found")
    for f in files:
        for kind, body, ev in read_statements(f, inspector.b):
            inspector.declare(kind, body, ev, f)
    if repo:
        inspector.b.model["coverage"]["repository_scan"] = True
        for f in sorted(Path(repo).rglob("*")):
            if (
                not f.is_file()
                or f.is_symlink()
                or f.suffix not in {".sql", ".ts", ".js", ".py", ".cs", ".prisma", ".java"}
            ):
                continue
            if f.suffix == ".sql":
                for kind, body, ev in read_statements(f, inspector.b, "application_source"):
                    inspector.declare(kind, body, ev, f)
            else:
                raw = f.read_bytes()
                ev = inspector.b.evidence(
                    f, raw, 0, len(raw), origin="application_source", status="UNKNOWN"
                )
                inspector.b.unknown(
                    "Host-language SQL/ORM extraction is unsupported; dynamic paths remain UNKNOWN.",
                    ev,
                )
    inspector.resolve()
    inspector.b.model["coverage"]["capabilities"] = [
        "ddl_ast",
        "simple_sql_references",
        "reverse_dependencies",
    ]
    return inspector.b.finish()
