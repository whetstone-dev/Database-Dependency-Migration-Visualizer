import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { resolve_npm_cli, checked_remove } from "../../scripts/tooling.mjs";

for (const [name, relative] of [
  ["Windows Node distribution", "bin/node_modules/npm/bin/npm-cli.js"],
  [
    "POSIX Node distribution used by setup-node",
    "lib/node_modules/npm/bin/npm-cli.js",
  ],
]) {
  test(`artifact installation finds npm in the ${name}`, () => {
    const base = tmpdir(),
      root = mkdtempSync(join(base, "dbdep-npm-layout-"));
    try {
      const npm = join(root, relative);
      mkdirSync(dirname(npm), { recursive: true });
      writeFileSync(npm, "// synthetic npm layout fixture\n");
      assert.equal(resolve_npm_cli(join(root, "bin/node")), npm);
    } finally {
      checked_remove(root, base);
    }
  });
}

test("missing npm fails before artifact installation with a generic prerequisite error", () => {
  const base = tmpdir(),
    root = mkdtempSync(join(base, "dbdep-npm-layout-"));
  try {
    assert.throws(
      () => resolve_npm_cli(join(root, "bin/node")),
      /^Error: Install Node with npm before running artifact smoke tests$/,
    );
  } finally {
    checked_remove(root, base);
  }
});
