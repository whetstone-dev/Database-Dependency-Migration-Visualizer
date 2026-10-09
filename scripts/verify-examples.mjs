#!/usr/bin/env node
import { mkdtempSync, readFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { demo } from "../src/dbdep/cli.mjs";
import { ROOT, checked_remove } from "./tooling.mjs";

const base = join(ROOT, "tmp");
mkdirSync(base, { recursive: true });
const temp = mkdtempSync(join(base, "verify-"));
try {
  demo(temp);
  let count = 0;
  for (const name of ["ecommerce", "analytics", "high-traffic"]) {
    for (const filename of [
      "model.dbdep.json",
      "review.json",
      "report.html",
      "report.md",
      "graph.mmd",
      "graph.dot",
    ]) {
      const expected = join(ROOT, "examples/rendered", name, filename);
      if (
        !readFileSync(expected).equals(readFileSync(join(temp, name, filename)))
      )
        throw new Error(
          `Non-reproducible example: ${relative(ROOT, expected)}`,
        );
      count++;
    }
  }
  console.log(
    JSON.stringify({ reproducible: true, artifacts: count, runtime: "node" }),
  );
} finally {
  checked_remove(temp, base);
}
