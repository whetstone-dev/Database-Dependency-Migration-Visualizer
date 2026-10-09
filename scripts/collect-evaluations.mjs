#!/usr/bin/env node
/** Archive actual creator grades and selected outputs with hashes; no synthetic grades. */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { ROOT, files, sha256, save } from "./tooling.mjs";
const index = process.argv.indexOf("--workspace");
const workspace =
  index < 0
    ? join(
        dirname(ROOT),
        "database-dependency-migration-workspace",
        "iteration-2",
      )
    : resolve(process.argv[index + 1]);
const destination = join(ROOT, "evals/results/iteration-2");
mkdirSync(destination, { recursive: true });
const manifest = [];
for (const source of files(workspace)) {
  const rel = relative(workspace, source).replaceAll("\\", "/");
  if (
    rel.startsWith("skill-snapshot/") ||
    rel.startsWith("old-skill-snapshot/") ||
    rel.startsWith("viewer-stage/") ||
    rel.startsWith("inputs/")
  )
    continue;
  const bytes = readFileSync(source);
  const keep =
    /^(benchmark(?:-creator-raw)?\.(json|md)|source-manifest\.json|creator-receipt\.json|analysis\.md|evals\.json|grade-artifacts\.mjs|grading-checks\.json|viewer-(stage-manifest|normalization)\.json|old-skill-[^/]+\.json)$/.test(
      rel,
    ) ||
    rel.endsWith("/grading.json") ||
    rel.endsWith("/eval_metadata.json") ||
    rel.endsWith("/response.md") ||
    rel.endsWith("/actual_response.md") ||
    rel.endsWith("/execution.json") ||
    rel.endsWith("/checks.json");
  manifest.push({
    path: rel,
    sha256: sha256(bytes),
    bytes: bytes.length,
    retained_in_repository: keep,
  });
  if (keep) {
    const target = join(destination, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}
if (!manifest.some((m) => m.path.endsWith("/grading.json")))
  throw new Error("No actual grading results found");
save(join(destination, "artifact-manifest.json"), {
  workspace: workspace.replaceAll("\\", "/"),
  artifacts: manifest,
  scope:
    "Hashes of actual iteration-2 outputs; selected raw text/grades retained here, complete artifacts remain in sibling workspace.",
});
const review = join(workspace, "review.html");
if (existsSync(review))
  copyFileSync(review, join(ROOT, "evals/review-node.html"));
console.log(
  JSON.stringify({
    retained: manifest.filter((m) => m.retained_in_repository).length,
    hashed: manifest.length,
  }),
);
