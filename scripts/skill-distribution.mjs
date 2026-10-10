import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, posix } from "node:path";
import { ROOT, files } from "./tooling.mjs";

export const SKILL_DIRECTORY = "skills/database-dependency-migration";
const repository =
  "https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer/blob/main/";

export function skill_payloads(root = ROOT) {
  const payloads = {};
  const add = (name, source) => {
    payloads[name] = readFileSync(source);
  };
  for (const name of ["SKILL.md", "README.md"])
    add(name, join(root, SKILL_DIRECTORY, name));
  const skill = payloads["SKILL.md"].toString("utf8");
  if (
    !/^---\r?\n[\s\S]*?\r?\n---/m.test(skill) ||
    !/^name: database-dependency-migration$/m.test(skill) ||
    !/^description: .{20,}$/m.test(skill)
  )
    throw new Error("Skill frontmatter is invalid");
  for (const name of [
    "LICENSE",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "pnpm-lock.yaml",
    "docs/roadmap.md",
    "scripts/dbdep.mjs",
  ])
    add(name, join(root, name));
  for (const folder of [
    "src/dbdep",
    "schemas",
    "assets/viewer",
    "examples",
    "references",
    "agents",
    "templates",
  ])
    for (const source of files(join(root, folder))) {
      const name = relative(root, source).replaceAll("\\", "/");
      if (
        name.endsWith(".png") ||
        name.endsWith(".py") ||
        name.includes("/__pycache__/")
      )
        continue;
      add(name, source);
    }
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  payloads["package.json"] = Buffer.from(
    JSON.stringify(
      {
        ...manifest,
        scripts: {
          dbdep: "node scripts/dbdep.mjs",
          demo: "node scripts/dbdep.mjs demo out/demo --json",
        },
        files: [
          "src/dbdep/*.mjs",
          "scripts/dbdep.mjs",
          "schemas",
          "assets/viewer",
          "examples",
          "references",
          "SKILL.md",
          "agents",
          "templates",
          "README.md",
          "CONTRIBUTING.md",
          "docs/roadmap.md",
          "pnpm-lock.yaml",
          "LICENSE",
          "SECURITY.md",
          "THIRD_PARTY_NOTICES.md",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  payloads["CONTRIBUTING.md"] = Buffer.from(
    "# Contributing\n\nThis directory contains the installed skill and optional toolkit. Development takes place in the full repository. Read the [contributing guide](" +
      repository +
      "CONTRIBUTING.md) for workspace setup, tests and release instructions.\n",
  );
  // Documents about unbundled development resources link to the full repository.
  for (const [name, data] of Object.entries(payloads)) {
    if (!name.endsWith(".md")) continue;
    payloads[name] = Buffer.from(
      data.toString("utf8").replace(/\]\(([^)\s]+)\)/g, (match, link) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link)) return match;
        const [path, anchor] = link.split("#");
        const target = posix.normalize(posix.join(posix.dirname(name), path));
        if (payloads[target]) return match;
        return "](" + repository + target + (anchor ? "#" + anchor : "") + ")";
      }),
    );
  }
  return payloads;
}

function verify_regular_paths(root, names) {
  for (const name of ["", ...names]) {
    let path = root;
    for (const component of (SKILL_DIRECTORY + "/" + name).split("/")) {
      path = join(path, component);
      if (existsSync(path) && lstatSync(path).isSymbolicLink())
        throw new Error(
          "Skill distribution must contain regular files and directories",
        );
    }
  }
}

function distribution_files(root) {
  verify_regular_paths(root, []);
  const walk = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isSymbolicLink())
        throw new Error(
          "Skill distribution must contain regular files and directories",
        );
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : [];
    });
  return walk(join(root, SKILL_DIRECTORY));
}

export function check_skill(root = ROOT) {
  const payloads = skill_payloads(root);
  const directory = join(root, SKILL_DIRECTORY);
  const names = distribution_files(root).map((path) =>
    relative(directory, path).replaceAll("\\", "/"),
  );
  verify_regular_paths(root, [...Object.keys(payloads), ...names]);
  const stale = Object.keys(payloads).filter(
    (name) =>
      !existsSync(join(directory, name)) ||
      !payloads[name].equals(readFileSync(join(directory, name))),
  );
  const unexpected = names.filter((name) => !payloads[name]);
  if (stale.length || unexpected.length)
    throw new Error(
      "Skill distribution is stale; run pnpm sync:skill. " +
        JSON.stringify({ stale, unexpected }),
    );
  return {
    directory: SKILL_DIRECTORY,
    members: names.length,
    bytes: Object.values(payloads).reduce(
      (sum, value) => sum + value.length,
      0,
    ),
  };
}

export function sync_skill(root = ROOT) {
  const payloads = skill_payloads(root);
  const directory = join(root, SKILL_DIRECTORY);
  verify_regular_paths(root, Object.keys(payloads));
  const unexpected = distribution_files(root)
    .map((path) => relative(directory, path).replaceAll("\\", "/"))
    .filter((name) => !payloads[name]);
  if (unexpected.length)
    throw new Error(
      "Remove unexpected distribution files before syncing: " +
        unexpected.join(", "),
    );
  for (const [name, data] of Object.entries(payloads)) {
    const path = join(directory, name);
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path) || !readFileSync(path).equals(data))
      writeFileSync(path, data);
  }
  return check_skill(root);
}
