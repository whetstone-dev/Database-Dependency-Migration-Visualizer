import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checked_remove } from "../../scripts/tooling.mjs";
import * as publication from "../../scripts/check-site-publication.mjs";

function fixture(work) {
  const base = tmpdir(),
    root = mkdtempSync(join(base, "dbdep-publication-")),
    built = join(root, "site/dist");
  const put = (path, text) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  };
  for (const name of ["README.md", "SKILL.md"]) {
    put(join(root, name), "Public documentation");
    put(join(built, "docs", name), "Public documentation");
  }
  put(join(root, "site/public/favicon.svg"), "<svg/>");
  put(join(built, "favicon.svg"), "<svg/>");
  put(join(root, "site/public/.nojekyll"), "");
  put(join(built, ".nojekyll"), "");
  put(join(root, "site/THIRD_PARTY_NOTICES.md"), "Notices");
  put(join(built, "THIRD_PARTY_NOTICES.md"), "Notices");
  put(join(root, "site/licenses/public-LICENSE"), "License");
  put(join(built, "licenses/public-LICENSE"), "License");
  put(
    join(built, "index.html"),
    '<html><script src="./assets/index-123abc.js"></script></html>',
  );
  put(join(built, "assets/index-123abc.js"), "export {};");
  for (const slug of ["ecommerce", "analytics", "high-traffic"])
    for (const name of [
      "report.html",
      "model.dbdep.json",
      "report.md",
      "review.json",
    ]) {
      put(join(root, "examples/rendered", slug, name), "Curated fixture");
      put(join(built, "demos", slug, name), "Curated fixture");
    }
  try {
    work({ root, built, put });
  } finally {
    checked_remove(root, base);
  }
}

test("Pages publication accepts only the curated build and matching source copies", () =>
  fixture(({ root, built }) => {
    assert.equal(typeof publication.check_site_publication, "function");
    assert.equal(
      publication.check_site_publication(root, built).public_demo_files,
      12,
    );
  }));
test("Pages publication rejects an accidentally copied private report", () =>
  fixture(({ root, built, put }) => {
    put(join(built, "private-catalog.json"), "Synthetic private data");
    assert.throws(
      () => publication.check_site_publication(root, built),
      /unexpected public file/i,
    );
  }));
test("Pages publication rejects a replaced demo even if its filename is allowed", () =>
  fixture(({ root, built, put }) => {
    put(join(built, "demos/ecommerce/report.html"), "Unreviewed report");
    assert.throws(
      () => publication.check_site_publication(root, built),
      /source copy differs/i,
    );
  }));
