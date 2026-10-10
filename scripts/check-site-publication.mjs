#!/usr/bin/env node
/** Reject unintended public files and stale curated reports before Pages packaging. */
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  SKILL_PATH,
  files,
  sha256,
  save,
  verify_built_docs,
} from "./tooling.mjs";

export function check_site_publication(
  root = ROOT,
  built = join(root, "site/out"),
) {
  verify_built_docs(root, built);
  const copies = new Map([
    ["docs/README.md", join(root, "README.md")],
    ["docs/SKILL.md", join(root, SKILL_PATH)],
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
  const compiled = join(root, "site/.next");
  const config = JSON.parse(
    readFileSync(join(built, "site-config.json"), "utf8"),
  );
  const manifest = JSON.parse(
    readFileSync(join(compiled, "routes-manifest.json"), "utf8"),
  );
  if (
    config.format !== "dbdep-static-site/1" ||
    config.next !== "16.4.0" ||
    config.base_path !== manifest.basePath ||
    typeof config.base_path !== "string" ||
    (config.base_path &&
      !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(config.base_path)) ||
    Object.keys(config).sort().join(",") !== "base_path,format,next"
  )
    throw Error(
      "Static export base path or metadata differs from the reviewed build",
    );
  copies.set("site-config.json", null);
  // Compare exported route bodies with the compiler's private artifacts. Only
  // deliberately published routes can contribute HTML and RSC payloads.
  const topics = [
    "introduction",
    "installation",
    "quickstart",
    "good-requests",
    "command-reference",
    "confidence",
    "safety-limits",
  ];
  const stems = [
    "index",
    "docs",
    "_not-found",
    ...topics.map((topic) => `docs/${topic}`),
  ];
  for (const stem of stems) {
    const prefix = stem === "index" ? "" : `${stem}/`;
    copies.set(
      `${prefix}index.html`,
      join(compiled, "server/app", `${stem}.html`),
    );
    copies.set(
      `${prefix}index.txt`,
      join(compiled, "server/app", `${stem}.rsc`),
    );
    const segments = join(compiled, "server/app", `${stem}.segments`);
    for (const path of files(segments)) {
      const name = relative(segments, path).replaceAll("\\", "/");
      if (!/^(?:[A-Za-z0-9_.$-]+\/)*[A-Za-z0-9_.$-]+\.segment\.rsc$/.test(name))
        throw Error("Unexpected compiled route segment");
      copies.set(
        `${prefix}__next.${name.replace(/\.segment\.rsc$/, ".txt").replaceAll("/", ".")}`,
        path,
      );
    }
  }
  for (const name of ["404.html", "404/index.html"])
    copies.set(name, join(compiled, "server/app/_not-found.html"));
  const staticRoot = join(compiled, "static");
  for (const path of files(staticRoot)) {
    const name = relative(staticRoot, path).replaceAll("\\", "/");
    if (
      !/^(?:chunks\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:js|css)|media\/[A-Za-z0-9_.-]+\.woff2?|[A-Za-z0-9_-]+\/_(?:ssgManifest|clientMiddlewareManifest|buildManifest)\.js)$/.test(
        name,
      )
    )
      throw Error(
        "Unexpected compiled public asset; source maps are not published",
      );
    copies.set(`_next/static/${name}`, path);
  }
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
      if (!copies.has(name))
        throw Error(
          "Unexpected public file; inspect the local build before publishing",
        );
      const bytes = readFileSync(path);
      if (copies.get(name) && !bytes.equals(readFileSync(copies.get(name))))
        throw Error("Public source copy differs; rebuild before publishing");
      observed.push({ path: name, sha256: sha256(bytes) });
    }
  }
  visit(built);
  for (const name of ["index.html", ...copies.keys()])
    if (!observed.some((file) => file.path === name))
      throw Error("Expected public file is missing");
  if (
    !observed.some((file) => /^_next\/static\/chunks\/.*\.js$/.test(file.path))
  )
    throw Error("Built application JavaScript is missing");
  return {
    valid: true,
    public_demo_files: 12,
    documentation_source_matches: 2,
    static_content_routes: 9,
    base_path: config.base_path,
    compiled_export_bytes_match: true,
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
