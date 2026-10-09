import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspect_ddl,
  select,
  validate,
  canonical,
} from "../../src/dbdep/engine.mjs";
import { digest } from "../../src/dbdep/model.mjs";
import { statements, typename } from "../../src/dbdep/sql.mjs";
import { review } from "../../src/dbdep/rules.mjs";

function snapshot(sql) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dbdep-review-fix-"));
  const file = path.join(dir, "schema.sql");
  fs.writeFileSync(file, sql);
  return { dir, file, model: inspect_ddl(file) };
}
function runReview(sql, mode = "statements") {
  const { dir, model } = snapshot("CREATE TABLE t(x int);");
  const file = path.join(dir, "migration.sql");
  fs.writeFileSync(file, sql);
  return review(model, file, "18", null, mode);
}

test("unrelated numeric changes do not receive UUID-specific migration instructions", () => {
  const result = runReview(
    "ALTER TABLE t ALTER COLUMN x TYPE double precision;",
  );
  assert.ok(result.plan.length > 0);
  assert.doesNotMatch(JSON.stringify(result.plan), /uuid/i);
  assert.ok(
    result.limitations.some((text) => /checklist.*target-specific/i.test(text)),
  );
});

test("identifier changes retain mapping and recovery checks without claiming executable migrations", () => {
  const result = runReview("ALTER TABLE t ALTER COLUMN x TYPE uuid;");
  assert.ok(
    result.model.findings.some((finding) => finding.rule_id === "DDM002"),
  );
  assert.match(
    JSON.stringify(result.plan),
    /identifier mapping|mapping uniqueness/i,
  );
  assert.ok(result.plan.every((phase) => phase.review_only));
  assert.match(JSON.stringify(result.plan), /backup|recovery/i);
});
test("relation column alias lists retain only relation facts and an explicit scope gap", () => {
  const { model } = snapshot(
    "CREATE TABLE t(x int,y int); CREATE VIEW v AS SELECT q.x FROM t AS q(y,x);",
  );
  const v = select(model, "public.v"),
    t = select(model, "public.t");
  assert.ok(model.edges.some((e) => e.source === v.id && e.target === t.id));
  assert.ok(
    !model.edges.some(
      (e) =>
        e.source === v.id &&
        model.nodes.find((n) => n.id === e.target)?.kind === "column",
    ),
  );
  assert.ok(
    model.unknowns.some(
      (u) =>
        u.object_id === v.id &&
        /alias.*column|column.*alias/i.test(u.explanation),
    ),
  );
  assert.deepEqual(validate(model, true), []);
});
test("routine types containing commas, dots or quotes cannot collapse overload identities", () => {
  const { model } = snapshot(`
    CREATE TYPE "a,b" AS ENUM ('x'); CREATE TYPE a AS ENUM ('x'); CREATE TYPE b AS ENUM ('x');
    CREATE TYPE "a.b" AS ENUM ('x'); CREATE SCHEMA a; CREATE TYPE a.b AS ENUM ('x');
    CREATE TYPE "say""hi" AS ENUM ('x');
    CREATE FUNCTION f("a,b") RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
    CREATE FUNCTION f(a,b) RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
    CREATE FUNCTION f("a.b") RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
    CREATE FUNCTION f(a.b) RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
    CREATE FUNCTION f("say""hi") RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
    CREATE FUNCTION f(integer,text) RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
  `);
  const functions = model.nodes.filter(
    (n) => n.kind === "function" && n.name === "f",
  );
  assert.equal(functions.length, 6);
  assert.equal(new Set(functions.map((n) => n.id)).size, 6);
  for (const signature of [
    '"a,b"',
    "a,b",
    '"a.b"',
    "a.b",
    '"say""hi"',
    "int4,text",
  ])
    assert.ok(
      functions.some((n) => n.signature === signature),
      signature,
    );
  assert.equal(
    typename({
      names: [{ String: { sval: "pg_catalog" } }, { String: { sval: "int4" } }],
    }),
    "int4",
  );
  assert.equal(
    typename({
      names: [{ String: { sval: "Odd.Schema" } }, { String: { sval: "a,b" } }],
    }),
    '"Odd.Schema"."a,b"',
  );
  assert.deepEqual(validate(model, true), []);
});
test("ambiguous unqualified routine parameter types remain unknown", () => {
  const { model } = snapshot(
    `CREATE TYPE s1.mood AS ENUM ('ok'); CREATE TYPE s2.mood AS ENUM ('bad'); CREATE FUNCTION f(mood) RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;`,
  );
  const fn = model.nodes.find((n) => n.kind === "function" && n.name === "f");
  assert.ok(
    model.unknowns.some(
      (u) =>
        u.object_id === fn.id &&
        /Ambiguous routine parameter type/.test(u.explanation),
    ),
  );
});
test("BOM evidence hashes original bytes and points to actual file offsets", () => {
  const sql =
    '\ufeffCREATE TABLE "café"("😀" int);\nCREATE VIEW v AS SELECT "😀" FROM "café";';
  const { model, file } = snapshot(sql),
    raw = fs.readFileSync(file),
    text = sql.slice(1);
  const parsed = statements(text);
  assert.equal(model.evidence.length, parsed.length);
  assert.ok(model.evidence.every((e) => e.source_hash === digest(raw)));
  for (const stmt of parsed) {
    const start = (stmt.stmt_location ?? 0) + 3;
    const length = stmt.stmt_len || raw.length - start;
    const evidence = model.evidence.find((e) => e.byte_start === start);
    assert.ok(evidence, `Missing original-byte range at ${start}`);
    assert.equal(evidence.byte_length, length);
    assert.equal(
      raw
        .subarray(start, start + length)
        .toString("utf8")
        .trim()
        .startsWith("CREATE"),
      true,
    );
  }
  assert.deepEqual(validate(model, true), []);
});
for (const join of ["JOIN u USING(x)", "NATURAL JOIN u"])
  test(`${join} has explicit uncertainty for implicit join columns`, () => {
    const { model } = snapshot(
      `CREATE TABLE t(x int,y int); CREATE TABLE u(x int,z int); CREATE VIEW v AS SELECT t.y AS value FROM t ${join};`,
    );
    const v = select(model, "public.v");
    for (const name of ["public.t", "public.u"])
      assert.ok(
        model.edges.some(
          (e) => e.source === v.id && e.target === select(model, name).id,
        ),
      );
    assert.ok(
      model.unknowns.some(
        (u) => u.object_id === v.id && /USING|NATURAL/.test(u.explanation),
      ),
    );
    assert.ok(
      !model.edges.some(
        (e) =>
          e.source === v.id &&
          model.nodes.find((n) => n.id === e.target)?.kind === "column",
      ),
    );
  });
test("PREPARE TRANSACTION closes local context and marks two-phase behavior unknown", () => {
  const result = runReview(
    "BEGIN; PREPARE TRANSACTION 'private-transaction-id'; CREATE INDEX CONCURRENTLY i ON t(x);",
  );
  assert.ok(!result.model.findings.some((f) => f.rule_id === "DDM006"));
  assert.ok(result.model.findings.some((f) => f.rule_id === "DDM013"));
  assert.ok(!canonical(result).includes("private-transaction-id"));
});
for (const operation of ["COMMIT", "ROLLBACK"])
  test(`${operation} PREPARED preserves local transaction state`, () => {
    const outside = runReview(
      `${operation} PREPARED 'example'; CREATE INDEX CONCURRENTLY i ON t(x);`,
    );
    assert.ok(!outside.model.findings.some((f) => f.rule_id === "DDM006"));
    assert.ok(outside.model.findings.some((f) => f.rule_id === "DDM013"));
    const inside = runReview(
      `BEGIN; ${operation} PREPARED 'example'; CREATE INDEX CONCURRENTLY i ON t(x);`,
    );
    assert.ok(inside.model.findings.some((f) => f.rule_id === "DDM006"));
    assert.ok(inside.model.findings.some((f) => f.rule_id === "DDM013"));
  });
test("declared single-transaction runner retains its constraint across prepare", () => {
  const result = runReview(
    "BEGIN; PREPARE TRANSACTION 'example'; CREATE INDEX CONCURRENTLY i ON t(x);",
    "single",
  );
  assert.ok(result.model.findings.some((f) => f.rule_id === "DDM006"));
  assert.ok(result.model.findings.some((f) => f.rule_id === "DDM013"));
});
