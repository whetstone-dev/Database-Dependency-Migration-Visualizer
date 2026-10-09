#!/usr/bin/env node
/** Reject unintended public files and stale curated reports before Pages packaging. */
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, files, sha256, save, verify_built_docs } from "./tooling.mjs";

export function check_site_publication(
  root = ROOT,
  built = join(root, "site/dist"),
) {
  verify_built_docs(root, built);
  const copies = new Map([
    ["docs/README.md", join(root, "README.md")],
    ["docs/SKILL.md", join(root, "SKILL.md")],
    ["favicon.svg", join(root, "site/public/favicon.svg")],
    [".nojekyll", join(root, "site/public/.nojekyll")],
    ["THIRD_PARTY_NOTICES.md", join(root, "site/THIRD_PARTY_NOTICES.md")],
  ]);
  for (const slug of ["ecommerce", "analytics", "high-traffic"])
    for (const name of [
      "report.html",
      "model.dbdep.json",
      "report.md",
      "review.json",
    ])
      copies.set(
        `demos/${slug}/${name}`,
        join(root, "examples/rendered", slug, name),
      );
  for (const path of files(join(root, "site/licenses")))
    copies.set(
      `licenses/${path.slice(join(root, "site/licenses").length + 1).replaceAll("\\", "/")}`,
      path,
    );
  const observed = [];
  function visit(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = prefix + entry.name,
        path = join(directory, entry.name);
      if (entry.isSymbolicLink() || lstatSync(path).isSymbolicLink())
        throw Error("Public build contains a symbolic link");
      if (entry.isDirectory()) {
        visit(path, name + "/");
        continue;
      }
      if (!entry.isFile())
        throw Error("Public build contains a non-regular file");
      if (
        name !== "index.html" &&
        !copies.has(name) &&
        !/^assets\/[A-Za-z0-9_.-]+\.(?:js|css|woff2?)$/.test(name)
      )
        throw Error(
          "Unexpected public file; inspect the local build before publishing",
        );
      const bytes = readFileSync(path);
      if (copies.has(name) && !bytes.equals(readFileSync(copies.get(name))))
        throw Error("Public source copy differs; rebuild before publishing");
      observed.push({ path: name, sha256: sha256(bytes) });
    }
  }
  visit(built);
  for (const name of ["index.html", ...copies.keys()])
    if (!observed.some((file) => file.path === name))
      throw Error("Expected public file is missing");
  if (!observed.some((file) => /^assets\/.*\.js$/.test(file.path)))
    throw Error("Built application JavaScript is missing");
  return {
    valid: true,
    public_demo_files: 12,
    documentation_source_matches: 2,
    private_workspace_directories_published: false,
    files: observed.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    ),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const receipt = check_site_publication();
  const index = process.argv.indexOf("--out");
  if (index >= 0) save(resolve(process.argv[index + 1]), receipt);
  console.log(JSON.stringify(receipt));
}
