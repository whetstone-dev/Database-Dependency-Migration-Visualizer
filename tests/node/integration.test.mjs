import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ROOT, checked_remove } from "../../scripts/tooling.mjs";
import {
  QUERIES,
  capture,
  inspect_catalog,
  connection_config,
} from "../../src/dbdep/catalog.mjs";
import {
  inspect_ddl,
  statements,
  walk,
  strings,
} from "../../src/dbdep/sql.mjs";
import { canonical, validate } from "../../src/dbdep/model.mjs";
import { impact, diff } from "../../src/dbdep/graph.mjs";
import { review } from "../../src/dbdep/rules.mjs";
import {
  render,
  embedded_state,
  markdown,
  mermaid,
  dot,
  summary,
} from "../../src/dbdep/reports.mjs";
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const ecommerce = () =>
  inspect_ddl(
    join(ROOT, "examples/ecommerce/schema.sql"),
    join(ROOT, "examples/ecommerce/app"),
  );
const cli = (...args) =>
  spawnSync(process.execPath, [join(ROOT, "scripts/dbdep.mjs"), ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
function temporary(work) {
  const base = join(ROOT, "tmp");
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, "integration-"));
  try {
    return work(dir);
  } finally {
    checked_remove(dir, base);
  }
}

test("complete Node CLI pipeline yields the same validated model in every artifact", () =>
  temporary((dir) => {
    const path = join(dir, "model.json");
    const result = cli(
      "inspect",
      "--ddl",
      join(ROOT, "examples/ecommerce/schema.sql"),
      "--repo",
      join(ROOT, "examples/ecommerce/app"),
      "--out",
      path,
      "--json",
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(summary(readJson(path)), {
      nodes: 52,
      edges: 98,
      evidence: 12,
      findings: 0,
      unknowns: 8,
      severity_counts: { info: 0, warning: 0, error: 0 },
    });
    for (const [command, ext] of [
      ["render", "html"],
      ["docs", "md"],
      ["mermaid", "mmd"],
      ["dot", "dot"],
    ])
      assert.equal(
        cli(command, path, "--out", join(dir, `report.${ext}`)).status,
        0,
      );
    assert.equal(cli("validate", path, "--strict", "--json").status, 0);
    const model = readJson(path),
      html = readFileSync(join(dir, "report.html"), "utf8"),
      md = readFileSync(join(dir, "report.md"), "utf8");
    assert.deepEqual(embedded_state(html).model, model);
    for (const obj of [...model.nodes, ...model.edges])
      assert.ok(md.includes(obj.id));
  }));
test("invalid model cannot create a report", () =>
  temporary((dir) => {
    const path = join(dir, "bad.json");
    writeFileSync(path, "{}");
    assert.equal(cli("render", path, "--out", join(dir, "bad.html")).status, 2);
    assert.equal(existsSync(join(dir, "bad.html")), false);
  }));
test("risk gate exits 3 after writing review artifacts", () =>
  temporary((dir) => {
    const path = join(dir, "baseline.json");
    writeFileSync(path, canonical(ecommerce()));
    const result = cli(
      "review",
      "--baseline",
      path,
      "--migration",
      join(ROOT, "examples/high-traffic/migrations/007.sql"),
      "--out",
      join(dir, "review"),
      "--fail-on",
      "high",
      "--json",
    );
    assert.equal(result.status, 3, result.stderr);
    assert.equal(JSON.parse(result.stdout).policy_passed, false);
    assert.ok(existsSync(join(dir, "review/report.html")));
  }));
test("unknown migration scope fails unknown policy while preserving deliverables", () =>
  temporary((dir) => {
    const baseline = join(dir, "baseline.json"),
      migration = join(dir, "m.sql");
    writeFileSync(baseline, canonical(ecommerce()));
    writeFileSync(
      migration,
      "CREATE OR REPLACE VIEW public.customer_summary AS SELECT id FROM public.customers;",
    );
    const result = cli(
      "review",
      "--baseline",
      baseline,
      "--migration",
      migration,
      "--out",
      join(dir, "review"),
      "--fail-on",
      "unknown",
      "--json",
    );
    assert.equal(result.status, 3, result.stderr);
    assert.ok(existsSync(join(dir, "review/report.html")));
  }));
test("doctor, snapshot alias, impact, diff work and apply is unavailable", () =>
  temporary((dir) => {
    const result = cli("doctor", "--json");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).migration_execution, false);
    const path = join(dir, "m.json");
    assert.equal(
      cli(
        "snapshot",
        "--ddl",
        join(ROOT, "examples/ecommerce/schema.sql"),
        "--out",
        path,
      ).status,
      0,
    );
    assert.ok(
      JSON.parse(
        cli(
          "impact",
          path,
          "--object",
          "public.customers.id",
          "--operation",
          "alter-type",
          "--to",
          "uuid",
          "--json",
        ).stdout,
      ).affected.length,
    );
    assert.equal(cli("diff", path, path, "--out", join(dir, "diff")).status, 0);
    assert.equal(cli("apply", path).status, 2);
    assert.equal(cli("--version").stdout.trim(), "0.3.0");
  }));
test("invalid flag values and JSON never expose secrets", () =>
  temporary((dir) => {
    const secret = "unique-private-password",
      m = ecommerce();
    m.engine.version = `postgresql://user:${secret}@host/db`;
    const path = join(dir, "bad.json");
    writeFileSync(path, JSON.stringify(m));
    const result = cli("validate", path, "--json");
    assert.equal(result.status, 2);
    assert.ok(!(result.stdout + result.stderr).includes(secret));
    const flags = cli(
      "inspect",
      "--dsn",
      `postgresql://user:${secret}@host/db`,
    );
    assert.equal(flags.status, 2);
    assert.ok(!(flags.stdout + flags.stderr).includes(secret));
  }));
test("live mode must be explicit and input methods mutually exclusive", () =>
  temporary((dir) => {
    assert.equal(
      cli(
        "inspect",
        "--dsn-env",
        "DBDEP_UNSET_TEST",
        "--out",
        join(dir, "m.json"),
      ).status,
      2,
    );
    assert.equal(
      cli(
        "inspect",
        "--ddl",
        join(ROOT, "examples/ecommerce/schema.sql"),
        "--catalog",
        join(ROOT, "examples/analytics/catalog.json"),
        "--out",
        join(dir, "m.json"),
      ).status,
      2,
    );
  }));
test("all discovery queries are one fixed SELECT, catalog-qualified, and use only allowed routines", () => {
  for (const [qid, sql] of Object.entries(QUERIES)) {
    const stmts = statements(sql);
    assert.equal(stmts.length, 1, qid);
    assert.ok(stmts[0].stmt.SelectStmt, qid);
    for (const r of walk(stmts, "RangeVar"))
      assert.equal(r.schemaname, "pg_catalog", qid);
    for (const f of walk(stmts, "FuncCall"))
      assert.ok(
        ["current_setting", "pg_get_expr"].includes(strings(f.funcname).at(-1)),
        qid,
      );
  }
});
test("genuine catalog preserves normalized view chains and snapshot addresses", () => {
  const m = inspect_catalog(
    readJson(join(ROOT, "examples/analytics/catalog.json")),
  );
  assert.deepEqual(validate(m, true), []);
  assert.deepEqual(
    [m.nodes.length, m.edges.length, m.unknowns.length],
    [22, 29, 1],
  );
  const names = m.nodes
    .filter((n) =>
      impact(m, "sales.orders.total_amount").affected.includes(n.id),
    )
    .map((n) => n.name);
  assert.ok(names.includes("order_summary"));
  assert.ok(names.includes("monthly_revenue"));
  assert.ok(m.edges.every((e) => e.origin === "postgres_catalog"));
  assert.ok(
    m.edges.some(
      (e) => e.properties.via === "pg_rewrite" && e.properties.catalog_address,
    ),
  );
  const changed = structuredClone(m);
  for (const n of changed.nodes)
    if ("oid" in n.properties) n.properties.oid += 100000;
  assert.deepEqual(diff(m, changed).modified, []);
});
test("catalog hash, row-set, and version tampering are rejected", () => {
  const fixture = readJson(join(ROOT, "examples/analytics/catalog.json"));
  const badHash = structuredClone(fixture);
  badHash.queries.pg_depend.sql_hash = "sha256:" + "0".repeat(64);
  assert.throws(() => inspect_catalog(badHash), /query hash/);
  const badSet = structuredClone(fixture);
  delete badSet.queries.pg_depend;
  assert.throws(() => inspect_catalog(badSet), /query set/);
  const badVersion = structuredClone(fixture);
  badVersion.queries.server_version.rows[0].version = "190000";
  assert.throws(() => inspect_catalog(badVersion), /14-18/);
});
test("DSN startup options cannot disable read-only or timeouts", () => {
  const url = connection_config(
    "postgresql://u:p@127.0.0.1/d?options=-c%20default_transaction_read_only%3Doff",
  );
  assert.match(url.options, /default_transaction_read_only=on/);
  assert.ok(!("connectionString" in url));
  const keyword = connection_config(
    "host=127.0.0.1 port=5432 user=u dbname='name with spaces' password='value\\'quoted' options='-c default_transaction_read_only=off'",
  );
  assert.equal(keyword.database, "name with spaces");
  assert.equal(keyword.password, "value'quoted");
  assert.match(keyword.options, /default_transaction_read_only=on/);
});
test("driver connection errors do not reveal credentials", async () => {
  await assert.rejects(
    capture("postgresql://user:never-print-this@127.0.0.1:1/missing"),
    (e) =>
      e.message.includes("no connection details") &&
      !e.message.includes("never-print-this"),
  );
});
test("HTML escaping prevents hostile names or renderer tokens changing scripts", () =>
  temporary((dir) => {
    const path = join(dir, "x.sql");
    writeFileSync(
      path,
      'CREATE TABLE "</script><img src=x onerror=alert(1)>__JS__" (id int)',
    );
    const m = inspect_ddl(path),
      html = render(m);
    assert.ok(!html.includes("</script><img"));
    assert.ok(!html.includes("<script src="));
    assert.ok(!html.includes("https://cdn"));
    assert.deepEqual(embedded_state(html).model, m);
    assert.ok(html.includes("Content-Security-Policy"));
    assert.ok(!html.includes("'unsafe-inline'"));
    assert.ok(html.includes("connect-src &#x27;none&#x27;"));
  }));
test("review and findings envelopes satisfy their published schemas", () => {
  const r = review(
    ecommerce(),
    join(ROOT, "examples/high-traffic/migrations/007.sql"),
  );
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  for (const [name, value] of [
    ["findings", r.model.findings],
    [
      "report",
      Object.fromEntries(Object.entries(r).filter(([k]) => k !== "model")),
    ],
  ]) {
    const check = ajv.compile(
      readJson(join(ROOT, `schemas/${name}.schema.json`)),
    );
    assert.ok(check(value), JSON.stringify(check.errors));
  }
});
test("model exports include every object, edge, and source evidence", () => {
  const m = ecommerce(),
    md = markdown(m),
    state = embedded_state(render(m));
  assert.deepEqual(state.summary, summary(m));
  assert.deepEqual(state.model, m);
  for (const e of m.evidence) assert.ok(md.includes(e.source_hash));
  assert.ok(mermaid(m).startsWith("flowchart LR"));
  assert.ok(dot(m).startsWith("digraph dependencies"));
});

test("all report inline assets have exact matching CSP hashes and embedded font notices", () => {
  const html = render(ecommerce());
  const hash = (value) => createHash("sha256").update(value).digest("base64");
  for (const match of html.matchAll(
    /<(script|style)([^>]*)>([\s\S]*?)<\/\1>/g,
  )) {
    if (match[2].includes("application/json")) continue;
    assert.ok(
      html.includes(`sha256-${hash(match[3])}`),
      `Missing ${match[1]} hash`,
    );
  }
  assert.ok(html.includes("data:font/woff2;base64,"));
  assert.ok(html.includes("SIL OPEN FONT LICENSE"));
});

test("catalog routine signatures keep comma and quoted schema/type names unambiguous", () => {
  const fixture = readJson(join(ROOT, "examples/analytics/catalog.json"));
  fixture.queries.pg_namespace.rows.push({ oid: 77700, nspname: "odd.schema" });
  for (const [oid, typname] of [
    [77701, "a,b"],
    [77702, "a"],
    [77703, "b"],
  ])
    fixture.queries.pg_type.rows.push({
      oid,
      nspname: "odd.schema",
      typname,
      typtype: "e",
      typrelid: 0,
      typelem: 0,
    });
  for (const [oid, argument_types] of [
    [77704, [77701]],
    [77705, [77702, 77703]],
  ])
    fixture.queries.pg_proc.rows.push({
      oid,
      nspname: "odd.schema",
      proname: "f",
      prokind: "f",
      argument_types,
      prorettype: 23,
    });
  const model = inspect_catalog(fixture);
  const routines = model.nodes.filter(
    (n) => n.schema === "odd.schema" && n.name === "f",
  );
  assert.equal(routines.length, 2);
  assert.equal(new Set(routines.map((n) => n.signature)).size, 2);
  assert.ok(routines.some((n) => n.signature === '"odd.schema"."a,b"'));
  assert.deepEqual(validate(model), []);
});
