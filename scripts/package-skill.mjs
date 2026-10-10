#!/usr/bin/env node
import { join, resolve } from "node:path";
import { ROOT, VERSION, archive, save } from "./tooling.mjs";
import { check_skill, skill_payloads } from "./skill-distribution.mjs";
const outIndex = process.argv.indexOf("--out");
const out =
  outIndex >= 0
    ? resolve(process.argv[outIndex + 1])
    : join(ROOT, "dist", `v${VERSION}`);
check_skill();
const payloads = Object.fromEntries(
  Object.entries(skill_payloads()).map(([name, data]) => [
    `database-dependency-migration/${name}`,
    data,
  ]),
);
const receipt = {
  ...archive(join(out, "database-dependency-migration.skill"), payloads),
  runtime: "none",
  optional_toolkit_runtime: "node",
  creator_validation: "run installed creator validation separately",
  excluded: [
    "site",
    "evals",
    "tests",
    "development scripts",
    "environments",
    "git",
    "screenshots",
    "python sources",
  ],
};
save(join(out, "skill-package.json"), receipt);
console.log(JSON.stringify(receipt));
