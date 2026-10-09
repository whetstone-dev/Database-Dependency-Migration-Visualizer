#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { relative, join, resolve } from "node:path";
import { ROOT, VERSION, files, archive, save } from "./tooling.mjs";
const outIndex = process.argv.indexOf("--out");
const out =
  outIndex >= 0
    ? resolve(process.argv[outIndex + 1])
    : join(ROOT, "dist", `v${VERSION}`);
const skill = readFileSync(join(ROOT, "SKILL.md"), "utf8");
if (
  !/^---\r?\n[\s\S]*?\r?\n---/m.test(skill) ||
  !/^name: database-dependency-migration$/m.test(skill) ||
  !/^description: .{20,}$/m.test(skill)
)
  throw new Error("Skill frontmatter is invalid");
const payloads = {};
const add = (name, source) => {
  payloads[`database-dependency-migration/${name}`] = readFileSync(source);
};
for (const name of [
  "SKILL.md",
  "README.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "pnpm-lock.yaml",
])
  add(name, join(ROOT, name));
for (const folder of [
  "src/dbdep",
  "scripts",
  "schemas",
  "assets/viewer",
  "examples",
  "references",
  "agents",
  "templates",
]) {
  for (const p of files(join(ROOT, folder))) {
    const name = relative(ROOT, p).replaceAll("\\", "/");
    if (
      name.endsWith(".py") ||
      name.includes("/__pycache__/") ||
      name.endsWith(".png")
    )
      continue;
    if (folder === "scripts" && !name.endsWith(".mjs")) continue;
    add(name, p);
  }
}
const receipt = {
  ...archive(join(out, "database-dependency-migration.skill"), payloads),
  runtime: "node",
  creator_validation: "run installed creator validation separately",
  excluded: [
    "site",
    "evals",
    "environments",
    "git",
    "screenshots",
    "python sources",
  ],
};
save(join(out, "skill-package.json"), receipt);
console.log(JSON.stringify(receipt));
