import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPreviewServer } from "../../site/scripts/preview.mjs";
import { checked_remove } from "../../scripts/tooling.mjs";

async function preview(work, basePath = "/repo") {
  const parent = tmpdir(),
    root = mkdtempSync(join(parent, "dbdep-static-preview-")),
    built = join(root, "public");
  mkdirSync(join(built, "docs/installation"), { recursive: true });
  writeFileSync(join(built, "index.html"), "Home");
  writeFileSync(join(built, "docs/installation/index.html"), "Installation");
  writeFileSync(join(built, "404.html"), "Missing page");
  const server = createPreviewServer({ built, basePath });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await work({ root, built, url });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    checked_remove(root, parent);
  }
}

test("static preview serves directory indexes and HEAD under the configured prefix", async () =>
  preview(async ({ url }) => {
    const page = await fetch(`${url}/repo/docs/installation/`);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), "Installation");
    assert.match(page.headers.get("content-type"), /^text\/html/);
    const head = await fetch(`${url}/repo/docs/installation/`, {
      method: "HEAD",
    });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.equal(
      head.headers.get("content-length"),
      String(Buffer.byteLength("Installation")),
    );
  }));

test("static preview returns real errors instead of the home page", async () =>
  preview(async ({ url }) => {
    for (const path of [
      "/repo/docs/private/",
      "/docs/installation/",
      "/repo%2f..%2fsecret.txt",
      "/repo/%5c..%5csecret.txt",
    ]) {
      const response = await fetch(url + path);
      assert.equal(response.status, 404);
      assert.equal(await response.text(), "Missing page");
    }
    const response = await fetch(`${url}/repo/`, {
      method: "POST",
      body: "Ignored",
    });
    assert.equal(response.status, 405);
  }));

test("static preview cannot follow a directory link outside the exported tree", async () =>
  preview(async ({ root, built, url }) => {
    const privateDir = join(root, "private");
    mkdirSync(privateDir);
    writeFileSync(join(privateDir, "index.html"), "Synthetic private content");
    symlinkSync(
      privateDir,
      join(built, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const response = await fetch(`${url}/repo/linked/`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Missing page");
  }));
