import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, relative } from "node:path";
import { ROOT, files, checked_remove } from "../../scripts/tooling.mjs";
import { check_skill, sync_skill } from "../../scripts/skill-distribution.mjs";

const distribution = join(ROOT, "skills/database-dependency-migration");

function source_fixture(work) {
  const root = mkdtempSync(join(tmpdir(), "dbdep-skill-sync-"));
  try {
    for (const name of [
      "package.json",
      "pnpm-lock.yaml",
      "LICENSE",
      "SECURITY.md",
      "THIRD_PARTY_NOTICES.md",
      "docs/roadmap.md",
      "scripts/dbdep.mjs",
      "src/dbdep",
      "schemas",
      "assets/viewer",
      "examples",
      "references",
      "agents",
      "templates",
      "skills/database-dependency-migration",
    ]) {
      const target = join(root, name);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(ROOT, name), target, { recursive: true });
    }
    work(root);
  } finally {
    checked_remove(root, tmpdir());
  }
}

test("source changes must be synced before the distribution can pass verification", () =>
  source_fixture((root) => {
    check_skill(root);
    const source = join(root, "references/source-analysis.md");
    writeFileSync(
      source,
      readFileSync(source, "utf8") + "\nAdditional source guidance.\n",
    );
    assert.throws(() => check_skill(root), /stale/);
    sync_skill(root);
    check_skill(root);
    assert.deepEqual(
      readFileSync(
        join(
          root,
          "skills/database-dependency-migration/references/source-analysis.md",
        ),
      ),
      readFileSync(source),
    );
  }));

test("unexpected files fail verification and synchronization preserves them for review", () =>
  source_fixture((root) => {
    const extra = join(
      root,
      "skills/database-dependency-migration/private-report.json",
    );

    writeFileSync(extra, "Synthetic private report\n");
    assert.throws(() => check_skill(root), /unexpected/);
    assert.throws(() => sync_skill(root), /unexpected/);
    assert.equal(readFileSync(extra, "utf8"), "Synthetic private report\n");
  }));

test("unexpected directory links cannot bypass distribution checks or synchronization", () =>
  source_fixture((root) => {
    const outside = join(root, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "private.txt"), "Synthetic private content\n");
    symlinkSync(
      outside,
      join(root, "skills/database-dependency-migration/unexpected-link"),
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.throws(() => check_skill(root), /regular files/);
    assert.throws(() => sync_skill(root), /regular files/);
    assert.equal(
      readFileSync(join(outside, "private.txt"), "utf8"),
      "Synthetic private content\n",
    );
  }));

test("Skills CLI discovers a self-contained skill without website or development files", () => {
  assert.ok(
    existsSync(join(distribution, "SKILL.md")),
    "Dedicated skill entry point is missing",
  );
  assert.equal(
    existsSync(join(ROOT, "SKILL.md")),
    false,
    "Root entry point would install the entire repository",
  );
  const members = files(distribution).map((path) =>
    relative(distribution, path).replaceAll("\\", "/"),
  );
  for (const name of [
    "README.md",
    "references/source-analysis.md",
    "references/toolkit.md",
    "templates/review-report.md",
    "agents/openai.yaml",
    "scripts/dbdep.mjs",
    "src/dbdep/engine.mjs",
    "schemas/dbdep.schema.json",
    "assets/viewer/viewer.js",
    "examples/high-traffic/workload-profile.json",
    "package.json",
    "pnpm-lock.yaml",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
  ]) {
    assert.ok(members.includes(name), `Missing installed resource: ${name}`);
  }
  assert.ok(
    !members.some((name) =>
      /^(site|evals|tests|\.github|node_modules)\//.test(name),
    ),
    "Developer files must stay outside the skill",
  );
  assert.deepEqual(
    members.filter((name) => name.startsWith("scripts/")),
    ["scripts/dbdep.mjs"],
  );
});

test("all relative Markdown links in the distributable skill resolve inside its directory", () => {
  assert.ok(existsSync(distribution), "Dedicated skill directory is missing");
  for (const path of files(distribution).filter((path) =>
    path.endsWith(".md"),
  )) {
    const markdown = readFileSync(path, "utf8");
    for (const [, link] of markdown.matchAll(/\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link)) continue;
      const target = resolve(dirname(path), link.split("#")[0]);
      assert.ok(
        !relative(distribution, target).startsWith(".."),
        `Link escapes distribution: ${path}: ${link}`,
      );
      assert.ok(existsSync(target), `Broken installed link: ${path}: ${link}`);
    }
  }
});
