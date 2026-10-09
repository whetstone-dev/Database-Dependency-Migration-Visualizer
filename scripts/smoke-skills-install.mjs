#!/usr/bin/env node
/** Exercise the actual pinned skills installer outside the source checkout. */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import {
  ROOT,
  VERSION,
  archive,
  checked_remove,
  files,
  save,
  sha256,
} from "./tooling.mjs";

const SKILLS_VERSION = "1.7.2";
const { values } = parseArgs({
  options: {
    cli: { type: "string" },
    pnpm: { type: "string" },
    out: { type: "string" },
  },
});
const out = resolve(
  values.out ?? join(ROOT, "dist", `v${VERSION}`, "skills-install-smoke.json"),
);
const base = tmpdir();
const temporary = mkdtempSync(join(base, "dbdep-skills-install-"));
const source = join(temporary, "source");
const project = join(temporary, "project");
const away = join(temporary, "away");
const env = {
  ...process.env,
  DO_NOT_TRACK: "1",
  DISABLE_TELEMETRY: "1",
  XDG_STATE_HOME: join(temporary, "skills-state"),
  npm_config_audit: "false",
  npm_config_fund: "false",
};
const receipt = {
  toolkit_version: VERSION,
  skills_version: SKILLS_VERSION,
  scope: "project",
  telemetry_disabled: true,
  outside_checkout: true,
  source: "current Git-tracked and non-ignored worktree files",
};

function run(executable, args, cwd) {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      `Skill installation smoke command failed: ${(result.stderr || result.stdout || result.error?.message || "").slice(-1500)}`,
    );
  return result.stdout;
}

function sensitive(name) {
  const parts = name.toLowerCase().split("/");
  return parts.some(
    (part) =>
      [
        ".git",
        "node_modules",
        "out",
        "tmp",
        "dist",
        ".venv",
        ".eval-workspace",
        ".pgpass",
        "pg_service.conf",
      ].includes(part) ||
      (part.startsWith(".env") && part !== ".env.example") ||
      part.endsWith(".local.json"),
  );
}

try {
  const location = relative(ROOT, temporary);
  if (
    !isAbsolute(location) &&
    location !== ".." &&
    !location.startsWith(`..${sep}`)
  )
    throw new Error("Smoke directory must be outside the source checkout");
  for (const path of [source, project, away]) mkdirSync(path);
  const names = new Set(
    run(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      ROOT,
    )
      .split("\0")
      .filter(Boolean),
  );
  const payloads = {};
  for (const name of [...names].sort()) {
    const from = resolve(ROOT, name);
    const local = relative(ROOT, from);
    if (isAbsolute(local) || local === ".." || local.startsWith(`..${sep}`))
      throw new Error("Source member escapes the checkout");
    if (sensitive(name))
      throw new Error(`Sensitive or generated source member: ${name}`);
    if (!existsSync(from)) continue;
    if (!lstatSync(from).isFile())
      throw new Error(`Source member is not a regular file: ${name}`);
    const data = readFileSync(from);
    const target = join(source, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
    payloads[name] = data;
  }
  receipt.git_head = run("git", ["rev-parse", "HEAD"], ROOT).trim();
  receipt.source_archive = archive(
    join(temporary, "source-snapshot.zip"),
    payloads,
  );

  const requestedCli = values.cli ?? process.env.DBDEP_SKILLS_CLI;
  if (!requestedCli)
    throw new Error(
      `Supply --cli or DBDEP_SKILLS_CLI for the cached skills@${SKILLS_VERSION} bin/cli.mjs`,
    );
  const cli = resolve(requestedCli);
  const cliManifest = JSON.parse(
    readFileSync(join(dirname(cli), "..", "package.json"), "utf8"),
  );
  if (cliManifest.name !== "skills" || cliManifest.version !== SKILLS_VERSION)
    throw new Error(`Use the cached skills@${SKILLS_VERSION} CLI`);
  const install = (args) => run(process.execPath, [cli, ...args], project);
  if (install(["--version"]).trim() !== SKILLS_VERSION)
    throw new Error(
      "Cached skills CLI version differs from the pinned version",
    );
  install(["add", source, "--agent", "codex", "--copy", "--yes", "--json"]);
  const installed = join(
    project,
    ".agents/skills/database-dependency-migration",
  );
  const copied = files(installed).map((path) =>
    relative(installed, path).replaceAll("\\", "/"),
  );
  const missing = Object.keys(payloads).filter(
    (name) => !copied.includes(name),
  );
  const changed = copied.filter(
    (name) =>
      !payloads[name] ||
      sha256(readFileSync(join(installed, name))) !== sha256(payloads[name]),
  );
  receipt.installed_contents = {
    members: copied.length,
    missing,
    changed,
    sensitive: copied.filter(sensitive),
  };
  if (
    missing.length ||
    changed.length ||
    receipt.installed_contents.sensitive.length
  )
    throw new Error(
      `Installer changed source contents: ${JSON.stringify(receipt.installed_contents)}`,
    );
  const installedManifest = JSON.parse(
    readFileSync(join(installed, "package.json"), "utf8"),
  );
  if (installedManifest.version !== VERSION)
    throw new Error("Installed toolkit version differs");
  const pnpm = values.pnpm ?? process.env.npm_execpath;
  if (!pnpm || !/pnpm/i.test(pnpm) || !existsSync(pnpm))
    throw new Error(
      "Run through pnpm, or supply --pnpm with its executable or JavaScript CLI",
    );
  const executable = /\.(?:c?js|mjs)$/i.test(pnpm) ? process.execPath : pnpm;
  const prefix = executable === process.execPath ? [pnpm] : [];
  receipt.pnpm_version = run(
    executable,
    [...prefix, "--version"],
    installed,
  ).trim();
  if (installedManifest.packageManager !== `pnpm@${receipt.pnpm_version}`)
    throw new Error("Use the pnpm version pinned by the installed skill");
  run(
    executable,
    [
      ...prefix,
      "install",
      "--prod",
      "--frozen-lockfile",
      "--ignore-workspace",
      "--ignore-scripts",
      "--store-dir",
      join(temporary, "pnpm-store"),
    ],
    installed,
  );
  const entry = join(installed, "scripts/dbdep.mjs");
  const doctor = JSON.parse(
    run(process.execPath, [entry, "doctor", "--json"], away),
  );
  if (!doctor.ready || doctor.version !== VERSION || doctor.migration_execution)
    throw new Error("Installed toolkit doctor failed");
  const demos = join(away, "demos");
  const generated = JSON.parse(
    run(process.execPath, [entry, "demo", demos, "--json"], away),
  );
  const validations = [];
  for (const name of ["ecommerce", "analytics", "high-traffic"]) {
    const validation = JSON.parse(
      run(
        process.execPath,
        [
          entry,
          "validate",
          join(demos, name, "model.dbdep.json"),
          "--strict",
          "--json",
        ],
        away,
      ),
    );
    if (
      !generated[name] ||
      !validation.valid ||
      !existsSync(join(demos, name, "report.html"))
    )
      throw new Error(`Installed demo failed: ${name}`);
    validations.push(name);
  }
  receipt.doctor = {
    ready: true,
    version: doctor.version,
    migration_execution: false,
  };
  receipt.demo_models_strictly_valid = validations;
  receipt.production_install =
    "pnpm frozen lockfile, ignore-workspace, ignore-scripts";
} catch (error) {
  receipt.error = error.message;
  throw error;
} finally {
  checked_remove(temporary, base);
  receipt.temporary_directory_removed = true;
  save(out, receipt);
}
console.log(JSON.stringify(receipt, null, 2));
