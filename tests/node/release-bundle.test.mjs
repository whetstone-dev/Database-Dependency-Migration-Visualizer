import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tooling from "../../scripts/tooling.mjs";

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
      writeFileSync(
        join(source, name),
        "Current UTF-8 documentation: Español\n",
      );
      writeFileSync(
        join(built, "docs", name),
        "Current UTF-8 documentation: Español\n",
      );
    }
    assert.equal(tooling.verify_built_docs(source, built), 2);
    writeFileSync(
      join(source, "SKILL.md"),
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
