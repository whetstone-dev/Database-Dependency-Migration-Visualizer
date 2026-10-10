import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import * as tooling from "../../scripts/tooling.mjs";

test("the skill archive declares no required runtime and carries source-review references", () => {
  const directory = mkdtempSync(join(tmpdir(), "dbdep-source-skill-"));
  try {
    const result = spawnSync(
      process.execPath,
      [join(tooling.ROOT, "scripts/package-skill.mjs"), "--out", directory],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(
      readFileSync(join(directory, "skill-package.json"), "utf8"),
    );
    assert.equal(receipt.runtime, "none");
    assert.equal(receipt.optional_toolkit_runtime, "node");
    const archive = unzipSync(
      readFileSync(join(directory, "database-dependency-migration.skill")),
    );
    const skillRoot = "database-dependency-migration/";
    const distribution = join(
      tooling.ROOT,
      "skills/database-dependency-migration",
    );
    const members = tooling
      .files(distribution)
      .map((path) => path.slice(distribution.length + 1).replaceAll("\\", "/"));
    assert.deepEqual(
      Object.keys(archive).sort(),
      members.map((name) => skillRoot + name).sort(),
    );
    for (const name of members)
      assert.deepEqual(
        Buffer.from(archive[skillRoot + name]),
        readFileSync(join(distribution, name)),
        `Archive differs from Skills CLI payload: ${name}`,
      );
    for (const name of [
      "SKILL.md",
      "references/source-analysis.md",
      "references/toolkit.md",
      "templates/review-report.md",
      "docs/roadmap.md",
    ])
      assert.ok(
        archive[skillRoot + name],
        `Missing packaged resource: ${name}`,
      );
    assert.ok(
      !Object.keys(archive).some((name) => name.includes("/node_modules/")),
    );
    assert.ok(
      archive[skillRoot + "scripts/dbdep.mjs"],
      "Optional toolkit must remain available",
    );
  } finally {
    tooling.checked_remove(directory, tmpdir());
  }
});

test("website release rejects documentation copied before the final source changes", () => {
  assert.equal(
    typeof tooling.verify_built_docs,
    "function",
    "Release source-copy validation is missing",
  );
  const directory = mkdtempSync(join(tmpdir(), "dbdep-release-docs-"));
  try {
    const source = join(directory, "source"),
      built = join(directory, "built");
    mkdirSync(source);
    mkdirSync(join(built, "docs"), { recursive: true });
    for (const name of ["README.md", "SKILL.md"]) {
      const sourcePath = join(
        source,
        name === "SKILL.md" ? tooling.SKILL_PATH : name,
      );
      mkdirSync(dirname(sourcePath), { recursive: true });
      writeFileSync(sourcePath, "Current UTF-8 documentation: Español\n");
      writeFileSync(
        join(built, "docs", name),
        "Current UTF-8 documentation: Español\n",
      );
    }
    assert.equal(tooling.verify_built_docs(source, built), 2);
    writeFileSync(
      join(source, tooling.SKILL_PATH),
      "Updated provenance instructions\n",
    );
    assert.throws(
      () => tooling.verify_built_docs(source, built),
      /stale.*pnpm build/i,
    );
    writeFileSync(
      join(built, "docs/SKILL.md"),
      "Updated provenance instructions\n",
    );
    assert.equal(tooling.verify_built_docs(source, built), 2);
  } finally {
    tooling.checked_remove(directory, tmpdir());
  }
});
