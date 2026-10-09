import assert from "node:assert/strict";
import fs from "node:fs";
import test, { mock } from "node:test";
import pg from "pg";
import {
  connection_config,
  capture,
  inspect_catalog,
  QUERIES,
} from "../../src/dbdep/catalog.mjs";
import { impact } from "../../src/dbdep/graph.mjs";
import { assess_operation } from "../../src/dbdep/engine.mjs";
import { ast_hash, statements } from "../../src/dbdep/sql.mjs";
import {
  Builder,
  canonical,
  digest,
  validate,
} from "../../src/dbdep/model.mjs";

function baseline() {
  const builder = new Builder();
  const evidence = builder.evidence("schema.sql", Buffer.alloc(0));
  const table = builder.node("table", "public", "t", evidence);
  const column = builder.node("column", "public", "id", evidence, "t", "", {
    type: "int4",
  });
  builder.edge(column, table, "contains", evidence);
  return builder.finish();
}

test("public assess_operation normalizes comments before operation evidence", () => {
  const model = baseline();
  const column = model.nodes.find((node) => node.kind === "column");
  const marker = "SYNTHETIC-CREDENTIAL-MARKER";
  const result = assess_operation(
    model,
    column,
    "alter-type",
    `text /* postgresql://user:${marker}@host.invalid/db */`,
  );
  assert.ok(!canonical(result).includes(marker));
  assert.equal(
    result.operation_evidence.find(
      (evidence) => evidence.path === "user-operation",
    ).source_hash,
    digest(canonical([column.id, "alter-type", "text"])),
  );
});

test("public assess_operation rejects decoded credential type names without reflecting them", () => {
  const model = baseline();
  const column = model.nodes.find((node) => node.kind === "column");
  for (const input of [
    '"postgresql://user:SYNTHETIC-MARKER@synthetic.invalid/db"',
    '"password=SYNTHETIC-MARKER"',
    'U&"postgr\\0065sql://user:SYNTHETIC-MARKER@synthetic.invalid/db"',
    "custom_type('SYNTHETIC-PRIVATE-LITERAL')",
  ]) {
    assert.throws(
      () => assess_operation(model, column, "alter-type", input),
      (error) =>
        /Malformed target type/.test(error.message) &&
        !error.message.includes("SYNTHETIC"),
    );
  }
});

test("public operation findings preserve quoted target type identities", () => {
  const model = baseline();
  const column = model.nodes.find((node) => node.kind === "column");
  for (const input of [
    '"integer"',
    '"numeric"(10,2)[]',
    '"interval"(3)',
    '"pg_catalog"."numeric"(10,2)[]',
    'public."type with spaces"',
  ]) {
    const result = assess_operation(model, column, "alter-type", input);
    assert.ok(
      result.findings
        .find((finding) => finding.rule_id === "DDM002")
        .reason.startsWith(`Type transition int4 to ${input}.`),
      input,
    );
  }
});

test("impact normalizes a target type before printing or persisting SQL comments", () => {
  const marker = "SYNTHETIC-CREDENTIAL-MARKER";
  const target = `text /* postgresql://user:${marker}@host.invalid/db */`;
  const result = impact(baseline(), "public.t.id", "alter-type", target);
  assert.equal(result.to, "text");
  assert.ok(!canonical(result).includes(marker));
  assert.equal(
    result.operation_evidence.find(
      (evidence) => evidence.path === "user-operation",
    ).source_hash,
    digest(canonical([result.root, "alter-type", "text"])),
  );
  const withoutOperation = impact(baseline(), "public.t.id", null, target);
  assert.equal(withoutOperation.to, "text");
  assert.ok(!canonical(withoutOperation).includes(marker));
});

test("quoted target type identities and modifiers survive normalization", () => {
  const type = (value) =>
    statements("SELECT NULL::" + value)[0].stmt.SelectStmt.targetList[0]
      .ResTarget.val.TypeCast.typeName;
  for (const input of [
    '"integer"',
    '"numeric"(10,2)[]',
    '"interval"(3)',
    'public."type with spaces"',
    '"pg_catalog"."numeric"(10,2)[]',
    'U&"d\\0061t\\+000061"',
  ]) {
    const result = impact(baseline(), "public.t.id", "alter-type", input);
    assert.equal(ast_hash(type(result.to)), ast_hash(type(input)));
  }
});

test("decoded target identifiers with recognizable credentials fail without reflecting them", () => {
  for (const input of [
    '"postgresql://user:SYNTHETIC-MARKER@synthetic.invalid/db"',
    '"password=SYNTHETIC-MARKER"',
    'U&"postgr\\0065sql://user:SYNTHETIC-MARKER@synthetic.invalid/db"',
  ]) {
    assert.throws(
      () => impact(baseline(), "public.t.id", "alter-type", input),
      (error) =>
        /Malformed target type/.test(error.message) &&
        !error.message.includes("SYNTHETIC"),
    );
  }
});

test("SQL string literals in custom type modifiers cannot be copied into results", () => {
  assert.throws(
    () =>
      impact(
        baseline(),
        "public.t.id",
        "alter-type",
        "custom_type('SYNTHETIC-PRIVATE-LITERAL')",
      ),
    (error) =>
      /Malformed target type/.test(error.message) &&
      !error.message.includes("SYNTHETIC"),
  );
});

test("target types cannot retain target aliases or SQL statement terminators", () => {
  const model = baseline();
  const column = model.nodes.find((node) => node.kind === "column");
  for (const input of [
    "text AS secret_alias",
    'text "private alias"',
    "text;",
  ]) {
    assert.throws(
      () => impact(model, column.id, "alter-type", input),
      /Malformed target type/,
    );
    assert.throws(
      () => assess_operation(model, column, "alter-type", input),
      /Malformed target type/,
    );
  }
});

test("decoded credential identifiers in type modifiers fail without reflecting them", () => {
  const model = baseline();
  const column = model.nodes.find((node) => node.kind === "column");
  const input = 'custom_type(U&"passw\\006Frd=SYNTHETIC-MARKER")';
  for (const assess of [
    () => impact(model, column.id, "alter-type", input),
    () => assess_operation(model, column, "alter-type", input),
  ])
    assert.throws(
      assess,
      (error) =>
        /Malformed target type/.test(error.message) &&
        !error.message.includes("SYNTHETIC"),
    );
});

test("normalized target types preserve arrays, numeric modifiers and quoted names", () => {
  for (const [input, expected] of [
    ["varchar(20) /* discarded */", "varchar(20)"],
    ["numeric(10,2)[]", "numeric(10,2)[]"],
    ['public."odd,type"[]', 'public."odd,type"[]'],
    ["interval day", "interval day"],
    ["interval day to second(3)[]", "interval day to second(3)[]"],
    ["interval(3)", "interval(3)"],
  ]) {
    assert.equal(
      impact(baseline(), "public.t.id", "alter-type", input).to,
      expected,
    );
  }
  for (const input of ["text; SELECT 1", "text FROM t", "text, NULL"]) {
    assert.throws(
      () => impact(baseline(), "public.t.id", "alter-type", input),
      /Malformed target type/,
    );
  }
});

test("unsupported keyword DSN destination options fail before ambient fallback", () => {
  for (const key of [
    "service",
    "servicefile",
    "hostaddr",
    "target_session_attrs",
    "hst",
  ]) {
    assert.throws(
      () =>
        connection_config(
          `${key}=SYNTHETIC-PRIVATE-VALUE user=reader dbname=fixture`,
        ),
      (error) =>
        /Unsupported DSN parameter/.test(error.message) &&
        !error.message.includes("SYNTHETIC"),
    );
  }
});

test("unsupported URL destination options cannot silently choose another database", () => {
  for (const key of [
    "service",
    "servicefile",
    "hostaddr",
    "dbname",
    "database",
    "target_session_attrs",
    "load_balance_hosts",
  ]) {
    assert.throws(
      () =>
        connection_config(
          `postgresql://reader@fixture.invalid/fixture?${key}=SYNTHETIC-PRIVATE-VALUE`,
        ),
      (error) =>
        /Unsupported DSN parameter/.test(error.message) &&
        !error.message.includes("SYNTHETIC"),
    );
  }
});

test("explicit keyword SSL disabling overrides ambient SSL configuration", () => {
  const prior = process.env.PGSSLMODE;
  process.env.PGSSLMODE = "no-verify";
  try {
    for (const option of ["sslmode=disable", "ssl=false", "ssl=0"]) {
      const config = connection_config(
        `host=fixture.invalid user=reader dbname=fixture ${option}`,
      );
      assert.equal(config.ssl, false);
      assert.equal(new pg.Client(config).ssl, false);
    }
    for (const option of ["sslmode=verify-full", "ssl=true", "ssl=1"]) {
      assert.equal(
        connection_config(`host=fixture.invalid ${option}`).ssl,
        true,
      );
    }
  } finally {
    if (prior === undefined) delete process.env.PGSSLMODE;
    else process.env.PGSSLMODE = prior;
  }
});

test("catalog payloads are serialized once per query instead of once per object", () => {
  const data = {
    capture_version: "1.1.0",
    captured_at: "2026-10-09T00:00:00Z",
    queries: Object.fromEntries(
      Object.entries(QUERIES).map(([id, sql]) => [
        id,
        { sql_hash: digest(sql), rows: [] },
      ]),
    ),
  };
  data.queries.server_version.rows = [{ version: "180000" }];
  data.queries.pg_namespace.rows = [{ oid: 1, nspname: "public" }];
  let serializations = 0;
  data.queries.pg_class.rows = Array.from({ length: 20 }, (_, index) => ({
    oid: index + 100,
    nspname: "public",
    relname: `t${index}`,
    relkind: "r",
    relispartition: false,
    reltuples: 0,
    relpages: 0,
    ...(index === 0 ? { probe: 0 } : {}),
  }));
  Object.defineProperty(data.queries.pg_class.rows[0], "probe", {
    enumerable: true,
    get() {
      serializations++;
      return 0;
    },
  });
  const model = inspect_catalog(data);
  assert.equal(serializations, 1);
  assert.deepEqual(validate(model, true), []);
});

test("catalog evidence caching preserves the curated canonical snapshot bytes", () => {
  const fixture = JSON.parse(
    fs.readFileSync(
      new URL("../../examples/analytics/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const model = inspect_catalog(fixture);
  assert.equal(
    digest(canonical(model)),
    "sha256:fdf2724d5a3de182c0e694547e8d4d3bbff0f7f1a65c7199daf2ef1196632fdf",
  );
  assert.deepEqual(validate(model, true), []);
});

test("live defaults use stored node text without invoking expression deparsing", () => {
  assert.match(QUERIES.pg_attrdef, /a\.adbin::text AS expression/);
  assert.doesNotMatch(QUERIES.pg_attrdef, /pg_get_expr/);
});

test("new captures record versioned query hashes and hash stored defaults before returning", async () => {
  const calls = [];
  const expression =
    "{CONST :consttype 23 :constvalue SYNTHETIC-PRIVATE-DEFAULT}";
  const replacement = mock.method(pg, "Client", function () {
    return {
      async connect() {},
      async end() {},
      async query(sql) {
        calls.push(sql);
        if (sql === QUERIES.server_version)
          return { rows: [{ version: "180000" }] };
        if (sql === QUERIES.pg_attrdef)
          return { rows: [{ oid: 101, adrelid: 100, adnum: 1, expression }] };
        return { rows: [] };
      },
    };
  });
  try {
    const result = await capture("postgresql://reader@fixture.invalid/fixture");
    assert.equal(result.capture_version, "1.1.0");
    assert.deepEqual(calls, [
      "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      ...Object.values(QUERIES),
      "COMMIT",
    ]);
    assert.ok(!canonical(result).includes("SYNTHETIC-PRIVATE-DEFAULT"));
    assert.deepEqual(result.queries.pg_attrdef.rows, [
      {
        oid: 101,
        adrelid: 100,
        adnum: 1,
        expression_hash: digest(expression),
      },
    ]);
    for (const [qid, sql] of Object.entries(QUERIES))
      assert.equal(result.queries[qid].sql_hash, digest(sql));
    assert.deepEqual(validate(inspect_catalog(result), true), []);
  } finally {
    replacement.mock.restore();
  }
});

test("catalog version changes cannot relabel legacy query hashes as current evidence", () => {
  const fixture = JSON.parse(
    fs.readFileSync(
      new URL("../../examples/analytics/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const original = canonical(fixture);
  inspect_catalog(fixture);
  assert.equal(canonical(fixture), original);
  const mislabeled = structuredClone(fixture);
  mislabeled.capture_version = "1.1.0";
  assert.throws(
    () => inspect_catalog(mislabeled),
    /query hash mismatch: pg_attrdef/,
  );
});
