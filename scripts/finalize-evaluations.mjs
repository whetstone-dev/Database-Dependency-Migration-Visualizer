#!/usr/bin/env node
/** Correct documented creator defaults without fabricating missing measurements. */
import { readFileSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { ROOT, save, sha256 } from "./tooling.mjs";
const index = process.argv.indexOf("--workspace");
const workspace =
  index < 0
    ? join(
        dirname(ROOT),
        "database-dependency-migration-workspace",
        "iteration-2",
      )
    : resolve(process.argv[index + 1]);
const path = join(workspace, "benchmark.json");
const raw = join(workspace, "benchmark-creator-raw.json");
const benchmark = JSON.parse(
  readFileSync(existsSync(raw) ? raw : path, "utf8"),
);
if (!existsSync(raw)) {
  for (const extension of ["json", "md"])
    copyFileSync(
      join(workspace, `benchmark.${extension}`),
      join(workspace, `benchmark-creator-raw.${extension}`),
    );
}
if (
  benchmark.runs.length !== 16 ||
  new Set(benchmark.runs.map((r) => r.eval_id)).size !== 8
)
  throw new Error("Expected eight actual graded cases in each configuration");
const configurations = ["new_skill", "old_skill"];
for (const configuration of configurations) {
  const runs = benchmark.runs.filter((r) => r.configuration === configuration);
  if (
    runs.length !== 8 ||
    runs.some((r) => r.run_number !== 1) ||
    [...new Set(runs.map((r) => r.eval_id))].sort((a, b) => a - b).join(",") !==
      "1,2,3,4,5,6,7,8"
  )
    throw new Error("Unexpected creator configuration or run count");
  for (const run of runs) {
    const directory = join(
      workspace,
      `eval-${run.eval_id}`,
      configuration,
      "run-1",
    );
    const grade = JSON.parse(
      readFileSync(join(directory, "grading.json"), "utf8"),
    );
    const passed = grade.expectations.filter((e) => e.passed).length;
    if (
      passed !== run.result.passed ||
      grade.expectations.length !== run.result.total ||
      run.result.failed !== grade.expectations.length - passed ||
      !isDeepStrictEqual(grade.expectations, run.expectations)
    )
      throw new Error(
        "Creator aggregate disagrees with actual expectation grades",
      );
    const execution = JSON.parse(
      readFileSync(join(directory, "execution.json"), "utf8"),
    );
    run.result.recorded_command_count = execution.commands.length;
    run.result.recorded_command_failures = execution.commands.filter(
      (c) => c.exit_code !== 0,
    ).length;
    for (const key of ["time_seconds", "tokens", "tool_calls", "errors"])
      run.result[key] = null;
  }
  for (const key of ["time_seconds", "tokens"])
    benchmark.run_summary[configuration][key] = null;
}
benchmark.metadata.runs_per_configuration = 1;
benchmark.metadata.executor_model = null;
benchmark.metadata.analyzer_model = null;
benchmark.metadata.execution_design =
  "One executor session per configuration, eight heterogeneous cases per session, one sample per case. No independent repeats.";
benchmark.metadata.raw_creator_sha256 = sha256(
  readFileSync(join(workspace, "benchmark-creator-raw.json")),
);
benchmark.run_summary.delta.time_seconds = null;
benchmark.run_summary.delta.tokens = null;
benchmark.notes = [
  "Actual installed creator aggregate retained unchanged as benchmark-creator-raw.json/md. Missing measurements defaulted to zero and runs defaulted to three upstream; corrections here record unavailable telemetry and the actual one sample per case.",
  "Command receipts are not complete agent tool-call, error, reasoning-time or token telemetry. Recorded command counts and failures are preserved separately; no timing, cost or performance advantage is claimed.",
  "The comparison uses frozen new/old source and copied input manifests. It does not compare independent repeated model trials or establish general improvement.",
  "Case 1 executor proposals differ: new uses the supplied contract migration as additional review context; old reviews a single-operation hypothetical proposal. Finding counts are not directly comparable.",
  "Both frozen case 3 reviews include irrelevant UUID checklist guidance for a numeric change; only the old response explicitly discloses it. Final source fixes checklist wording, verified separately after this frozen evaluation.",
  "Both case 2 responses mislabel the catalog payload source_hash as a SQL-query hash. Artifact hashes are correctly grounded; prose labels are incorrect. Final instructions clarify the distinction, without replacing the evaluated responses.",
  "Final report motion, docs accessibility and generic phase wording changed after the frozen evaluation; final engine/browser checks cover those changes. Saved execution outputs remain unchanged.",
  "Trigger evaluation and human qualitative review are unavailable/pending. Earlier Windows trigger-runner failures remain historical evidence and are not passing trigger measurements.",
];
save(path, benchmark);
const count = (configuration) =>
  benchmark.runs
    .filter((r) => r.configuration === configuration)
    .reduce(
      (a, r) => ({
        passed: a.passed + r.result.passed,
        total: a.total + r.result.total,
      }),
      { passed: 0, total: 0 },
    );
const [current, previous] = configurations.map(count);
save(
  join(workspace, "benchmark.md"),
  [
    "# Frozen Node and previous skill comparison",
    "",
    "| Measurement | New skill | Previous v0.2.0 skill |",
    "|---|---:|---:|",
    `| Declared assertions | ${current.passed}/${current.total} | ${previous.passed}/${previous.total} |`,
    `| Creator mean across heterogeneous cases | ${(benchmark.run_summary.new_skill.pass_rate.mean * 100).toFixed(2)}% | ${(benchmark.run_summary.old_skill.pass_rate.mean * 100).toFixed(2)}% |`,
    "| Samples per case | 1 | 1 |",
    "| Whole-agent duration and tokens | Unavailable | Unavailable |",
    "",
    ...benchmark.notes.map((note) => `${note}\n`),
    "Read analysis.md for independently verified claims, grade evidence and assertion weaknesses. Human qualitative review remains pending.",
  ].join("\n") + "\n",
);
console.log(
  JSON.stringify({
    configurations: { new_skill: current, old_skill: previous },
    corrected_missing_metrics: true,
    raw_retained: true,
  }),
);
