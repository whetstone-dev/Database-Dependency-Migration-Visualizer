import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checked_remove } from "../../scripts/tooling.mjs";
import { normalizeStaticSegments } from "../../site/scripts/normalize-segments.mjs";

function fixture(work) {
  const base = tmpdir(),
    root = mkdtempSync(join(base, "dbdep-segments-"));
  const put = (name, bytes) => {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    return path;
  };
  try {
    work({ root, put });
  } finally {
    checked_remove(root, base);
  }
}
test("Windows segment paths become the exact names requested by the router", () =>
  fixture(({ root, put }) => {
    const source = put(
      "docs/introduction/__next.docs/$d$slug/__PAGE__.txt",
      Buffer.from([0, 255, 42]),
    );
    const target = join(
      root,
      "docs/introduction/__next.docs.$d$slug.__PAGE__.txt",
    );
    put("docs/introduction/__next._tree.txt", "Tree");
    assert.equal(normalizeStaticSegments(root), 1);
    assert.equal(existsSync(source), false);
    assert.deepEqual(readFileSync(target), Buffer.from([0, 255, 42]));
    assert.equal(normalizeStaticSegments(root), 0);
  }));
test("segment normalization rejects a collision before changing any source", () =>
  fixture(({ root, put }) => {
    const source = put("docs/__next.docs/__PAGE__.txt", "Original");
    const target = put("docs/__next.docs.__PAGE__.txt", "Conflicting");
    assert.throws(() => normalizeStaticSegments(root), /collision/i);
    assert.equal(readFileSync(source, "utf8"), "Original");
    assert.equal(readFileSync(target, "utf8"), "Conflicting");
  }));
test("Linux segment paths and unrelated publication inputs remain unchanged", () =>
  fixture(({ root, put }) => {
    const flat = put("docs/__next.docs.__PAGE__.txt", "Segment");
    const report = put("demos/ecommerce/report.html", "Curated report");
    assert.equal(normalizeStaticSegments(root), 0);
    assert.equal(readFileSync(flat, "utf8"), "Segment");
    assert.equal(readFileSync(report, "utf8"), "Curated report");
  }));

test("segment cleanup handles a parent already removed with its child", () =>
  fixture(({ root, put }) => {
    put("docs/__next.docs/nested/__PAGE__.txt", "Child");
    put("docs/__next.docs/__PAGE__.txt", "Parent");
    assert.equal(normalizeStaticSegments(root), 2);
    assert.equal(
      readFileSync(join(root, "docs/__next.docs.nested.__PAGE__.txt"), "utf8"),
      "Child",
    );
    assert.equal(
      readFileSync(join(root, "docs/__next.docs.__PAGE__.txt"), "utf8"),
      "Parent",
    );
  }));
