import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {
  capture,
  inspect_catalog,
  connection_config,
  QUERIES,
} from "../../src/dbdep/catalog.mjs";
import { impact } from "../../src/dbdep/graph.mjs";
import { digest, validate } from "../../src/dbdep/model.mjs";
const dsn = process.env.DBDEP_TEST_DSN;
test(
  "isolated read-only catalog capture records actual PostgreSQL associations",
  { skip: !dsn },
  async () => {
    const captured = await capture(dsn);
    assert.equal(captured.capture_version, "1.1.0");
    for (const [qid, sql] of Object.entries(QUERIES))
      assert.equal(captured.queries[qid].sql_hash, digest(sql));
    assert.ok(captured.queries.pg_attrdef.rows.length);
    for (const row of captured.queries.pg_attrdef.rows) {
      assert.deepEqual(Object.keys(row).sort(), [
        "adnum",
        "adrelid",
        "expression_hash",
        "oid",
      ]);
      assert.match(row.expression_hash, /^sha256:[a-f0-9]{64}$/);
    }
    const m = inspect_catalog(captured);
    assert.deepEqual(validate(m), []);
    assert.ok(impact(m, "sales.orders.total_amount").affected.length);
    for (const kind of [
      "sequence_ownership",
      "trigger_association",
      "foreign_key",
      "partition",
    ])
      assert.ok(
        m.edges.some((e) => e.kind === kind),
        kind,
      );
    assert.ok(m.edges.some((e) => e.properties.via === "pg_rewrite"));
    assert.ok(m.nodes.some((n) => n.properties.internal));
  },
);
test(
  "isolated fixture reader cannot read application data or alter its schema",
  { skip: !dsn },
  async () => {
    const client = new pg.Client(connection_config(dsn));
    try {
      await client.connect();
      await assert.rejects(
        client.query("SELECT id FROM public.customers"),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        client.query("CREATE TABLE public.should_never_exist (id int)"),
        (e) => ["25006", "42501"].includes(e.code),
      );
      const { rows } = await client.query(
        "SELECT pg_catalog.current_setting('default_transaction_read_only') AS ro, pg_catalog.current_setting('statement_timeout') AS timeout, pg_catalog.current_setting('search_path') AS search_path",
      );
      assert.deepEqual(rows[0], {
        ro: "on",
        timeout: "10s",
        search_path: "pg_catalog",
      });
    } finally {
      await client.end();
    }
  },
);
