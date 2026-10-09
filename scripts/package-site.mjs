#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ROOT,
  VERSION,
  files,
  archive,
  save,
  verify_built_docs,
} from "./tooling.mjs";
const site = join(ROOT, "site"),
  built = join(site, "dist");
if (!existsSync(join(built, "index.html")))
  throw new Error("Build the webpage with pnpm build before packaging");
verify_built_docs(ROOT, built);
const payloads = Object.fromEntries(
  files(built).map((p) => [
    relative(built, p).replaceAll("\\", "/"),
    readFileSync(p),
  ]),
);
for (const p of files(join(site, "licenses")))
  payloads[
    `licenses/${relative(join(site, "licenses"), p).replaceAll("\\", "/")}`
  ] = readFileSync(p);
payloads["THIRD_PARTY_NOTICES.md"] = readFileSync(
  join(site, "THIRD_PARTY_NOTICES.md"),
);
payloads["LICENSE"] = readFileSync(join(ROOT, "LICENSE"));
const receipt = {
  ...archive(
    join(ROOT, "dist", `database-dependency-migration-site-${VERSION}.zip`),
    payloads,
  ),
  notices_retained: true,
  publication: "local only",
};
save(join(ROOT, "dist", `v${VERSION}`, "site-package.json"), receipt);
console.log(JSON.stringify(receipt));
