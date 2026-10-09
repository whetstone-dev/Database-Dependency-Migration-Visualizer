/** Analysis-only CLI. Invalid input exits 2; a requested risk gate exits 3. */
import { Command, Option } from "commander";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { Builder, canonical, resources, validate } from "./model.mjs";
import { inspect_ddl } from "./sql.mjs";
import { select, impact, diff } from "./graph.mjs";
import { review } from "./rules.mjs";
import { capture, inspect_catalog } from "./catalog.mjs";
import {
  bundle,
  dot,
  markdown,
  mermaid,
  render,
  require_valid,
  summary,
  write,
  bundle_names,
  protect_inputs,
  check_output_path,
} from "./reports.mjs";

const manifest = JSON.parse(
  readFileSync(join(resources(), "package.json"), "utf8"),
);
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
export function load_model(path) {
  const model = json(path);
  require_valid(model);
  return model;
}

export function comparison_model(before, after, changes) {
  const b = new Builder(after.engine.version);
  b.model = structuredClone(after);
  b.nodes = new Map(b.model.nodes.map((n) => [n.id, n]));
  b.edges = new Map(b.model.edges.map((e) => [e.id, e]));
  for (const model of [b.model, structuredClone(before)]) {
    for (const e of model.evidence) {
      const field = "path" in e ? "path" : "query_id";
      e[field] = `${model.snapshot.id}/${e[field]}`;
    }
    if (model !== b.model) {
      for (const n of model.nodes)
        if (changes.removed.includes(n.id)) b.nodes.set(n.id, n);
      for (const e of model.edges)
        if (b.nodes.has(e.source) && b.nodes.has(e.target))
          b.edges.set(e.id, e);
      const known = new Set(b.model.evidence.map((e) => e.id));
      b.model.evidence.push(...model.evidence.filter((e) => !known.has(e.id)));
    }
  }
  return b.finish();
}
export function demo(directory) {
  const ex = join(resources(), "examples");
  let m = inspect_ddl(
    join(ex, "ecommerce/schema.sql"),
    join(ex, "ecommerce/app"),
  );
  let r = review(
    m,
    join(ex, "ecommerce/migrations/003_contract_legacy_id.sql"),
  );
  const a = bundle(
    join(directory, "ecommerce"),
    r.model,
    r,
    null,
    select(m, "public.customers.id").id,
  );
  m = inspect_catalog(json(join(ex, "analytics/catalog.json")));
  r = review(m, join(ex, "analytics/drop.sql"));
  const b = bundle(
    join(directory, "analytics"),
    r.model,
    r,
    null,
    select(m, "sales.orders.total_amount").id,
  );
  m = inspect_ddl(join(ex, "ecommerce/schema.sql"), join(ex, "ecommerce/app"));
  r = review(
    m,
    join(ex, "high-traffic/migrations/007.sql"),
    "18",
    json(join(ex, "high-traffic/metadata.json")),
  );
  const c = bundle(
    join(directory, "high-traffic"),
    r.model,
    r,
    null,
    select(m, "public.orders.total_amount").id,
  );
  return { ecommerce: a, analytics: b, "high-traffic": c };
}
function installed_version(dependency) {
  try {
    const require = createRequire(import.meta.url);
    let directory = dirname(require.resolve(dependency));
    while (directory !== dirname(directory)) {
      const candidate = join(directory, "package.json");
      if (existsSync(candidate)) {
        const pkg = json(candidate);
        if (pkg.name === dependency) return pkg.version;
      }
      directory = dirname(directory);
    }
  } catch {
    /* doctor reports unavailable without a sensitive resolver exception */
  }
  return null;
}
export async function run(args) {
  const command = args.command;
  const inputs = [
    "catalog",
    "model",
    "baseline",
    "migration",
    "metadata",
    "before",
    "after",
  ].map((key) => ({ path: args[key] }));
  inputs.push(
    { path: args.ddl, extensions: [".sql"] },
    {
      path: args.repo,
      extensions: [".sql", ".ts", ".js", ".py", ".cs", ".prisma", ".java"],
    },
  );
  const outputs = ["review", "diff"].includes(command)
    ? bundle_names.map((name) => join(args.out, name))
    : command === "demo"
      ? ["ecommerce", "analytics", "high-traffic"].flatMap((slug) =>
          bundle_names.map((name) => join(args.out, slug, name)),
        )
      : [args.out, args.captureOut].filter(Boolean);
  for (const path of outputs) check_output_path(path);
  protect_inputs(outputs, inputs);
  if (command === "inspect" || command === "snapshot") {
    if ([args.ddl, args.catalog, args.dsnEnv].filter(Boolean).length !== 1)
      throw new Error("Choose exactly one of --ddl, --catalog or --dsn-env");
    if (args.captureOut && !args.dsnEnv)
      throw new Error("--capture-out requires live discovery");
    let model;
    if (args.ddl) model = inspect_ddl(args.ddl, args.repo, args.pgVersion);
    else {
      if (args.repo)
        throw new Error(
          "Catalog plus repository merging is unavailable; use a separate offline inspection",
        );
      let data;
      if (args.catalog) data = json(args.catalog);
      else {
        if (args.mode !== "read-only")
          throw new Error("Explicit live discovery requires --mode read-only");
        const dsn = process.env[args.dsnEnv];
        if (!dsn)
          throw new Error("The requested DSN environment variable is unset");
        data = await capture(dsn);
        if (args.captureOut) write(args.captureOut, canonical(data));
      }
      model = inspect_catalog(data);
      if (args.dsnEnv) model.engine.source_mode = "live_read_only";
    }
    require_valid(model);
    write(args.out, canonical(model));
    return [{ model: resolve(args.out), summary: summary(model) }, 0];
  }
  if (command === "validate") {
    const errors = validate(json(args.model), args.strict);
    return [{ valid: errors.length === 0, errors }, errors.length ? 2 : 0];
  }
  if (["render", "docs", "mermaid", "dot"].includes(command)) {
    const model = load_model(args.model);
    const content =
      command === "render"
        ? render(
            model,
            null,
            null,
            args.object ? select(model, args.object).id : null,
          )
        : { docs: markdown, mermaid, dot }[command](model);
    write(args.out, content);
    return [{ artifact: resolve(args.out) }, 0];
  }
  if (command === "impact") {
    const result = impact(
      load_model(args.model),
      args.object,
      args.operation,
      args.to,
    );
    if (args.out) write(args.out, canonical(result));
    return [result, 0];
  }
  if (command === "review") {
    const baseline = args.baseline ? load_model(args.baseline) : null;
    const r = review(
      baseline,
      args.migration,
      args.pgVersion,
      args.metadata ? json(args.metadata) : null,
      args.transactionMode,
    );
    const delivered = bundle(
      args.out,
      r.model,
      r,
      null,
      r.impacts[0]?.root ?? null,
    );
    const levels = new Set(r.model.findings.map((f) => f.risk_level));
    const gates = {
      high: ["high"],
      medium: ["high", "medium"],
      unknown: ["high", "medium", "unknown"],
    };
    const failed = Boolean(
      args.failOn && gates[args.failOn].some((l) => levels.has(l)),
    );
    return [
      {
        ...delivered,
        risk_level: r.risk_level,
        policy_passed: !failed,
        review_only: true,
      },
      failed ? 3 : 0,
    ];
  }
  if (command === "diff") {
    const before = load_model(args.before),
      after = load_model(args.after),
      changes = diff(before, after);
    bundle(args.out, comparison_model(before, after, changes), null, changes);
    write(join(args.out, "before.dbdep.json"), canonical(before));
    write(join(args.out, "after.dbdep.json"), canonical(after));
    return [changes, 0];
  }
  if (command === "demo") return [demo(args.out), 0];
  if (command === "doctor") {
    const dependencies = Object.fromEntries(
      ["libpg-query", "ajv", "pg"].map((d) => [d, installed_version(d)]),
    );
    const ready =
      Object.values(dependencies).every(Boolean) &&
      existsSync(join(resources(), "assets/viewer/viewer.js"));
    return [
      {
        ready,
        version: manifest.version,
        node: process.versions.node,
        dependencies,
        postgresql: {
          grammar: "18",
          live_adapter: "14-18",
          runtime_coverage: "partial",
        },
        offline: true,
        migration_execution: false,
      },
      ready ? 0 : 2,
    ];
  }
  throw new Error("Unsupported command");
}

export function parser(onArgs) {
  const program = new Command()
    .name("dbdep")
    .description("PostgreSQL dependency analysis; never execute migrations")
    .version(manifest.version)
    .exitOverride();
  program.configureOutput({ writeErr: () => {} });
  const bind = (cmd, fields = []) =>
    cmd.action((...values) => {
      const child = values.at(-1);
      const args = { command: child.name(), ...child.opts() };
      for (let i = 0; i < fields.length; i++) args[fields[i]] = values[i];
      onArgs(args);
    });
  const pgVersion = () =>
    new Option("--pg-version <version>")
      .choices(["14", "15", "16", "17", "18"])
      .default("18");
  bind(
    program
      .command("inspect")
      .alias("snapshot")
      .description(
        "Offline DDL/catalog or explicitly requested read-only discovery",
      )
      .option("--ddl <path>")
      .option("--catalog <path>")
      .option("--dsn-env <name>")
      .addOption(new Option("--mode <mode>").choices(["read-only"]))
      .option("--repo <path>")
      .addOption(pgVersion())
      .option("--capture-out <path>")
      .requiredOption("--out <path>")
      .option("--json"),
  );
  bind(
    program
      .command("validate")
      .argument("<model>")
      .option("--strict")
      .option("--json"),
    ["model"],
  );
  for (const command of ["render", "docs", "mermaid", "dot"]) {
    const cmd = program
      .command(command)
      .argument("<model>")
      .requiredOption("--out <path>");
    if (command === "render") cmd.option("--object <selector>");
    bind(cmd, ["model"]);
  }
  bind(
    program
      .command("impact")
      .argument("<model>")
      .requiredOption("--object <selector>")
      .addOption(
        new Option("--operation <operation>").choices([
          "drop-column",
          "rename-column",
          "alter-type",
          "drop-table",
          "replace-view",
        ]),
      )
      .option("--to <type>")
      .option("--out <path>")
      .option("--json"),
    ["model"],
  );
  bind(
    program
      .command("review")
      .option("--baseline <path>")
      .requiredOption("--migration <path>")
      .option("--metadata <path>")
      .addOption(pgVersion())
      .addOption(
        new Option("--transaction-mode <mode>")
          .choices(["statements", "single"])
          .default("statements"),
      )
      .addOption(
        new Option("--fail-on <level>").choices(["high", "medium", "unknown"]),
      )
      .requiredOption("--out <path>")
      .option("--json"),
  );
  bind(
    program
      .command("diff")
      .argument("<before>")
      .argument("<after>")
      .requiredOption("--out <path>")
      .option("--json"),
    ["before", "after"],
  );
  bind(program.command("demo").argument("<out>").option("--json"), ["out"]);
  bind(program.command("doctor").option("--json"));
  return program;
}
export async function main(argv = process.argv) {
  let args;
  try {
    const p = parser((a) => {
      args = a;
    });
    p.parse(argv);
    if (!args) {
      p.outputHelp();
      return 2;
    }
    const [result, code] = await run(args);
    process.stdout.write(
      args.json ? canonical(result) : JSON.stringify(result) + "\n",
    );
    return code;
  } catch (error) {
    if (
      error.code === "commander.helpDisplayed" ||
      error.code === "commander.version"
    )
      return 0;
    let message = error.message;
    if (error.code?.startsWith("commander."))
      message = "Invalid command or arguments; use dbdep --help";
    else if (
      error.code &&
      ["ENOENT", "EACCES", "EPERM", "EISDIR"].includes(error.code)
    )
      message =
        "Cannot read/write the requested local artifact; check paths and permissions";
    else if (error instanceof SyntaxError)
      message = "Invalid JSON input; inspect the local artifact";
    else if (error instanceof TypeError || error instanceof RangeError)
      message = "Malformed input structure; inspect the local input contract";
    // Never print credential-bearing strings or arbitrary driver exception details.
    if (/postgres(?:ql)?:\/\/|password\s*=/i.test(message))
      message = "Input contains forbidden connection details";
    process.stderr.write(
      JSON.stringify({ error: message, exit_code: 2 }) + "\n",
    );
    return 2;
  }
}
