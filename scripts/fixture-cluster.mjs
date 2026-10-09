#!/usr/bin/env node
/** Creates its own loopback cluster. Never accepts an external database DSN. */
import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  openSync,
  closeSync,
  readFileSync,
} from "node:fs";
import { join, resolve, delimiter } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import pg from "pg";
import { ROOT, checked_remove, save } from "./tooling.mjs";
import { capture } from "../src/dbdep/catalog.mjs";
import { canonical, digest } from "../src/dbdep/model.mjs";

const args = process.argv.slice(2),
  binIndex = args.indexOf("--pg-bin");
const bin =
  binIndex >= 0
    ? resolve(args[binIndex + 1])
    : process.platform === "win32" &&
        existsSync("C:/Program Files/PostgreSQL/18/bin")
      ? "C:/Program Files/PostgreSQL/18/bin"
      : null;
function binary(name) {
  const filename = name + (process.platform === "win32" ? ".exe" : "");
  const candidates = bin
    ? [join(bin, filename)]
    : (process.env.PATH ?? "").split(delimiter).map((p) => join(p, filename));
  const found = candidates.find(existsSync);
  if (!found)
    throw new Error("PostgreSQL initdb/pg_ctl missing; supply --pg-bin");
  return found;
}
const pgctl = binary("pg_ctl"),
  initdb = binary("initdb");
const base = join(ROOT, "tmp");
mkdirSync(base, { recursive: true });
const directory = mkdtempSync(join(base, "fixture-node-")),
  data = join(directory, "data");
const probe = createServer();
await new Promise((ok, fail) => {
  probe.once("error", fail);
  probe.listen(0, "127.0.0.1", ok);
});
const port = probe.address().port;
await new Promise((ok) => probe.close(ok));
let started = false,
  stopped = true;
function command(exe, argv) {
  const log = openSync(join(directory, "commands.log"), "a");
  try {
    execFileSync(exe, argv, {
      stdio: ["ignore", log, log],
      timeout: 60000,
      windowsHide: true,
    });
  } catch {
    throw new Error(
      "Disposable PostgreSQL setup failed; inspect local PostgreSQL prerequisites",
    );
  } finally {
    closeSync(log);
  }
}
async function with_owner(database, work) {
  const client = new pg.Client({
    host: "127.0.0.1",
    port,
    user: "dbdep_fixture",
    database,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    return await work(client);
  } finally {
    await client.end();
  }
}
try {
  command(initdb, [
    "-D",
    data,
    "-A",
    "trust",
    "-U",
    "dbdep_fixture",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  command(pgctl, [
    "-D",
    data,
    "-l",
    join(directory, "server.log"),
    "-o",
    `-h 127.0.0.1 -p ${port}`,
    "-w",
    "start",
  ]);
  started = true;
  stopped = false;
  const databases = [
    ["dbdep_analytics", ["analytics/schema.sql"]],
    [
      "dbdep_examples",
      [
        "analytics/schema.sql",
        "ecommerce/schema.sql",
        "tricky-identifiers/schema.sql",
      ],
    ],
    ["dbdep_dynamic", ["dynamic-sql-unknown/schema.sql"]],
    ["dbdep_multi", ["multi-schema/schema.sql"]],
    ["dbdep_before", ["diff/before.sql"]],
    ["dbdep_after", ["diff/after.sql"]],
  ];
  await with_owner("postgres", async (client) => {
    for (const [database] of databases)
      await client.query(`CREATE DATABASE "${database}"`);
    await client.query("CREATE ROLE dbdep_readonly LOGIN");
  });
  for (const [database, fixtures] of databases)
    await with_owner(database, async (client) => {
      for (const fixture of fixtures)
        await client.query(
          readFileSync(join(ROOT, "examples", fixture), "utf8"),
        );
    });
  console.log(
    "Executed seven shipped schema/diff fixtures in isolated databases. No migration proposals executed.",
  );
  const readonly = `postgresql://dbdep_readonly@127.0.0.1:${port}/`;
  if (args.includes("--update-fixtures")) {
    const captured = await capture(readonly + "dbdep_analytics"),
      out = join(ROOT, "examples/analytics/catalog.json");
    save(out, canonical(captured));
    save(join(ROOT, "examples/analytics/capture-provenance.json"), {
      server_version_num: captured.queries.server_version.rows[0].version,
      captured_at: captured.captured_at,
      capture_sha256: digest(readFileSync(out)),
      schema_sha256: digest(
        readFileSync(join(ROOT, "examples/analytics/schema.sql")),
      ),
      command:
        "node scripts/fixture-cluster.mjs --pg-bin <PostgreSQL-bin> --update-fixtures",
      capture_role: "dbdep_readonly: LOGIN, no user-table SELECT grants",
      scope: "script-created isolated loopback fixture cluster",
      sql_executed:
        "shipped schema/diff fixtures only, never a migration proposal",
    });
  }
  const result = spawnSync(
    process.execPath,
    ["--test", "tests/node/live.test.mjs"],
    {
      cwd: ROOT,
      env: { ...process.env, DBDEP_TEST_DSN: readonly + "dbdep_examples" },
      stdio: "inherit",
      windowsHide: true,
    },
  );
  process.exitCode = result.status ?? 2;
} finally {
  if (started) {
    command(pgctl, ["-D", data, "-m", "fast", "-w", "stop"]);
    stopped = true;
  }
  if (stopped) checked_remove(directory, base);
}
