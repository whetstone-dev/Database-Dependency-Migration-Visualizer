import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checked_remove } from "../../scripts/tooling.mjs";
import * as publication from "../../scripts/check-site-publication.mjs";

function fixture(work) {
  const base = tmpdir(),
    root = mkdtempSync(join(base, "dbdep-publication-")),
    built = join(root, "site/out");
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
  const stems = [
    "index",
    "docs",
    "_not-found",
    ...[
      "introduction",
      "installation",
      "quickstart",
      "good-requests",
      "command-reference",
      "confidence",
      "safety-limits",
    ].map((slug) => `docs/${slug}`),
  ];
  for (const stem of stems) {
    const route = stem === "index" ? "" : `${stem}/`;
    put(
      join(root, "site/.next/server/app", `${stem}.html`),
      "<html>Prerendered page</html>",
    );
    put(
      join(root, "site/.next/server/app", `${stem}.rsc`),
      "Prerendered route data",
    );
    put(join(built, route, "index.html"), "<html>Prerendered page</html>");
    put(join(built, route, "index.txt"), "Prerendered route data");
    for (const segment of ["_tree", "_full"]) {
      put(
        join(
          root,
          "site/.next/server/app",
          `${stem}.segments/${segment}.segment.rsc`,
        ),
        "Route segment",
      );
      put(join(built, route, `__next.${segment}.txt`), "Route segment");
    }
  }
  for (const path of ["404.html", "404/index.html"])
    put(join(built, path), "<html>Prerendered page</html>");
  put(
    join(root, "site/.next/server/app/docs.segments/docs/__PAGE__.segment.rsc"),
    "Page segment",
  );
  put(join(built, "docs/__next.docs.__PAGE__.txt"), "Page segment");
  put(join(root, "site/.next/static/chunks/runtime-123abc.js"), "export {};");
  put(join(built, "_next/static/chunks/runtime-123abc.js"), "export {};");
  put(
    join(root, "site/.next/routes-manifest.json"),
    JSON.stringify({ basePath: "" }),
  );
  put(
    join(built, "site-config.json"),
    JSON.stringify({
      format: "dbdep-static-site/1",
      base_path: "",
      next: "16.4.0",
    }),
  );
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

test("Pages publication rejects a changed Next.js bundle", () =>
  fixture(({ root, built, put }) => {
    put(
      join(built, "_next/static/chunks/runtime-123abc.js"),
      "Unreviewed replacement",
    );
    assert.throws(
      () => publication.check_site_publication(root, built),
      /source copy differs/i,
    );
  }));

test("Pages publication rejects private files disguised as route data", () =>
  fixture(({ root, built, put }) => {
    put(
      join(built, "docs/installation/private-catalog.txt"),
      "Synthetic private data",
    );
    assert.throws(
      () => publication.check_site_publication(root, built),
      /unexpected public file/i,
    );
  }));

test("Pages publication rejects mismatched base paths", () =>
  fixture(({ root, built, put }) => {
    put(
      join(built, "site-config.json"),
      JSON.stringify({
        format: "dbdep-static-site/1",
        base_path: "/wrong",
        next: "16.4.0",
      }),
    );
    assert.throws(
      () => publication.check_site_publication(root, built),
      /base path/i,
    );
  }));

test("Pages publication rejects a source map in the runtime directory", () =>
  fixture(({ root, built, put }) => {
    put(
      join(built, "_next/static/chunks/runtime-123abc.js.map"),
      "Source locations",
    );
    assert.throws(
      () => publication.check_site_publication(root, built),
      /unexpected public file/i,
    );
  }));

test("Pages publication rejects a directory link outside the export", () =>
  fixture(({ root, built, put }) => {
    put(join(root, "private/index.html"), "Synthetic private content");
    symlinkSync(
      join(root, "private"),
      join(built, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.throws(
      () => publication.check_site_publication(root, built),
      /symbolic link/i,
    );
  }));
