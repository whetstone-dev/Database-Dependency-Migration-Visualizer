#!/usr/bin/env node
/** Freeze the previous tagged skill for creator improvement comparisons. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, isAbsolute, sep, resolve } from "node:path";
import { parseArgs } from "node:util";
import { unzipSync } from "fflate";
import { ROOT, files, save, sha256 } from "./tooling.mjs";
const { values } = parseArgs({
  options: {
    workspace: { type: "string" },
    tag: { type: "string", default: "v0.2.0" },
  },
});
const tag = values.tag;
if (tag.startsWith("-") || tag.includes("\0"))
  throw new Error("Invalid baseline ref");
const workspace = values.workspace
  ? resolve(values.workspace)
  : join(
      dirname(ROOT),
      "database-dependency-migration-workspace",
      "iteration-2",
    );
const baseline = join(workspace, "old-skill-snapshot");
if (existsSync(baseline))
  throw new Error(
    "Baseline snapshot already exists; do not replace frozen source",
  );
if (
  files(workspace).some((p) =>
    /\/(?:outputs|run-1)\//.test(p.replaceAll("\\", "/")),
  )
)
  throw new Error("Evaluation has begun; freeze baselines in a new iteration");
const archived = spawnSync("git", ["archive", "--format=zip", tag], {
  cwd: ROOT,
  windowsHide: true,
  maxBuffer: 30 * 1024 * 1024,
});
if (archived.status !== 0)
  throw new Error("Cannot freeze the previous tagged skill");
mkdirSync(baseline, { recursive: true });
for (const [name, bytes] of Object.entries(unzipSync(archived.stdout))) {
  if (name.endsWith("/")) continue;
  const target = join(baseline, name),
    rel = relative(baseline, target);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error("Unsafe baseline archive member");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}
const manifest = JSON.parse(
  readFileSync(join(workspace, "source-manifest.json"), "utf8"),
);
manifest.configuration =
  "new_skill versus previous tagged old_skill. One executor completes eight cases per configuration due concurrency limits; not independent per-case trials.";
manifest.baseline = {
  tag,
  archive_sha256: sha256(archived.stdout),
  runtime: existsSync(join(baseline, "src/dbdep/engine.py"))
    ? "historical Python toolkit; not shipped or used by new Node runtime"
    : "Node.js toolkit snapshot",
  sources: files(baseline).map((p) => ({
    path: relative(baseline, p).replaceAll("\\", "/"),
    sha256: sha256(readFileSync(p)),
  })),
};
save(join(workspace, "source-manifest.json"), manifest);
console.log(
  JSON.stringify({
    workspace,
    baseline,
    new_snapshot: join(workspace, "skill-snapshot"),
    baseline_tag: tag,
  }),
);
