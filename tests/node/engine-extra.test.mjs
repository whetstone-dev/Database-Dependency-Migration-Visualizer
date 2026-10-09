import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspect_ddl,
  select,
  impact,
  diff,
  canonical,
  validate,
} from "../../src/dbdep/engine.mjs";
import {
  Builder,
  digest,
  identity,
  resources,
} from "../../src/dbdep/model.mjs";
import { review } from "../../src/dbdep/rules.mjs";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
function snapshot(sql) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dbdep-extra-"));
  const file = path.join(dir, "schema.sql");
  fs.writeFileSync(file, sql);
  return { dir, file, model: inspect_ddl(file) };
}
function migration(sql, baseline) {
  const { file } = snapshot(sql);
  return review(baseline, file);
}
test("qualified star limits column facts to its alias", () => {
  const { model } = snapshot(
    "CREATE TABLE t(a int); CREATE TABLE u(b int); CREATE VIEW v AS SELECT t.* FROM t JOIN u ON true;",
  );
  const v = select(model, "public.v");
  assert.ok(
    model.edges.some(
      (e) => e.source === v.id && e.target === select(model, "public.t.a").id,
    ),
  );
  assert.ok(
    !model.edges.some(
      (e) => e.source === v.id && e.target === select(model, "public.u.b").id,
    ),
    "t.* must not imply u.b is referenced",
  );
  assert.ok(model.unknowns.some((u) => /star/.test(u.explanation)));
});
test("schema-qualified star uses schema and relation name", () => {
  const { model } = snapshot(
    "CREATE TABLE s1.t(a int); CREATE TABLE s2.u(b int); CREATE VIEW v AS SELECT s1.t.* FROM s1.t JOIN s2.u ON true;",
  );
  const v = select(model, "public.v");
  assert.ok(
    model.edges.some(
      (e) => e.source === v.id && e.target === select(model, "s1.t.a").id,
    ),
  );
  assert.ok(
    !model.edges.some(
      (e) => e.source === v.id && e.target === select(model, "s2.u.b").id,
    ),
  );
});
test("star output has unknown shape without a fabricated view column", () => {
  const { model } = snapshot(
    "CREATE TABLE t(a int,b int); CREATE VIEW v AS SELECT t.* FROM t;",
  );
  assert.ok(!model.nodes.some((n) => n.kind === "column" && n.parent === "v"));
  assert.ok(
    model.unknowns.some((u) => /output expression\/star/.test(u.explanation)),
  );
});
test("all common DDL objects have explicit provenance and dependencies", () => {
  const { model } = snapshot(`
    CREATE SCHEMA app;
    CREATE TYPE app.state AS ENUM ('new', 'done');
    CREATE TYPE app.pair AS (a int, b int);
    CREATE DOMAIN app.positive AS int CHECK (VALUE > 0);
    CREATE SEQUENCE app.serial_number;
    CREATE TABLE app.parent (id int PRIMARY KEY, x int, state app.state,
      doubled int GENERATED ALWAYS AS (x*2) STORED);
    CREATE TABLE app.child (extra text) INHERITS (app.parent);
    CREATE TABLE app.refs (id int);
    ALTER TABLE app.refs ADD CONSTRAINT refs_fk FOREIGN KEY (id) REFERENCES app.parent;
    CREATE VIEW app.read_parent AS SELECT id,x FROM app.parent;
    CREATE MATERIALIZED VIEW app.saved_parent AS SELECT id,x FROM app.parent;
    CREATE INDEX expr_index ON app.parent ((x+1)) WHERE x>0;
    CREATE FUNCTION app.touch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
    CREATE PROCEDURE app.task(x int) LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;
    CREATE TRIGGER touch_x BEFORE UPDATE OF x ON app.parent FOR EACH ROW EXECUTE FUNCTION app.touch();
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `);
  assert.deepEqual(validate(model, true), []);
  for (const kind of [
    "schema",
    "type",
    "sequence",
    "table",
    "constraint",
    "view",
    "materialized_view",
    "index",
    "function",
    "procedure",
    "trigger",
    "extension",
  ])
    assert.ok(
      model.nodes.some((n) => n.kind === kind),
      kind,
    );
  for (const kind of [
    "inheritance",
    "type_reference",
    "foreign_key",
    "expression_reference",
    "trigger_association",
    "query_reference",
  ])
    assert.ok(
      model.edges.some((e) => e.kind === kind),
      kind,
    );
  const x = select(model, "app.parent.x"),
    affected = impact(model, x.id).affected;
  for (const selector of [
    "app.parent.doubled",
    "app.expr_index",
    "app.parent.touch_x",
  ])
    assert.ok(affected.includes(select(model, selector).id), selector);
  assert.ok(
    model.unknowns.some((u) => /Sequence ownership/.test(u.explanation)),
  );
  assert.ok(model.unknowns.some((u) => /Inherited column/.test(u.explanation)));
  assert.equal(model.coverage.exhaustive, false);
});
test("byte evidence preserves original BOM bytes and Unicode identifiers", () => {
  const { model, file } = snapshot(
    '\ufeffCREATE TABLE "café"("😀" int);\nCREATE VIEW "résumé" AS SELECT "😀" FROM "café";',
  );
  assert.deepEqual(validate(model, true), []);
  assert.equal(model.evidence.length, 2);
  assert.ok(model.evidence.some((e) => e.byte_start === 3));
  assert.ok(
    model.evidence.every(
      (e) => e.source_hash === digest(fs.readFileSync(file)),
    ),
  );
  assert.ok(model.evidence.some((e) => e.line_end === 2));
  assert.ok(
    impact(model, 'public."café"."😀"').affected.includes(
      select(model, 'public."résumé"').id,
    ),
  );
  assert.equal(
    identity("column", "public", "!()*'", "café"),
    "postgresql:local/public/column/caf%C3%A9/%21%28%29%2A%27/",
  );
  assert.ok(path.isAbsolute(resources()));
});
test("capture-related properties and OID drift do not create semantic diffs", () => {
  const b = new Builder(),
    ev = b.evidence("x.sql", Buffer.alloc(0));
  const a = b.node("table", "public", "a", ev, "", "", {
    oid: 1,
    reltuples: 5,
    relpages: 1,
  });
  const c = b.node("table", "public", "c", ev);
  b.edge(c, a, "catalog_dependency", ev, "OBSERVED", "postgres_catalog", {
    dependency_type: "n",
    via: "pg_rewrite",
    catalog_address: "pg_rewrite:1:0->pg_class:2:1",
  });
  const before = structuredClone(b.finish());
  a.properties.oid = 10;
  a.properties.reltuples = 50;
  a.properties.relpages = 5;
  b.edge(c, a, "catalog_dependency", ev, "OBSERVED", "postgres_catalog", {
    dependency_type: "n",
    via: "pg_rewrite",
    catalog_address: "pg_rewrite:99:0->pg_class:20:1",
  });
  const after = b.finish(),
    result = diff(before, after);
  assert.equal(before.edges[0].id, after.edges[0].id);
  assert.deepEqual(result.modified, []);
  assert.deepEqual(result.edges_added, []);
  assert.deepEqual(result.edges_removed, []);
});
for (const size of [100, 1000, 5000])
  test(`reverse traversal and strict validation cover ${size} nodes`, () => {
    const b = new Builder(),
      ev = b.evidence("large.sql", Buffer.alloc(0));
    let previous;
    for (let i = 0; i < size; i++) {
      const n = b.node("table", "public", `t${String(i).padStart(5, "0")}`, ev);
      if (previous) b.edge(n, previous, "query_reference", ev);
      previous = n;
    }
    const model = b.finish();
    assert.deepEqual(validate(model, true), []);
    const result = impact(model, "public.t00000");
    assert.equal(result.affected.length, size - 1);
    assert.equal(result.paths[previous.id].length, size - 1);
  });
test("normal transaction end releases concurrent-index restriction", () => {
  const { model } = snapshot("CREATE TABLE t(a int);");
  for (const end of ["COMMIT", "ROLLBACK"]) {
    const result = migration(
      `BEGIN; ${end}; CREATE INDEX CONCURRENTLY idx ON t(a);`,
      model,
    );
    assert.ok(!result.model.findings.some((f) => f.rule_id === "DDM006"));
  }
});
test("NOT VALID guidance is emitted only for supported CHECK/FK constraint types", () => {
  const { model } = snapshot("CREATE TABLE t(a int);");
  const check = migration(
    "ALTER TABLE t ADD CONSTRAINT positive CHECK(a>0) NOT VALID;",
    model,
  );
  assert.match(
    check.model.findings.find((f) => f.rule_id === "DDM007").reason,
    /already NOT VALID/,
  );
  const unique = migration(
    "ALTER TABLE t ADD CONSTRAINT uniq UNIQUE(a);",
    model,
  );
  assert.ok(!unique.model.findings.some((f) => f.rule_id === "DDM007"));
  assert.ok(unique.model.findings.some((f) => f.rule_id === "DDM013"));
});
test("review envelope and findings pass their separate JSON schemas", () => {
  const { model } = snapshot(
    "CREATE TABLE t(id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY);",
  );
  const result = migration("ALTER TABLE t ALTER COLUMN id TYPE uuid;", model);
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  for (const [name, value] of [
    ["findings", result.model.findings],
    [
      "report",
      Object.fromEntries(Object.entries(result).filter(([k]) => k !== "model")),
    ],
  ]) {
    const check = ajv.compile(
      JSON.parse(
        fs.readFileSync(path.join(root, `schemas/${name}.schema.json`), "utf8"),
      ),
    );
    assert.ok(check(value), JSON.stringify(check.errors));
  }
});
test("user metadata is inferred and free-form secrets are hashed only", () => {
  const { model, dir } = snapshot("CREATE TABLE t(id int);");
  const file = path.join(dir, "migration.sql");
  fs.writeFileSync(file, "CREATE INDEX idx ON t(id);");
  const result = review(model, file, "18", {
    "public.t": {
      size_bytes: 1000,
      traffic: "low",
      origin: "user_supplied",
      explanation: "postgresql://user:private-secret@host/db",
    },
  });
  assert.ok(!canonical(result).includes("private-secret"));
  assert.equal(result.metadata.status, "INFERRED");
  assert.ok(!result.model.findings.some((f) => f.rule_id === "DDM012"));
  assert.deepEqual(validate(result.model), []);
});
test("existing checked-in canonical models remain strictly valid", () => {
  for (const name of ["ecommerce", "analytics", "high-traffic"])
    assert.deepEqual(
      validate(
        JSON.parse(
          fs.readFileSync(
            path.join(root, `examples/rendered/${name}/model.dbdep.json`),
            "utf8",
          ),
        ),
        true,
      ),
      [],
    );
});
