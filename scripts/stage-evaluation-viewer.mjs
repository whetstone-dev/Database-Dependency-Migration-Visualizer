#!/usr/bin/env node
/** Stage unchanged runs for creator discovery without recursively scanning frozen sources. */
import {
  readFileSync,
  existsSync,
  cpSync,
  copyFileSync,
  mkdirSync,
} from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { ROOT, files, sha256, save } from "./tooling.mjs";
const index = process.argv.indexOf("--workspace");
const workspace =
  index < 0
    ? join(
        dirname(ROOT),
        "database-dependency-migration-workspace",
        "iteration-2",
      )
    : resolve(process.argv[index + 1]);
const stage = join(workspace, "viewer-stage");
if (existsSync(stage))
  throw new Error("Viewer stage exists; retain original evaluation evidence");
mkdirSync(stage);
const manifest = [];
for (let id = 1; id <= 8; id++) {
  const source = join(workspace, `eval-${id}`);
  const target = join(stage, `eval-${id}`);
  cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
  for (const configuration of ["new_skill", "old_skill"]) {
    const run = join(target, configuration, "run-1");
    if (!existsSync(join(run, "grading.json")))
      throw new Error("Missing actual creator grade");
    // The installed viewer looks only at run-1/ and its immediate parent for metadata.
    copyFileSync(
      join(source, "eval_metadata.json"),
      join(run, "eval_metadata.json"),
    );
  }
  for (const file of files(source)) {
    const rel = relative(source, file);
    const original = readFileSync(file),
      copied = readFileSync(join(target, rel));
    if (sha256(original) !== sha256(copied))
      throw new Error("Staged evaluation output bytes differ");
    manifest.push({
      path: relative(workspace, file).replaceAll("\\", "/"),
      sha256: sha256(original),
    });
  }
}
save(join(workspace, "viewer-stage-manifest.json"), {
  scope:
    "Unchanged copies of the sixteen actual current runs; metadata duplicated for installed creator viewer discovery. Frozen source snapshots excluded from viewer input only.",
  source_workspace: workspace.replaceAll("\\", "/"),
  stage: stage.replaceAll("\\", "/"),
  runs: 16,
  files: manifest,
});
console.log(
  JSON.stringify({ stage, runs: 16, byte_verified_files: manifest.length }),
);
