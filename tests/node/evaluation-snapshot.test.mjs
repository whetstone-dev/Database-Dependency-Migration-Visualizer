import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, SKILL_PATH, checked_remove } from "../../scripts/tooling.mjs";

test("fresh baseline snapshots honor workspace/ref and cannot replace frozen source", () => {
  mkdirSync(join(ROOT, "tmp"), { recursive: true });
  const directory = mkdtempSync(join(ROOT, "tmp", "baseline-contract-"));
  try {
    writeFileSync(
      join(directory, "source-manifest.json"),
      JSON.stringify({ sources: [], inputs: [] }),
    );
    const run = (tag) =>
      spawnSync(
        process.execPath,
        [
          join(ROOT, "scripts/prepare-baseline.mjs"),
          "--workspace",
          directory,
          "--tag",
          tag,
        ],
        { cwd: ROOT, encoding: "utf8", windowsHide: true },
      );
    const invalid = run("refs/tags/missing-evaluation-tag");
    assert.notEqual(invalid.status, 0);
    assert.equal(existsSync(join(directory, "old-skill-snapshot")), false);
    const valid = run("HEAD");
    assert.equal(valid.status, 0, valid.stderr);
    const before = readFileSync(
      join(directory, "source-manifest.json"),
      "utf8",
    );
    assert.equal(JSON.parse(before).baseline.tag, "HEAD");
    assert.ok(existsSync(join(directory, "old-skill-snapshot", SKILL_PATH)));
    assert.notEqual(run("HEAD").status, 0);
    assert.equal(
      readFileSync(join(directory, "source-manifest.json"), "utf8"),
      before,
    );
  } finally {
    checked_remove(directory, join(ROOT, "tmp"));
  }
});
