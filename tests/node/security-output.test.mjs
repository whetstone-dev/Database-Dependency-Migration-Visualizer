import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  linkSync,
  symlinkSync,
  statSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, checked_remove } from "../../scripts/tooling.mjs";
import { write, md_safe, md_code, markdown } from "../../src/dbdep/reports.mjs";
import { Builder, validate } from "../../src/dbdep/model.mjs";

function fixture(work) {
  const base = tmpdir(),
    dir = mkdtempSync(join(base, "dbdep-security-output-"));
  try {
    work(dir);
  } finally {
    checked_remove(dir, base);
  }
}
const cli = (...args) =>
  spawnSync(process.execPath, [join(ROOT, "scripts/dbdep.mjs"), ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });

test("regeneration replaces a hardlinked output without modifying its other name", () =>
  fixture((dir) => {
    const victim = join(dir, "source.sql"),
      output = join(dir, "report.md");
    writeFileSync(victim, "PRIVATE SOURCE");
    linkSync(victim, output);
    write(output, "first report");
    assert.equal(readFileSync(victim, "utf8"), "PRIVATE SOURCE");
    assert.equal(readFileSync(output, "utf8"), "first report");
    write(output, "regenerated report");
    assert.equal(readFileSync(output, "utf8"), "regenerated report");
    if (process.platform !== "win32")
      assert.equal(statSync(output).mode & 0o777, 0o600);
  }));

test("output directories refuse precreated symlink or junction redirects", () =>
  fixture((dir) => {
    const victim = join(dir, "elsewhere"),
      output = join(dir, "out");
    mkdirSync(victim);
    symlinkSync(victim, output, "junction");
    assert.throws(
      () => write(join(output, "nested/report.md"), "PRIVATE REPORT"),
      /symbolic link|junction/i,
    );
    assert.equal(existsSync(join(victim, "nested/report.md")), false);
  }));

test("inspect refuses to overwrite its source SQL and leaves the original bytes intact", () =>
  fixture((dir) => {
    const input = join(dir, "schema.sql"),
      sql = "CREATE TABLE t (id int);\n";
    writeFileSync(input, sql);
    const result = cli("inspect", "--ddl", input, "--out", input, "--json");
    assert.equal(result.status, 2, result.stderr);
    assert.equal(readFileSync(input, "utf8"), sql);
  }));

test("report rendering refuses to overwrite its canonical model input", () =>
  fixture((dir) => {
    const model = join(dir, "model.json");
    assert.equal(
      cli(
        "inspect",
        "--ddl",
        join(ROOT, "examples/ecommerce/schema.sql"),
        "--out",
        model,
      ).status,
      0,
    );
    const original = readFileSync(model);
    const result = cli("render", model, "--out", model, "--json");
    assert.equal(result.status, 2, result.stderr);
    assert.deepEqual(readFileSync(model), original);
  }));

test("directory scans protect a source reached through an explicit directory junction", () =>
  fixture((dir) => {
    const schemas = join(dir, "schemas"),
      alias = join(dir, "schema-alias");
    mkdirSync(schemas);
    symlinkSync(schemas, alias, "junction");
    const source = join(schemas, "schema.sql"),
      sql = "CREATE TABLE t(id int);\n";
    writeFileSync(source, sql);
    assert.equal(
      cli("inspect", "--ddl", alias, "--out", source, "--json").status,
      2,
    );
    assert.equal(readFileSync(source, "utf8"), sql);
  }));

test("Markdown source labels cannot create active images, links or formatting", () => {
  assert.equal(
    md_safe("![pixel](https://synthetic.invalid/pixel)"),
    "\\!\\[pixel\\]\\(https://synthetic.invalid/pixel\\)",
  );
  assert.equal(md_safe("**heading** _name_"), "\\*\\*heading\\*\\* \\_name\\_");
});

test("imported snapshot and object IDs remain inert in Markdown inventories", () => {
  const builder = new Builder("18");
  const evidence = builder.evidence(
    "source.sql",
    Buffer.from("CREATE TABLE safe(id int);"),
    0,
    26,
  );
  builder.node("table", "public", "safe", evidence);
  const model = builder.finish();
  model.snapshot.id =
    'x`\n\n<img src="https://synthetic.invalid/snapshot">\n\n`';
  model.nodes[0].id = "![remote](https://synthetic.invalid/node-id)";
  assert.deepEqual(validate(model), []);
  const report = markdown(model);
  assert.ok(report.includes(md_safe(model.nodes[0].id)));
  assert.equal(report.includes("![remote]("), false);
  assert.ok(report.includes(`Snapshot ${md_code(model.snapshot.id)}.`));
});

test("Markdown code spans preserve identifiers and enclose embedded delimiters", () => {
  const builder = new Builder("18");
  builder.node(
    "table",
    "public",
    "safe",
    builder.evidence(
      "source.sql",
      Buffer.from("CREATE TABLE safe(id int);"),
      0,
      26,
    ),
  );
  const model = builder.finish();
  assert.ok(markdown(model).includes(`Snapshot \` ${model.snapshot.id} \`.`));
  const hostile = 'name_``\n<img src="https://synthetic.invalid/pixel">';
  assert.equal(
    md_code(hostile),
    '``` name_`` <img src="https://synthetic.invalid/pixel"> ```',
  );
});
