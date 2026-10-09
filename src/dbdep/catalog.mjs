/** Fixed catalog discovery; supplied SQL and business rows never enter this API. */
import pg from "pg";
import { parse as parseConnectionString } from "pg-connection-string";
import { Builder, canonical, digest, quoted } from "./model.mjs";

const USER_NS =
  "n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'";
export const QUERIES = Object.freeze({
  server_version:
    "SELECT pg_catalog.current_setting('server_version_num') AS version",
  pg_namespace: `SELECT n.oid, n.nspname FROM pg_catalog.pg_namespace n WHERE ${USER_NS} ORDER BY n.oid`,
  pg_class: `SELECT c.oid, n.nspname, c.relname, c.relkind, c.relispartition, c.reltuples, c.relpages FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} ORDER BY c.oid`,
  pg_attribute: `SELECT a.attrelid, a.attnum, a.attname, a.atttypid, a.atttypmod, a.attnotnull, a.attidentity, a.attgenerated FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attrelid,a.attnum`,
  pg_type:
    "SELECT t.oid, n.nspname, t.typname, t.typtype, t.typrelid, t.typelem FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace ORDER BY t.oid",
  pg_constraint: `SELECT k.oid, n.nspname, k.conname, k.contype, k.conrelid, k.confrelid, k.conkey, k.confkey, k.convalidated, k.conindid FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_namespace n ON n.oid=k.connamespace WHERE ${USER_NS} ORDER BY k.oid`,
  pg_index: `SELECT i.indexrelid, i.indrelid, i.indkey::smallint[] AS indkey, i.indisvalid, i.indisready, i.indisunique FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} ORDER BY i.indexrelid`,
  pg_depend:
    "SELECT d.classid::regclass::text AS class_name, d.objid, d.objsubid, d.refclassid::regclass::text AS refclass_name, d.refobjid, d.refobjsubid, d.deptype FROM pg_catalog.pg_depend d ORDER BY d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype",
  pg_rewrite: `SELECT r.oid, r.ev_class, r.rulename FROM pg_catalog.pg_rewrite r JOIN pg_catalog.pg_class c ON c.oid=r.ev_class JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} ORDER BY r.oid`,
  pg_proc: `SELECT p.oid, n.nspname, p.proname, p.prokind, p.proargtypes::oid[] AS argument_types, p.prorettype FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE ${USER_NS} ORDER BY p.oid`,
  pg_trigger: `SELECT t.oid, t.tgname, t.tgrelid, t.tgfoid, t.tgisinternal, t.tgattr::smallint[] AS tgattr FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} ORDER BY t.oid`,
  pg_inherits: `SELECT i.inhrelid, i.inhparent FROM pg_catalog.pg_inherits i JOIN pg_catalog.pg_class c ON c.oid=i.inhrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} ORDER BY i.inhrelid,i.inhparent`,
  pg_extension:
    "SELECT e.oid, n.nspname, e.extname, e.extversion FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace ORDER BY e.oid",
  pg_attrdef: `SELECT a.oid, a.adrelid, a.adnum, pg_catalog.pg_get_expr(a.adbin,a.adrelid) AS expression FROM pg_catalog.pg_attrdef a JOIN pg_catalog.pg_class c ON c.oid=a.adrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${USER_NS} ORDER BY a.oid`,
});

/** Accept libpq keyword DSNs and PostgreSQL URLs without ever exposing values. */
export function connection_config(dsn) {
  if (typeof dsn !== "string" || !dsn.trim())
    throw new Error("The requested DSN is unavailable");
  let parsed;
  if (/^postgres(?:ql)?:\/\//i.test(dsn)) parsed = parseConnectionString(dsn);
  else {
    parsed = {};
    const tokens = /\s*([a-z_]+)\s*=\s*('(?:\\.|[^'\\])*'|(?:\\.|[^\s])+)/gy;
    let index = 0;
    while (index < dsn.length) {
      if (!dsn.slice(index).trim()) break;
      tokens.lastIndex = index;
      const match = tokens.exec(dsn);
      if (!match) throw new Error("Unsupported DSN syntax");
      let value = match[2];
      if (value.startsWith("'")) value = value.slice(1, -1);
      value = value.replace(/\\(.)/gs, "$1");
      parsed[match[1] === "dbname" ? "database" : match[1]] = value;
      index = tokens.lastIndex;
    }
    if (parsed.sslmode && parsed.sslmode !== "disable") {
      if (!["require", "verify-ca", "verify-full"].includes(parsed.sslmode))
        throw new Error("Unsupported SSL mode in keyword DSN");
      parsed.ssl = true;
    }
  }
  const config = {};
  for (const key of ["host", "port", "user", "password", "database", "ssl"]) {
    if (parsed[key] !== undefined) config[key] = parsed[key];
  }
  // A DSN's options cannot override these startup safeguards.
  return {
    ...config,
    connectionTimeoutMillis: 5000,
    query_timeout: 11000,
    options:
      "-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=2000 -c search_path=pg_catalog",
  };
}

export async function capture(dsn) {
  const result = {
    capture_version: "1.0.0",
    captured_at: new Date().toISOString(),
    queries: {},
  };
  let client;
  try {
    client = new pg.Client(connection_config(dsn));
    await client.connect();
    // Transaction control is fixed; every discovery query is in the SELECT allowlist.
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    for (const [qid, sql] of Object.entries(QUERIES)) {
      const { rows } = await client.query(sql);
      if (qid === "pg_attrdef") {
        for (const row of rows) {
          row.expression_hash = digest(row.expression);
          delete row.expression;
        }
      }
      result.queries[qid] = { sql_hash: digest(sql), rows };
    }
    await client.query("COMMIT");
  } catch {
    throw new Error(
      "Read-only catalog capture failed; no connection details are included. Check connectivity, role permissions and PostgreSQL version locally.",
    );
  } finally {
    if (client) await client.end().catch(() => {});
  }
  const version = Math.floor(
    Number(result.queries.server_version.rows[0].version) / 10000,
  );
  if (!(version >= 14 && version <= 18))
    throw new Error("Live adapter supports PostgreSQL 14-18 only");
  return result;
}

export function inspect_catalog(data) {
  if (data?.capture_version !== "1.0.0")
    throw new Error("Unsupported catalog capture version");
  const queries = data.queries ?? {};
  if (
    Object.keys(queries).sort().join(",") !==
    Object.keys(QUERIES).sort().join(",")
  )
    throw new Error("Catalog capture query set is incomplete or unknown");
  for (const [qid, q] of Object.entries(queries)) {
    if (q.sql_hash !== digest(QUERIES[qid]))
      throw new Error(`Catalog query hash mismatch: ${qid}`);
    if (
      !Array.isArray(q.rows) ||
      q.rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))
    )
      throw new Error("Malformed catalog row structure");
  }
  const version = String(
    Math.floor(Number(queries.server_version.rows[0]?.version) / 10000),
  );
  if (!(Number(version) >= 14 && Number(version) <= 18))
    throw new Error("Catalog adapter supports PostgreSQL 14-18");
  const b = new Builder(version, "catalog_snapshot");
  b.model.snapshot.created_at = data.captured_at;
  b.model.coverage.catalog_available = true;
  const addresses = new Map(),
    relations = new Map(),
    columns = new Map();
  const key = (...parts) => parts.join(":");
  const types = new Map(queries.pg_type.rows.map((r) => [r.oid, r]));
  const namespaces = new Set(queries.pg_namespace.rows.map((r) => r.nspname));
  const ev = (qid, address = "") =>
    b.evidence(
      qid,
      Buffer.from(canonical(queries[qid])),
      0,
      0,
      "OBSERVED",
      "postgres_catalog",
      {
        query_id: qid,
        captured_at: data.captured_at,
        catalog_address: address,
        explanation:
          "Direct catalog metadata from the supplied snapshot; not runtime or production-load proof.",
      },
    );
  const node = (
    qid,
    oid,
    kind,
    schema,
    name,
    parent = "",
    signature = "",
    properties = {},
  ) => {
    const addr = `${qid}:${oid}:0`;
    const n = b.node(
      kind,
      schema,
      name,
      ev(qid, addr),
      parent,
      signature,
      { oid, catalog_address: addr, ...properties },
      "OBSERVED",
      "postgres_catalog",
    );
    addresses.set(key(qid, oid, 0), n);
    return n;
  };
  const edge = (source, target, kind, qid, properties = null, address = "") => {
    if (source && target)
      b.edge(
        source,
        target,
        kind,
        ev(qid, address),
        "OBSERVED",
        "postgres_catalog",
        properties,
      );
  };
  for (const r of queries.pg_namespace.rows)
    node("pg_namespace", r.oid, "schema", r.nspname, r.nspname);
  for (const r of queries.pg_class.rows) {
    const kind = {
      r: "table",
      p: "partitioned_table",
      v: "view",
      m: "materialized_view",
      S: "sequence",
      i: "index",
      I: "index",
    }[r.relkind];
    if (kind)
      relations.set(
        r.oid,
        node("pg_class", r.oid, kind, r.nspname, r.relname, "", "", {
          relkind: r.relkind,
          is_partition: r.relispartition,
          reltuples: r.reltuples,
          relpages: r.relpages,
          statistics_source: "pg_class estimates, not row counts",
        }),
      );
  }
  for (const r of queries.pg_type.rows)
    if (namespaces.has(r.nspname))
      node("pg_type", r.oid, "type", r.nspname, r.typname, "", "", {
        typtype: r.typtype,
        internal: Boolean(r.typrelid || r.typelem),
      });
  const type_name = (oid) => {
    const t = types.get(oid) ?? {};
    return (
      (t.nspname && t.nspname !== "pg_catalog" ? `${quoted(t.nspname)}.` : "") +
      quoted(t.typname ?? "unknown")
    );
  };
  for (const r of queries.pg_attribute.rows) {
    const rel = relations.get(r.attrelid);
    if (!rel || ["index", "sequence"].includes(rel.kind)) continue;
    const addr = `pg_class:${r.attrelid}:${r.attnum}`;
    const props = {
      type: type_name(r.atttypid),
      typmod: r.atttypmod,
      nullable: !r.attnotnull,
      catalog_address: addr,
    };
    if (r.attidentity) props.identity = r.attidentity;
    if (r.attgenerated) props.generated = r.attgenerated;
    const n = b.node(
      "column",
      rel.schema,
      r.attname,
      ev("pg_attribute", addr),
      rel.name,
      "",
      props,
      "OBSERVED",
      "postgres_catalog",
    );
    columns.set(key(r.attrelid, r.attnum), n);
    addresses.set(key("pg_class", r.attrelid, r.attnum), n);
    edge(n, rel, "contains", "pg_attribute", null, addr);
    edge(
      n,
      addresses.get(key("pg_type", r.atttypid, 0)),
      "type_reference",
      "pg_attribute",
      null,
      addr,
    );
  }
  for (const r of queries.pg_attrdef.rows) {
    const col = columns.get(key(r.adrelid, r.adnum));
    if (col) {
      col.properties.default = r.expression_hash;
      addresses.set(key("pg_attrdef", r.oid, 0), col);
    }
  }
  for (const r of queries.pg_proc.rows) {
    if (!["f", "p"].includes(r.prokind)) continue;
    const n = node(
      "pg_proc",
      r.oid,
      r.prokind === "p" ? "procedure" : "function",
      r.nspname,
      r.proname,
      "",
      r.argument_types.map(type_name).join(","),
      { return_type: type_name(r.prorettype) },
    );
    b.unknown(
      "Routine body/runtime references can be untracked by pg_depend; bodies are not extracted or analyzed.",
      n.evidence_ids[0],
      n.id,
    );
  }
  for (const r of queries.pg_constraint.rows) {
    const rel = relations.get(r.conrelid);
    const n = node(
      "pg_constraint",
      r.oid,
      "constraint",
      r.nspname,
      r.conname,
      rel?.name ?? "",
      "",
      {
        constraint_type:
          {
            f: "foreign_key",
            p: "primary_key",
            u: "unique",
            c: "check",
            x: "exclusion",
            n: "not_null",
          }[r.contype] ?? r.contype,
        validated: r.convalidated,
        columns: (r.conkey ?? [])
          .map((a) => columns.get(key(r.conrelid, a))?.name)
          .filter((v) => v !== undefined),
      },
    );
    edge(n, rel, "contains", "pg_constraint");
    for (const a of r.conkey ?? [])
      edge(
        n,
        columns.get(key(r.conrelid, a)),
        "expression_reference",
        "pg_constraint",
      );
    if (r.contype === "f") {
      const target = relations.get(r.confrelid);
      edge(rel, target, "foreign_key", "pg_constraint", { constraint: n.id });
      edge(n, target, "foreign_key", "pg_constraint");
      for (
        let i = 0;
        i < Math.min(r.conkey?.length ?? 0, r.confkey?.length ?? 0);
        i++
      ) {
        const cn = columns.get(key(r.conrelid, r.conkey[i])),
          tn = columns.get(key(r.confrelid, r.confkey[i]));
        edge(n, tn, "foreign_key", "pg_constraint");
        edge(cn, tn, "foreign_key", "pg_constraint", { constraint: n.id });
      }
    }
  }
  for (const r of queries.pg_index.rows) {
    const n = relations.get(r.indexrelid);
    if (n) {
      Object.assign(n.properties, {
        valid: r.indisvalid,
        ready: r.indisready,
        unique: r.indisunique,
      });
      edge(n, relations.get(r.indrelid), "contains", "pg_index");
      for (const a of r.indkey)
        edge(
          n,
          columns.get(key(r.indrelid, a)),
          "expression_reference",
          "pg_index",
        );
    }
  }
  for (const r of queries.pg_rewrite.rows)
    if (relations.has(r.ev_class))
      addresses.set(key("pg_rewrite", r.oid, 0), relations.get(r.ev_class));
  for (const r of queries.pg_trigger.rows) {
    const rel = relations.get(r.tgrelid);
    if (!rel) continue;
    const n = node(
      "pg_trigger",
      r.oid,
      "trigger",
      rel.schema,
      r.tgname,
      rel.name,
      "",
      { internal: r.tgisinternal },
    );
    edge(n, rel, "trigger_association", "pg_trigger");
    edge(
      n,
      addresses.get(key("pg_proc", r.tgfoid, 0)),
      "trigger_association",
      "pg_trigger",
    );
    for (const a of r.tgattr)
      edge(
        n,
        columns.get(key(r.tgrelid, a)),
        "expression_reference",
        "pg_trigger",
      );
  }
  for (const r of queries.pg_inherits.rows) {
    const rel = relations.get(r.inhrelid);
    edge(
      rel,
      relations.get(r.inhparent),
      rel?.properties.is_partition ? "partition" : "inheritance",
      "pg_inherits",
    );
  }
  for (const r of queries.pg_extension.rows)
    node("pg_extension", r.oid, "extension", r.nspname, r.extname, "", "", {
      version: r.extversion,
    });
  let unresolved = 0;
  for (const r of queries.pg_depend.rows) {
    const cls = r.class_name.replace(/^pg_catalog\./, ""),
      refcls = r.refclass_name.replace(/^pg_catalog\./, "");
    const source = addresses.get(key(cls, r.objid, r.objsubid)),
      target = addresses.get(key(refcls, r.refobjid, r.refobjsubid));
    if (!source) continue;
    if (!target) {
      if (
        ![
          "pg_type",
          "pg_namespace",
          "pg_collation",
          "pg_proc",
          "pg_language",
          "pg_am",
          "pg_operator",
          "pg_opclass",
        ].includes(refcls)
      )
        unresolved++;
      continue;
    }
    const address = `${cls}:${r.objid}:${r.objsubid}->${refcls}:${r.refobjid}:${r.refobjsubid}`;
    const kind =
      source.kind === "sequence" &&
      target.kind === "column" &&
      ["a", "i"].includes(r.deptype)
        ? "sequence_ownership"
        : "catalog_dependency";
    edge(
      source,
      target,
      kind,
      "pg_depend",
      { dependency_type: r.deptype, catalog_address: address, via: cls },
      address,
    );
  }
  if (unresolved)
    b.unknown(
      `${unresolved} catalog endpoints outside modeled object classes remain unresolved.`,
      ev("pg_depend"),
    );
  b.unknown(
    "Catalog dependencies cover recorded edges only; repository/runtime consumers and some object definitions are unavailable.",
    ev("server_version"),
  );
  b.model.coverage.capabilities = [
    "catalog_objects",
    "pg_depend",
    "pg_rewrite_ownership",
    "reverse_dependencies",
  ];
  return b.finish();
}
