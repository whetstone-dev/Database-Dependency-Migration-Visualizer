"""Fixed PostgreSQL catalog SELECTs and snapshot-local address resolution.

No caller-supplied queries, business rows, stored routine calls or migration API.
"""

from datetime import datetime, timezone

from .model import Builder, canonical, digest

# All relation references are explicitly qualified. System schemas are omitted.
USER_NS = "n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'"
QUERIES = {
    "server_version": "SELECT pg_catalog.current_setting('server_version_num') AS version",
    "pg_namespace": f"SELECT n.oid, n.nspname FROM pg_catalog.pg_namespace n WHERE {USER_NS} ORDER BY n.oid",
    "pg_class": f"SELECT c.oid, n.nspname, c.relname, c.relkind, c.relispartition, c.reltuples, c.relpages FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} ORDER BY c.oid",
    "pg_attribute": f"SELECT a.attrelid, a.attnum, a.attname, a.atttypid, a.atttypmod, a.attnotnull, a.attidentity, a.attgenerated FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attrelid,a.attnum",
    "pg_type": "SELECT t.oid, n.nspname, t.typname, t.typtype, t.typrelid, t.typelem FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace ORDER BY t.oid",
    "pg_constraint": f"SELECT k.oid, n.nspname, k.conname, k.contype, k.conrelid, k.confrelid, k.conkey, k.confkey, k.convalidated, k.conindid FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_namespace n ON n.oid=k.connamespace WHERE {USER_NS} ORDER BY k.oid",
    "pg_index": f"SELECT i.indexrelid, i.indrelid, i.indkey::smallint[] AS indkey, i.indisvalid, i.indisready, i.indisunique FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} ORDER BY i.indexrelid",
    "pg_depend": "SELECT d.classid::regclass::text AS class_name, d.objid, d.objsubid, d.refclassid::regclass::text AS refclass_name, d.refobjid, d.refobjsubid, d.deptype FROM pg_catalog.pg_depend d ORDER BY d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype",
    "pg_rewrite": f"SELECT r.oid, r.ev_class, r.rulename FROM pg_catalog.pg_rewrite r JOIN pg_catalog.pg_class c ON c.oid=r.ev_class JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} ORDER BY r.oid",
    "pg_proc": f"SELECT p.oid, n.nspname, p.proname, p.prokind, p.proargtypes::oid[] AS argument_types, p.prorettype FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE {USER_NS} ORDER BY p.oid",
    "pg_trigger": f"SELECT t.oid, t.tgname, t.tgrelid, t.tgfoid, t.tgisinternal, t.tgattr::smallint[] AS tgattr FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} ORDER BY t.oid",
    "pg_inherits": f"SELECT i.inhrelid, i.inhparent FROM pg_catalog.pg_inherits i JOIN pg_catalog.pg_class c ON c.oid=i.inhrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} ORDER BY i.inhrelid,i.inhparent",
    "pg_extension": "SELECT e.oid, n.nspname, e.extname, e.extversion FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace ORDER BY e.oid",
    "pg_attrdef": f"SELECT a.oid, a.adrelid, a.adnum, pg_catalog.pg_get_expr(a.adbin,a.adrelid) AS expression FROM pg_catalog.pg_attrdef a JOIN pg_catalog.pg_class c ON c.oid=a.adrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE {USER_NS} ORDER BY a.oid",
}


def capture(dsn):
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise ValueError("Live discovery requires pip install '.[live]'") from exc
    result = {
        "capture_version": "1.0.0",
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "queries": {},
    }
    try:
        # Connection startup options enforce read-only and restrict resolution
        # before any SELECT. No SQL SET/BEGIN statements are exposed to callers.
        with psycopg.connect(
            dsn,
            autocommit=True,
            connect_timeout=5,
            options="-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=2000 -c search_path=pg_catalog",
            row_factory=dict_row,
        ) as conn:
            # libpq starts a repeatable-read read-only snapshot for consistency.
            from psycopg import IsolationLevel

            conn.isolation_level = IsolationLevel.REPEATABLE_READ
            conn.read_only = True
            with conn.transaction():
                for qid, sql in QUERIES.items():
                    rows = conn.execute(sql).fetchall()
                    if qid == "pg_attrdef":
                        for r in rows:
                            r["expression_hash"] = digest(r.pop("expression"))
                    result["queries"][qid] = {"sql_hash": digest(sql), "rows": rows}
    except Exception as exc:
        raise ValueError(
            "Read-only catalog capture failed; no connection details are included. Check connectivity, role permissions and PostgreSQL version locally."
        ) from exc
    version = int(result["queries"]["server_version"]["rows"][0]["version"]) // 10000
    if not 14 <= version <= 18:
        raise ValueError("Live adapter supports PostgreSQL 14-18 only")
    return result


def inspect_catalog(capture_data):
    if capture_data.get("capture_version") != "1.0.0":
        raise ValueError("Unsupported catalog capture version")
    queries = capture_data.get("queries", {})
    if set(queries) != set(QUERIES):
        raise ValueError("Catalog capture query set is incomplete or unknown")
    for qid, q in queries.items():
        if q.get("sql_hash") != digest(QUERIES[qid]):
            raise ValueError(f"Catalog query hash mismatch: {qid}")
    version = str(int(queries["server_version"]["rows"][0]["version"]) // 10000)
    if not 14 <= int(version) <= 18:
        raise ValueError("Catalog adapter supports PostgreSQL 14-18")
    b = Builder(version, "catalog_snapshot")
    b.model["snapshot"]["created_at"] = capture_data["captured_at"]
    b.model["coverage"]["catalog_available"] = True
    addresses = {}
    relations = {}
    columns = {}
    types = {r["oid"]: r for r in queries["pg_type"]["rows"]}
    namespaces = {r["nspname"] for r in queries["pg_namespace"]["rows"]}

    def ev(qid, address=""):
        return b.evidence(
            qid,
            canonical(queries[qid]).encode(),
            status="OBSERVED",
            origin="postgres_catalog",
            query_id=qid,
            captured_at=capture_data["captured_at"],
            catalog_address=address,
            explanation="Direct catalog metadata from the supplied snapshot; not runtime or production-load proof.",
        )

    def node(qid, oid, kind, schema, name, parent="", signature="", properties=None):
        addr = f"{qid}:{oid}:0"
        n = b.node(
            kind,
            schema,
            name,
            ev(qid, addr),
            parent,
            signature,
            {"oid": oid, "catalog_address": addr, **(properties or {})},
            "OBSERVED",
            "postgres_catalog",
        )
        addresses[(qid, oid, 0)] = n
        return n

    def edge(source, target, kind, qid, properties=None, address=""):
        if source and target:
            b.edge(
                source, target, kind, ev(qid, address), "OBSERVED", "postgres_catalog", properties
            )

    for r in queries["pg_namespace"]["rows"]:
        node("pg_namespace", r["oid"], "schema", r["nspname"], r["nspname"])
    for r in queries["pg_class"]["rows"]:
        kind = {
            "r": "table",
            "p": "partitioned_table",
            "v": "view",
            "m": "materialized_view",
            "S": "sequence",
            "i": "index",
            "I": "index",
        }.get(r["relkind"])
        if kind:
            relations[r["oid"]] = node(
                "pg_class",
                r["oid"],
                kind,
                r["nspname"],
                r["relname"],
                properties={
                    "relkind": r["relkind"],
                    "is_partition": r["relispartition"],
                    "reltuples": r["reltuples"],
                    "relpages": r["relpages"],
                    "statistics_source": "pg_class estimates, not row counts",
                },
            )
    for r in queries["pg_type"]["rows"]:
        if r["nspname"] in namespaces:
            node(
                "pg_type",
                r["oid"],
                "type",
                r["nspname"],
                r["typname"],
                properties={
                    "typtype": r["typtype"],
                    "internal": bool(r["typrelid"] or r["typelem"]),
                },
            )

    def type_name(oid):
        t = types.get(oid, {})
        return (t.get("nspname", "") + "." if t.get("nspname") != "pg_catalog" else "") + t.get(
            "typname", "unknown"
        )

    for r in queries["pg_attribute"]["rows"]:
        rel = relations.get(r["attrelid"])
        if not rel or rel["kind"] in {"index", "sequence"}:
            continue
        addr = f"pg_class:{r['attrelid']}:{r['attnum']}"
        props = {
            "type": type_name(r["atttypid"]),
            "typmod": r["atttypmod"],
            "nullable": not r["attnotnull"],
            "catalog_address": addr,
        }
        if r["attidentity"]:
            props["identity"] = r["attidentity"]
        if r["attgenerated"]:
            props["generated"] = r["attgenerated"]
        n = b.node(
            "column",
            rel["schema"],
            r["attname"],
            ev("pg_attribute", addr),
            rel["name"],
            properties=props,
            status="OBSERVED",
            origin="postgres_catalog",
        )
        columns[(r["attrelid"], r["attnum"])] = n
        addresses[("pg_class", r["attrelid"], r["attnum"])] = n
        edge(n, rel, "contains", "pg_attribute", address=addr)
        edge(
            n,
            addresses.get(("pg_type", r["atttypid"], 0)),
            "type_reference",
            "pg_attribute",
            address=addr,
        )
    for r in queries["pg_attrdef"]["rows"]:
        col = columns.get((r["adrelid"], r["adnum"]))
        if col:
            col["properties"]["default"] = r["expression_hash"]
            addresses[("pg_attrdef", r["oid"], 0)] = col
    for r in queries["pg_proc"]["rows"]:
        if r["prokind"] not in {"f", "p"}:
            continue
        n = node(
            "pg_proc",
            r["oid"],
            "procedure" if r["prokind"] == "p" else "function",
            r["nspname"],
            r["proname"],
            signature=",".join(type_name(t) for t in r["argument_types"]),
            properties={"return_type": type_name(r["prorettype"])},
        )
        b.unknown(
            "Routine body/runtime references can be untracked by pg_depend; bodies are not extracted or analyzed.",
            n["evidence_ids"][0],
            n["id"],
        )
    for r in queries["pg_constraint"]["rows"]:
        rel = relations.get(r["conrelid"])
        n = node(
            "pg_constraint",
            r["oid"],
            "constraint",
            r["nspname"],
            r["conname"],
            rel["name"] if rel else "",
            properties={
                "constraint_type": {
                    "f": "foreign_key",
                    "p": "primary_key",
                    "u": "unique",
                    "c": "check",
                    "x": "exclusion",
                    "n": "not_null",
                }.get(r["contype"], r["contype"]),
                "validated": r["convalidated"],
                "columns": [
                    columns[(r["conrelid"], a)]["name"]
                    for a in r["conkey"] or []
                    if (r["conrelid"], a) in columns
                ],
            },
        )
        edge(n, rel, "contains", "pg_constraint")
        for a in r["conkey"] or []:
            edge(n, columns.get((r["conrelid"], a)), "expression_reference", "pg_constraint")
        if r["contype"] == "f":
            target = relations.get(r["confrelid"])
            edge(rel, target, "foreign_key", "pg_constraint", {"constraint": n["id"]})
            edge(n, target, "foreign_key", "pg_constraint")
            for local_attnum, a in zip(r["conkey"] or [], r["confkey"] or []):
                cn, tn = (
                    columns.get((r["conrelid"], local_attnum)),
                    columns.get((r["confrelid"], a)),
                )
                edge(n, tn, "foreign_key", "pg_constraint")
                edge(cn, tn, "foreign_key", "pg_constraint", {"constraint": n["id"]})
    for r in queries["pg_index"]["rows"]:
        n = relations.get(r["indexrelid"])
        if n:
            n["properties"].update(
                valid=r["indisvalid"], ready=r["indisready"], unique=r["indisunique"]
            )
            edge(n, relations.get(r["indrelid"]), "contains", "pg_index")
            for a in r["indkey"]:
                edge(n, columns.get((r["indrelid"], a)), "expression_reference", "pg_index")
    for r in queries["pg_rewrite"]["rows"]:
        if r["ev_class"] in relations:
            addresses[("pg_rewrite", r["oid"], 0)] = relations[r["ev_class"]]
    for r in queries["pg_trigger"]["rows"]:
        rel = relations.get(r["tgrelid"])
        if not rel:
            continue
        n = node(
            "pg_trigger",
            r["oid"],
            "trigger",
            rel["schema"],
            r["tgname"],
            rel["name"],
            properties={"internal": r["tgisinternal"]},
        )
        edge(n, rel, "trigger_association", "pg_trigger")
        edge(n, addresses.get(("pg_proc", r["tgfoid"], 0)), "trigger_association", "pg_trigger")
        for a in r["tgattr"]:
            edge(n, columns.get((r["tgrelid"], a)), "expression_reference", "pg_trigger")
    for r in queries["pg_inherits"]["rows"]:
        rel, parent = relations.get(r["inhrelid"]), relations.get(r["inhparent"])
        edge(
            rel,
            parent,
            "partition" if rel and rel["properties"]["is_partition"] else "inheritance",
            "pg_inherits",
        )
    for r in queries["pg_extension"]["rows"]:
        node(
            "pg_extension",
            r["oid"],
            "extension",
            r["nspname"],
            r["extname"],
            properties={"version": r["extversion"]},
        )
    unresolved = 0
    for r in queries["pg_depend"]["rows"]:
        cls = r["class_name"].removeprefix("pg_catalog.")
        refcls = r["refclass_name"].removeprefix("pg_catalog.")
        src = addresses.get((cls, r["objid"], r["objsubid"]))
        target = addresses.get((refcls, r["refobjid"], r["refobjsubid"]))
        if not src:
            continue
        if not target:
            # Built-in/system catalog dependencies are intentionally omitted.
            if refcls not in {
                "pg_type",
                "pg_namespace",
                "pg_collation",
                "pg_proc",
                "pg_language",
                "pg_am",
                "pg_operator",
                "pg_opclass",
            }:
                unresolved += 1
            continue
        address = f"{cls}:{r['objid']}:{r['objsubid']}->{refcls}:{r['refobjid']}:{r['refobjsubid']}"
        edge(
            src,
            target,
            "sequence_ownership"
            if src["kind"] == "sequence"
            and target["kind"] == "column"
            and r["deptype"] in {"a", "i"}
            else "catalog_dependency",
            "pg_depend",
            {"dependency_type": r["deptype"], "catalog_address": address, "via": cls},
            address,
        )
    if unresolved:
        b.unknown(
            f"{unresolved} catalog endpoints outside modeled object classes remain unresolved.",
            ev("pg_depend"),
        )
    # Captures deliberately omit SQL definitions and noncatalog runtime consumers.
    b.unknown(
        "Catalog dependencies cover recorded edges only; repository/runtime consumers and some object definitions are unavailable.",
        ev("server_version"),
    )
    b.model["coverage"]["capabilities"] = [
        "catalog_objects",
        "pg_depend",
        "pg_rewrite_ownership",
        "reverse_dependencies",
    ]
    return b.finish()
