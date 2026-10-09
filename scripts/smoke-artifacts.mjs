#!/usr/bin/env node
/** Install the npm package and unpacked skill outside the checkout using Node only. */
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join, relative, isAbsolute, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import {
  ROOT,
  VERSION,
  checked_remove,
  save,
  resolve_npm_cli,
} from "./tooling.mjs";
const value = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i < 0 ? fallback : resolve(process.argv[i + 1]);
};
const tarball = value(
  "--package",
  join(
    ROOT,
    "dist",
    `v${VERSION}`,
    `database-dependency-migration-${VERSION}.tgz`,
  ),
);
const skill = value(
  "--skill",
  join(ROOT, "dist", `v${VERSION}`, "database-dependency-migration.skill"),
);
const out = value(
  "--out",
  join(ROOT, "dist", `v${VERSION}`, "artifact-smoke.json"),
);
const npmCli = resolve_npm_cli();
const base = tmpdir(),
  root = mkdtempSync(join(base, "dbdep-node-smoke-"));
function run(executable, args, cwd) {
  const result = spawnSync(executable, args, {
    cwd,
    env: { ...process.env, PYTHONPATH: "" },
    encoding: "utf8",
    timeout: 180000,
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      `Node artifact smoke command failed: ${(result.stderr || result.error?.message || "").slice(-1500)}`,
    );
  return result.stdout;
}
function check(entry, cwd, destination) {
  const doctor = JSON.parse(
    run(process.execPath, [entry, "doctor", "--json"], cwd),
  );
  if (!doctor.ready || doctor.migration_execution || doctor.version !== VERSION)
    throw new Error("Packaged toolkit is not ready");
  run(process.execPath, [entry, "demo", destination, "--json"], cwd);
  for (const name of ["ecommerce", "analytics", "high-traffic"]) {
    const result = JSON.parse(
      run(
        process.execPath,
        [
          entry,
          "validate",
          join(destination, name, "model.dbdep.json"),
          "--strict",
          "--json",
        ],
        cwd,
      ),
    );
    if (
      !result.valid ||
      !existsSync(join(cwd, destination, name, "report.html"))
    )
      throw new Error("Packaged demo validation failed");
  }
  return {
    doctor: true,
    version: doctor.version,
    demo_models_valid: 3,
    bundled_resources: "passed",
  };
}
try {
  const installed = join(root, "installed"),
    away = join(root, "away");
  mkdirSync(installed);
  mkdirSync(away);
  save(join(installed, "package.json"), { private: true });
  run(
    process.execPath,
    [
      npmCli,
      "install",
      "--prefix",
      installed,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    away,
  );
  const receipt = {
    package: tarball,
    outside_checkout: true,
    fresh_environment: true,
    node_only: true,
    npm: check(
      join(
        installed,
        "node_modules/database-dependency-migration/scripts/dbdep.mjs",
      ),
      away,
      "npm-demos",
    ),
  };
  const unpacked = join(root, "skill");
  mkdirSync(unpacked);
  const members = unzipSync(readFileSync(skill));
  for (const [name, data] of Object.entries(members)) {
    const target = resolve(unpacked, name),
      rel = relative(unpacked, target);
    if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
      throw new Error("Skill archive path escapes extraction root");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
  const skillRoot = join(unpacked, "database-dependency-migration");
  const pnpm = process.env.npm_execpath;
  if (pnpm && existsSync(pnpm) && /pnpm/i.test(pnpm)) {
    const executable = /\.(?:c?js|mjs)$/i.test(pnpm) ? process.execPath : pnpm;
    const prefix = executable === process.execPath ? [pnpm] : [];
    run(
      executable,
      [
        ...prefix,
        "install",
        "--prod",
        "--frozen-lockfile",
        "--ignore-scripts",
        "--ignore-workspace",
      ],
      skillRoot,
    );
    receipt.skill_install = "pnpm frozen production lockfile";
  } else {
    run(
      process.execPath,
      [
        npmCli,
        "install",
        "--prefix",
        skillRoot,
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
      ],
      away,
    );
    receipt.skill_install =
      "npm pinned direct dependencies; use pnpm run smoke:artifacts for frozen transitive verification";
  }
  receipt.skill = check(
    join(skillRoot, "scripts/dbdep.mjs"),
    away,
    "skill-demos",
  );
  receipt.skill.artifact = skill;
  save(out, receipt);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  checked_remove(root, base);
}
