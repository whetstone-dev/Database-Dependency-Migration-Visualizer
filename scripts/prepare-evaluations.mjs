#!/usr/bin/env node
/** Freeze toolkit and inputs before a creator evaluation; never invent run outputs. */
import {
  readFileSync,
  mkdirSync,
  existsSync,
  writeFileSync,
  symlinkSync,
  copyFileSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { unzipSync } from "fflate";
import { ROOT, VERSION, sha256, save } from "./tooling.mjs";
const argIndex = process.argv.indexOf("--out");
const workspace =
  argIndex < 0
    ? join(
        dirname(ROOT),
        "database-dependency-migration-workspace",
        "iteration-2",
      )
    : resolve(process.argv[argIndex + 1]);
if (existsSync(join(workspace, "source-manifest.json")))
  throw new Error(
    "Evaluation snapshot already exists; use a new iteration directory",
  );
const archive = join(
  ROOT,
  "dist",
  `v${VERSION}`,
  "database-dependency-migration.skill",
);
const members = unzipSync(readFileSync(archive)),
  snapshot = join(workspace, "skill-snapshot"),
  inputs = join(workspace, "inputs");
mkdirSync(snapshot, { recursive: true });
mkdirSync(inputs, { recursive: true });
const sources = [];
for (const [name, bytes] of Object.entries(members)) {
  const local = name.replace(/^database-dependency-migration\//, "");
  if (
    local === name ||
    local.split("/").includes("..") ||
    local.startsWith("/")
  )
    throw new Error("Invalid frozen skill archive member");
  const target = join(snapshot, local);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  sources.push({ path: local, sha256: sha256(bytes), bytes: bytes.length });
}
// Freeze source/resources; share the exact installed, lockfile-pinned dependency store.
symlinkSync(
  join(ROOT, "node_modules"),
  join(snapshot, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);
const evals = JSON.parse(readFileSync(join(ROOT, "evals/evals.json"), "utf8"));
save(join(workspace, "evals.json"), evals);
const copied = new Set();
for (const item of evals.evals) {
  for (const name of item.files) {
    if (copied.has(name)) continue;
    const target = join(inputs, name);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(ROOT, name), target);
    copied.add(name);
  }
  const directory = join(workspace, `eval-${item.id}`);
  mkdirSync(directory, { recursive: true });
  save(join(directory, "eval_metadata.json"), {
    eval_id: item.id,
    eval_name: item.expected_output,
    prompt: item.prompt,
    assertions: item.assertions,
  });
}
save(join(workspace, "source-manifest.json"), {
  created_at: new Date().toISOString(),
  version: VERSION,
  archive_sha256: sha256(readFileSync(archive)),
  sources: sources.sort((a, b) => a.path.localeCompare(b.path)),
  inputs: [...copied]
    .sort()
    .map((p) => ({ path: p, sha256: sha256(readFileSync(join(inputs, p))) })),
  dependencies:
    "Frozen pnpm-lock.yaml; shared exact installed Node dependencies, no mutable toolkit source link",
  runtime: "node",
  configuration:
    "New skill against independent no-skill baseline for continuity with iteration-1. One batched executor per configuration due four concurrency slots; not independent per-case sessions.",
});
console.log(
  JSON.stringify({
    workspace,
    snapshot,
    inputs,
    cases: evals.evals.length,
    sources: sources.length,
  }),
);
