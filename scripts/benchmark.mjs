#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { platform } from "node:os";
import { join, resolve } from "node:path";
import { Builder, validate } from "../src/dbdep/model.mjs";
import { impact } from "../src/dbdep/graph.mjs";
import { render } from "../src/dbdep/reports.mjs";
import { ROOT, save } from "./tooling.mjs";
const outIndex = process.argv.indexOf("--out");
const out =
  outIndex >= 0
    ? resolve(process.argv[outIndex + 1])
    : join(ROOT, "out/performance.json");
const measurements = [];
for (const count of [100, 1000, 5000]) {
  const start = performance.now(),
    b = new Builder(),
    ev = b.evidence("synthetic-benchmark.sql", Buffer.alloc(0));
  const root = b.node("table", "public", "t00000", ev);
  for (let i = 1; i < count; i++)
    b.edge(
      b.node("table", "public", `t${String(i).padStart(5, "0")}`, ev),
      root,
      "query_reference",
      ev,
    );
  const m = b.finish(),
    built = performance.now();
  if (validate(m).length) throw new Error("Synthetic graph validation failed");
  const valid = performance.now();
  if (impact(m, "public.t00000").affected.length !== count - 1)
    throw new Error("Synthetic impact traversal failed");
  const traversed = performance.now(),
    html = render(m),
    end = performance.now();
  measurements.push({
    nodes: count,
    edges: count - 1,
    build_seconds: (built - start) / 1000,
    validation_seconds: (valid - built) / 1000,
    impact_seconds: (traversed - valid) / 1000,
    render_seconds: (end - traversed) / 1000,
    html_bytes: Buffer.byteLength(html),
    browser_visible_cap: 350,
  });
}
const report = {
  node: process.versions.node,
  platform: platform(),
  measurements,
  scope:
    "Synthetic star graph CPU timings. No SQL, production performance or browser frame-rate guarantee. Historical Python linear-graph timings are not directly comparable.",
};
save(out, report);
console.log(JSON.stringify(report, null, 2));
