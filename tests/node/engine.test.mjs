import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const modulePath = path.join(root, "src/dbdep/engine.mjs");
test("the engine is a native callable Node module", async () => {
  assert.ok(fs.existsSync(modulePath), "Native Node engine is missing");
  const engine = await import(pathToFileURL(modulePath).href);
  assert.equal(typeof engine.inspect_ddl, "function");
});

// Each case operates on actual parser output, never a mocked SQL AST.
if (fs.existsSync(modulePath)) {
  const api = await import(pathToFileURL(modulePath).href);
  const { Builder, digest } = await import("../../src/dbdep/model.mjs");
  const { review } = await import("../../src/dbdep/rules.mjs");
  const fixture = (sql, repoFiles = null) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dbdep-node-"));
    const file = path.join(dir, "schema.sql");
    fs.writeFileSync(file, sql);
    let repo = null;
    if (repoFiles) {
      repo = path.join(dir, "app");
      fs.mkdirSync(repo);
      for (const [name, text] of Object.entries(repoFiles))
        fs.writeFileSync(path.join(repo, name), text);
    }
    return { file, model: api.inspect_ddl(file, repo), dir };
  };
  const ecommerce = () =>
    api.inspect_ddl(
      path.join(root, "examples/ecommerce/schema.sql"),
      path.join(root, "examples/ecommerce/app"),
    );
  const runReview = (sql, model = ecommerce(), options = {}) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dbdep-review-"));
    const file = path.join(dir, "migration.sql");
    fs.writeFileSync(file, sql);
    return review(
      model,
      file,
      options.version ?? "18",
      options.metadata ?? null,
      options.transaction_mode ?? "statements",
    );
  };
  test("canonical JSON matches Python sorting, spacing, Unicode escaping and hashing", () => {
    assert.equal(
      api.canonical({ z: "é😀", a: [1, true, null] }),
      '{\n  "a": [\n    1,\n    true,\n    null\n  ],\n  "z": "\\u00e9\\ud83d\\ude00"\n}\n',
    );
    assert.throws(() => api.canonical({ value: NaN }));
    assert.equal(
      digest(Buffer.from("hello")),
      "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
  test("ecommerce has foreign keys, transitive consumers and deterministic provenance", () => {
    const model = ecommerce();
    assert.deepEqual(api.validate(model, true), []);
    assert.equal(api.canonical(model), api.canonical(ecommerce()));
    const result = api.impact(model, "public.customers.id");
    const names = new Set(
      model.nodes
        .filter((n) => result.affected.includes(n.id))
        .map((n) => n.name),
    );
    for (const name of [
      "customer_summary",
      "orders_customer_id_fkey",
      "addresses_customer_id_fkey",
    ])
      assert.ok(names.has(name));
    assert.ok(result.affected.some((id) => id.includes("customers.sql")));
    assert.ok(!result.affected.includes(result.root));
    assert.ok(model.evidence.some((e) => e.line_start > 1));
  });
  for (const mutation of [
    "duplicate",
    "dangling",
    "evidence",
    "enum",
    "version",
    "hash",
    "constraint",
    "finding",
    "unknown",
    "alias",
  ]) {
    test(`validation rejects ${mutation} without echoing secret values`, () => {
      const model = runReview(
        "ALTER TABLE public.customers DROP COLUMN id",
      ).model;
      const secret = "postgresql://user:unique-secret@host/db";
      switch (mutation) {
        case "duplicate":
          model.nodes.push(structuredClone(model.nodes[0]));
          break;
        case "dangling":
          model.edges[0].target = secret;
          break;
        case "evidence":
          model.edges[0].evidence_ids = [secret];
          break;
        case "enum":
          model.nodes[0].status = secret;
          break;
        case "version":
          model.engine.version = secret;
          break;
        case "hash":
          model.evidence[0].source_hash = secret;
          break;
        case "constraint":
          model.edges.find(
            (e) => e.properties.constraint,
          ).properties.constraint = secret;
          break;
        case "finding":
          model.findings[0].object_ids = [secret];
          break;
        case "unknown":
          model.unknowns[0].object_id = secret;
          break;
        case "alias":
          model.findings[0].evidence = [secret];
          break;
      }
      const errors = api.validate(model);
      assert.ok(errors.length);
      assert.ok(!JSON.stringify(errors).includes("unique-secret"));
    });
  }
  test("quoted composite primary key, partition and overloaded routines retain identity", () => {
    const model = api.inspect_ddl(
      path.join(root, "examples/tricky-identifiers/schema.sql"),
    );
    assert.deepEqual(api.validate(model), []);
    assert.equal(
      api.select(model, '"Commerce"."Order"."CustomerID"').properties.nullable,
      false,
    );
    assert.equal(
      api.select(model, '"Commerce"."Order".region').properties.nullable,
      false,
    );
    assert.equal(
      model.nodes.filter((n) => n.kind === "function" && n.name === "label")
        .length,
      2,
    );
    assert.ok(model.edges.some((e) => e.kind === "partition"));
    assert.equal(
      model.nodes.find((n) => n.properties.constraint_type === "foreign_key")
        .properties.columns.length,
      2,
    );
  });
  test("dynamic SQL and host code stay unknown while grounded references remain", () => {
    const model = api.inspect_ddl(
      path.join(root, "examples/dynamic-sql-unknown/schema.sql"),
      path.join(root, "examples/dynamic-sql-unknown/app"),
    );
    assert.ok(model.unknowns.some((u) => /Routine/.test(u.explanation)));
    assert.ok(model.unknowns.some((u) => /Host/.test(u.explanation)));
    assert.ok(api.impact(model, "public.customers.email").affected.length);
    assert.equal(model.coverage.exhaustive, false);
  });
  test("schema and custom type collisions produce uncertainty without fabricated edges", () => {
    const model = api.inspect_ddl(
      path.join(root, "examples/multi-schema/schema.sql"),
    );
    assert.ok(model.unknowns.some((u) => /ambiguous/i.test(u.explanation)));
    assert.equal(
      model.nodes.filter((n) => n.kind === "table" && n.name === "orders")
        .length,
      2,
    );
    const ambiguous = fixture(
      "CREATE TYPE s1.mood AS ENUM('ok'); CREATE TYPE s2.mood AS ENUM('bad'); CREATE TABLE public.t(a mood);",
    ).model;
    const col = api.select(ambiguous, "public.t.a");
    assert.ok(
      !ambiguous.edges.some(
        (e) => e.source === col.id && e.kind === "type_reference",
      ),
    );
    assert.ok(
      ambiguous.unknowns.some((u) =>
        /Ambiguous custom type/.test(u.explanation),
      ),
    );
  });
  test("DML target columns and relation targets are real consumers", () => {
    const model = fixture("CREATE TABLE public.t(id int,a int);", {
      "writes.sql":
        "INSERT INTO public.t(a) VALUES(1); UPDATE public.t AS target SET a=1 WHERE target.id=2; DELETE FROM public.t WHERE a>0;",
    }).model;
    const queries = model.nodes.filter((n) => n.kind === "query");
    assert.equal(queries.length, 3);
    for (const selector of ["public.t", "public.t.a"])
      for (const n of queries)
        assert.ok(api.impact(model, selector).affected.includes(n.id));
    assert.deepEqual(api.validate(model), []);
  });
  test("nested query scope keeps relation references and does not invent column facts", () => {
    const model = fixture(
      "CREATE TABLE t(a int); CREATE VIEW v AS WITH q AS (SELECT a FROM t) SELECT a FROM q;",
    ).model;
    const v = api.select(model, "public.v");
    assert.ok(model.unknowns.some((u) => /Nested\/CTE/.test(u.explanation)));
    assert.ok(
      model.edges.some(
        (e) =>
          e.source === v.id && e.target === api.select(model, "public.t").id,
      ),
    );
    assert.ok(
      !model.edges.some(
        (e) =>
          e.source === v.id && e.target === api.select(model, "public.t.a").id,
      ),
    );
  });
  for (const [beforeSQL, afterSQL, kind] of [
    [
      "CREATE TABLE t(a int CHECK(a>0) CHECK(a<10));",
      "CREATE TABLE t(a int CHECK(a<10));",
      "check",
    ],
    [
      "CREATE TABLE p(id int PRIMARY KEY); CREATE TABLE q(id int PRIMARY KEY); CREATE TABLE t(a int REFERENCES p(id) REFERENCES q(id));",
      "CREATE TABLE p(id int PRIMARY KEY); CREATE TABLE q(id int PRIMARY KEY); CREATE TABLE t(a int REFERENCES q(id));",
      "foreign_key",
    ],
    [
      "CREATE TABLE p(id int PRIMARY KEY); CREATE TABLE t(a int REFERENCES p(id) REFERENCES p(id));",
      "CREATE TABLE p(id int PRIMARY KEY); CREATE TABLE t(a int REFERENCES p(id));",
      "foreign_key",
    ],
  ])
    test(`unnamed ${kind} constraints remain distinct and stable when a sibling is removed`, () => {
      const before = fixture(beforeSQL).model,
        after = fixture(afterSQL).model;
      assert.equal(
        before.nodes.filter((n) => n.properties.constraint_type === kind)
          .length,
        2,
      );
      assert.equal(api.diff(before, after).removed.length, 1);
    });
  test("diff reports rename candidates as unknown", () => {
    const result = api.diff(
      api.inspect_ddl(path.join(root, "examples/diff/before.sql")),
      api.inspect_ddl(path.join(root, "examples/diff/after.sql")),
    );
    assert.ok(
      result.added.length &&
        result.removed.length &&
        result.rename_candidates.length,
    );
    assert.ok(result.rename_candidates.every((x) => x.status === "UNKNOWN"));
  });
  test("graph traversal terminates on cycles and chooses shortest paths", () => {
    const b = new Builder(),
      ev = b.evidence("cycle.sql", Buffer.alloc(0));
    const [a, c, d] = ["a", "c", "d"].map((n) =>
      b.node("table", "public", n, ev),
    );
    for (const [s, t] of [
      [c, a],
      [d, c],
      [a, d],
      [d, a],
    ])
      b.edge(s, t, "query_reference", ev);
    const result = api.impact(b.finish(), a.id);
    assert.equal(result.affected.length, 2);
    assert.equal(result.paths[d.id].length, 1);
  });
  test("invalid SQL, unsafe selectors and unsafe type text fail with safe messages", () => {
    assert.throws(
      () => fixture("CREATE TABLE ???"),
      /Invalid PostgreSQL syntax/,
    );
    assert.throws(
      () => api.select(ecommerce(), "public.customers.id; DROP TABLE t"),
      /Malformed selector/,
    );
    assert.throws(
      () =>
        api.impact(
          ecommerce(),
          "public.customers.id",
          "alter-type",
          "uuid; DROP TABLE public.customers",
        ),
      /Malformed target type/,
    );
    assert.throws(
      () =>
        runReview("CREATE INDEX x ON public.orders(id)", ecommerce(), {
          metadata: { "public.orders": { password: "secret" } },
        }),
      /Metadata accepts/,
    );
    const safe = fixture(
      "CREATE TABLE t(id int,token text DEFAULT 'very-secret'); SELECT id FROM t WHERE token='very-secret';",
    ).model;
    assert.ok(!JSON.stringify(safe).includes("very-secret"));
  });
  const cases = [
    ["DDM001", "ALTER TABLE public.customers DROP COLUMN email", "SELECT 1"],
    [
      "DDM002",
      "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
      "SELECT 1",
    ],
    [
      "DDM003",
      "ALTER TABLE public.customers ALTER COLUMN name SET NOT NULL",
      "ALTER TABLE public.customers ALTER COLUMN name DROP NOT NULL",
    ],
    [
      "DDM004",
      "ALTER TABLE public.customers ADD COLUMN code int DEFAULT 1",
      "ALTER TABLE public.customers ADD COLUMN code int",
    ],
    [
      "DDM005",
      "CREATE INDEX customer_name ON public.customers(name)",
      "CREATE INDEX CONCURRENTLY customer_name ON public.customers(name)",
    ],
    [
      "DDM006",
      "BEGIN; CREATE INDEX CONCURRENTLY customer_name ON public.customers(name); COMMIT;",
      "CREATE INDEX CONCURRENTLY customer_name ON public.customers(name)",
    ],
    [
      "DDM007",
      "ALTER TABLE public.orders ADD CONSTRAINT c CHECK(total_amount>0)",
      "ALTER TABLE public.orders VALIDATE CONSTRAINT c",
    ],
    [
      "DDM008",
      "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
      "ALTER TABLE public.products ALTER COLUMN price TYPE float8",
    ],
    [
      "DDM009",
      "ALTER TABLE public.customers RENAME COLUMN email TO email_address",
      "ALTER TABLE public.customers RENAME TO clients",
    ],
    [
      "DDM010",
      "DROP TABLE public.customers CASCADE",
      "DROP TABLE public.products RESTRICT",
    ],
    [
      "DDM011",
      "ALTER TABLE public.orders DROP COLUMN customer_id",
      "ALTER TABLE public.orders ADD COLUMN extra text",
    ],
    [
      "DDM012",
      "CREATE INDEX customer_name ON public.customers(name)",
      "SELECT 1",
    ],
    ["DDM013", "DO $$ BEGIN NULL; END $$", "SELECT 1"],
    [
      "DDM014",
      "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
      "ALTER TABLE public.customers ALTER COLUMN name TYPE varchar",
    ],
    [
      "DDM015",
      "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
      "ALTER TABLE public.customers ALTER COLUMN name TYPE varchar",
    ],
  ];
  for (const [rule, positive, negative] of cases)
    test(`${rule} has positive and negative migration evidence`, () => {
      assert.ok(
        runReview(positive).model.findings.some((f) => f.rule_id === rule),
      );
      assert.ok(
        !runReview(negative).model.findings.some((f) => f.rule_id === rule),
      );
    });
  test("review outputs a schema-valid phased plan and actual source/target types", () => {
    const result = runReview(
      "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
    );
    assert.deepEqual(api.validate(result.model), []);
    assert.deepEqual(
      result.plan.map((p) => p.phase),
      ["expand", "backfill", "validate", "transition", "contract"],
    );
    assert.ok(
      result.plan.every(
        (p) => p.preconditions && p.verification && p.recovery && p.review_only,
      ),
    );
    const finding = result.model.findings.find((f) => f.rule_id === "DDM002");
    assert.match(finding.reason, /BIGINT/i);
    assert.match(finding.reason, /uuid/);
    assert.equal(finding.risk_level, "high");
  });
  test("default volatility and PostgreSQL version change the risk", () => {
    let result = runReview(
      "ALTER TABLE public.customers ADD COLUMN x int DEFAULT 1",
    );
    assert.equal(
      result.model.findings.find((f) => f.rule_id === "DDM004").risk_level,
      "medium",
    );
    result = runReview(
      "ALTER TABLE public.customers ADD COLUMN x float DEFAULT random()",
    );
    assert.equal(
      result.model.findings.find((f) => f.rule_id === "DDM004").risk_level,
      "high",
    );
    const model = ecommerce();
    model.engine.version = "10";
    result = runReview(
      "ALTER TABLE public.customers ADD COLUMN x int DEFAULT 1",
      model,
    );
    assert.equal(
      result.model.findings.find((f) => f.rule_id === "DDM004").risk_level,
      "high",
    );
  });
  for (const sql of [
    "BEGIN; SAVEPOINT s; ROLLBACK TO SAVEPOINT s; CREATE INDEX CONCURRENTLY x ON public.orders(id); COMMIT;",
    "BEGIN; COMMIT AND CHAIN; CREATE INDEX CONCURRENTLY x ON public.orders(id); ROLLBACK;",
    "BEGIN; ROLLBACK AND CHAIN; CREATE INDEX CONCURRENTLY x ON public.orders(id); COMMIT;",
  ])
    test("transaction remains open for concurrent indexes after savepoint or chained end", () => {
      assert.ok(
        runReview(sql).model.findings.some((f) => f.rule_id === "DDM006"),
      );
    });
  test("single-transaction runner disallows concurrent indexes and missing baseline remains partial", () => {
    assert.ok(
      runReview(
        "CREATE INDEX CONCURRENTLY x ON public.orders(id)",
        ecommerce(),
        { transaction_mode: "single" },
      ).model.findings.some((f) => f.rule_id === "DDM006"),
    );
    const result = runReview("ALTER TABLE unseen DROP COLUMN id", null);
    assert.ok(result.model.unknowns.length);
    assert.ok(result.model.findings.some((f) => f.rule_id === "DDM001"));
  });
  test("SQL literals and comments cannot trigger migration rules", () => {
    assert.equal(
      runReview(
        "SELECT 'BEGIN; CREATE INDEX CONCURRENTLY x ON t(id);'; -- DROP TABLE customers CASCADE",
      ).model.findings.length,
      0,
    );
  });
  for (const sql of [
    "CREATE OR REPLACE VIEW public.v AS SELECT b AS a FROM public.t;",
    "ALTER TABLE public.t RENAME TO renamed;",
    "DROP INDEX public.t_a_idx;",
    "DROP VIEW public.v;",
    "ALTER TABLE public.t ADD CONSTRAINT u UNIQUE(a);",
    "ALTER TABLE public.t ADD COLUMN required int NOT NULL;",
    "ALTER FUNCTION public.f(int) RENAME TO renamed;",
    "UPDATE public.t SET a=b;",
  ])
    test("unassessed migration retains unknown risk and a plan", () => {
      const base = fixture(
        "CREATE TABLE public.t(a int,b int); CREATE VIEW public.v AS SELECT a FROM public.t; CREATE INDEX t_a_idx ON public.t(a);",
      ).model;
      const result = runReview(sql, base, {
        metadata: { "public.t": { size_bytes: 1000, traffic: "low" } },
      });
      assert.ok(result.model.findings.some((f) => f.rule_id === "DDM013"));
      assert.ok(["unknown", "high"].includes(result.risk_level));
      assert.ok(result.plan.length);
    });
  test("every unresolved statement has its own evidence-linked finding", () => {
    const result = runReview(
      "ALTER TABLE missing DROP COLUMN a; ALTER TABLE another_missing DROP COLUMN b;",
    );
    const evs = new Set(
      result.model.evidence
        .filter((e) => e.origin === "migration_diff")
        .map((e) => e.id),
    );
    const findings = result.model.findings.filter(
      (f) => f.rule_id === "DDM013",
    );
    for (const id of evs)
      assert.ok(findings.some((f) => f.evidence_ids.includes(id)));
  });
}
