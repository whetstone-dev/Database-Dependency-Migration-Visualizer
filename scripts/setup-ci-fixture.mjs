#!/usr/bin/env node
/** CI-only schema fixture setup, separate from the read-only discovery engine. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { connection_config } from "../src/dbdep/catalog.mjs";
import { ROOT } from "./tooling.mjs";
if (!process.env.CI || !process.env.DBDEP_FIXTURE_OWNER_DSN)
  throw new Error("Requires CI and an explicitly isolated fixture owner DSN");
const config = connection_config(process.env.DBDEP_FIXTURE_OWNER_DSN);
delete config.options;
const client = new pg.Client(config);
try {
  await client.connect();
  for (const fixture of [
    "analytics/schema.sql",
    "ecommerce/schema.sql",
    "tricky-identifiers/schema.sql",
  ])
    await client.query(readFileSync(join(ROOT, "examples", fixture), "utf8"));
  await client.query("CREATE ROLE dbdep_readonly LOGIN");
} finally {
  await client.end();
}
