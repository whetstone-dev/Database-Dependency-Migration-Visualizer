# Evaluation method and results

## Current Node comparison

Iteration 2 compares a frozen Node v0.3.0 prerelease with the previous tagged v0.2.0 skill. Each configuration passes 25/25 original assertions. One executor completes all eight prompts in each configuration, with one actual run per case. The creator's case-weighted means are both 100%. This is assertion parity on supplied fixtures; it does not prove reliability, resource savings or overall improvement.

| Case | Task | New Node skill | Previous skill |
|---|---|---:|---:|
| 1 | Customer-key impact and staged transition | 5/5 | 5/5 |
| 2 | Catalog-backed transitive views | 3/3 | 3/3 |
| 3 | Locking, rewrite and transaction hazards | 4/4 | 4/4 |
| 4 | Static consumers and unknown dynamic SQL | 3/3 | 3/3 |
| 5 | Add/drop and ambiguous rename | 2/2 | 2/2 |
| 6 | Schema collisions, quoted identities and overloads | 3/3 | 3/3 |
| 7 | Model, HTML and Markdown integrity | 3/3 | 3/3 |
| 8 | Production request and analysis-only boundary | 2/2 | 2/2 |

The [pre-run manifest](../evals/results/iteration-2/source-manifest.json) contains frozen source and input hashes. The historical baseline comes from an actual Git archive of v0.2.0, without current-code access. Its own Python runtime is historical evaluation machinery; the new toolkit, tests and packaging use Node only. [Artifact hashes](../evals/results/iteration-2/artifact-manifest.json) describe the actual produced files. Full snapshots, inputs, models and HTML remain in the sibling evaluation workspace; retained responses, grades and receipts are unchanged copies.

The independent grader inspected all sixteen responses and receipts, used Ajv against the frozen schema, and independently verified IDs, evidence references, source byte hashes, ordered FK mappings, catalog addresses, reverse paths, HTML-model equality, offline declarations and recorded commands. Its 103 artifact checks pass. The [grader audit and source](../evals/results/iteration-2/analysis.md) distinguish these checks from the 50 original narrative assertion grades. The grader imports neither engine and executes no SQL.

The original assertions miss material defects. Both frozen case-3 plans include UUID instructions for a numeric amount change; only the old response discloses this. Both case-2 responses incorrectly call a catalog payload fingerprint the SQL-query hash, although their artifact evidence is correctly grounded. Case 1 also differs in review scope: the new executor uses the supplied contract migration as additional context, while the old executor reviews a one-operation hypothetical. Their finding totals are not directly comparable. Final source changes make phase wording conditional and clarify hash meanings, but those fixes are outside the frozen comparison. Separate final tests establish their behavior.

The installed creator's aggregation and static viewer scripts ran, with exact commands and exit codes in the [receipt](../evals/results/iteration-2/creator-receipt.json). Missing agent duration, tokens, complete tool-call/error telemetry and model identifiers remain unavailable. The unchanged [raw aggregate](../evals/results/iteration-2/benchmark-creator-raw.json) retains the creator's zero defaults and hardcoded three runs. The Node finalizer corrects these to null values and the actual one sample per case, without altering grades. Command counts and nonzero exits remain separate recorded measurements.

Initial static discovery also scanned historical runs inside the old source snapshot and failed on missing IDs. A byte-verified stage contains only the sixteen current runs, with metadata copied where the creator expects it. The creator then generated the viewer. Its JSON encoding embeds HTML closing-script tags verbatim, so Node normalization escapes HTML delimiters within the embedded JSON only and verifies decoded data equality. Independent review also found locale decoding damage in the Windows creator's `Path.read_text()` calls. Actual regeneration with `PYTHONUTF8=1` preserves the original Unicode text. Both earlier raw HTML and the new UTF-8 raw HTML remain in the workspace, with a [normalization receipt](../evals/results/iteration-2/viewer-normalization.json). The delivered [review-node.html](../evals/review-node.html) displays 16 runs and 50 grades in Chromium with no page errors. Independent checks confirm all 16 original grades, 189 text files after creator universal-newline normalization, the embedded benchmark and all 276 staged source hashes. LF/CRLF hostile closing-script regressions cover delimiter escaping. The upstream viewer lists immediate output files only, so nested review/comparison bundles remain outside its display and available in the full workspace.

Neither executor tested browser behavior or contacted a database. Separate final live/browser tests are not retroactively evaluation evidence. Human qualitative review remains pending. Trigger evaluation and description optimization were not rerun; the historical Windows trigger-runner failure below remains excluded. Automatic approval review blocked cleanup of nine historical Python cache files; their paths/hashes are recorded separately, and frozen source hashes still match.

Reproduce the independent artifact checks with the full local workspace and installed Node dependencies:

```powershell
node ../database-dependency-migration-workspace/iteration-2/grade-artifacts.mjs .
```

This helper rereads actual artifacts and writes grades under the frozen iteration. The compact repository copies do not contain every model/input required to rerun it. Preserve that workspace for reproduction. To create a new evaluation, build the skill archive, run `node scripts/prepare-evaluations.mjs --out <new-iteration>`, then `node scripts/prepare-baseline.mjs --workspace <new-iteration> --tag v0.2.0`, and execute the prompts with independent runners. Grade actual outputs following the installed creator's grader instructions, then run its real aggregate script. `scripts/finalize-evaluations.mjs`, `scripts/stage-evaluation-viewer.mjs`, `scripts/sanitize-creator-viewer.mjs` and `scripts/collect-evaluations.mjs` each accept `--workspace` and retain raw evidence. The collector stores the current iteration-2 archive; use a new destination when archiving a future iteration.

## Historical initial comparison

The paired sample passes 25/25 assertions with the skill and 24/25 without it. The sole difference is that the baseline's case-7 Markdown does not contain model IDs. Its JSON and HTML pass graph-integrity and embedded-model checks. The other 24 assertions pass in both configurations, so they did not distinguish skill value in this sample.

| Case | Task | With skill | Without skill |
|---|---|---:|---:|
| 1 | Customer-key impact and staged transition | 5/5 | 5/5 |
| 2 | Catalog-backed transitive view dependencies | 3/3 | 3/3 |
| 3 | Locking, rewrite and transaction hazards | 4/4 | 4/4 |
| 4 | Static consumer and unknown dynamic SQL | 3/3 | 3/3 |
| 5 | Snapshot add/drop and ambiguous rename | 2/2 | 2/2 |
| 6 | Schema collisions and quoted/overloaded identities | 3/3 | 3/3 |
| 7 | Model, HTML and Markdown integrity | 3/3 | 2/3 |
| 8 | Production request with an analysis-only boundary | 2/2 | 2/2 |

These are descriptive results from one sample. They do not prove general improvement, reliability or statistical significance. Each configuration used one agent session for all eight cases, so cases also share execution context. The official creator aggregator weights each case equally and reports means of 100% and 95.83%. Counting individual assertions instead gives 100% and 96%. Its standard deviation describes differences between heterogeneous cases, not uncertainty from repeated trials.

## Execution and grading

Both agents used copies of the same synthetic example inputs. The retained manifest records each copy's SHA-256 and each original output's SHA-256/size. Source-backed SQL evidence was checked against those copied input paths, lines, recorded source hashes or statement text. Catalog evidence was checked for the rewrite ownership/dependency rows that connect `order_summary` and `monthly_revenue` to the target column. No database was contacted and no migration was executed during these paired runs.

The grader read the actual saved responses, relevant reports/models, evidence and execution transcripts. The historical `scripts/grade_evaluations.py`, retained in the v0.2.0 Git tag, performs repeatable checks for unique IDs, existing edge endpoints, nonempty/resolved evidence references, source evidence, dependency reachability, distinct object identities and exact HTML-model equality. It checks the complete original Markdown for exact node/edge IDs. Narrative assertions use the actual saved response/report and analysis JSON under an explicit rubric, with an evidence explanation for each verdict.

The baseline's declared `canonical.baseline.v1` format is accepted for the generic canonical-model assertions. Inline evidence counts as evidence when it refers to actual supplied source. Those assertions do not require the skill's particular JSON schema. This prevents the grader from penalizing a valid baseline solely for choosing another canonical format.

The skill-creator's actual `scripts.aggregate_benchmark` and `eval-viewer/generate_review.py --static` were run. Their commands, captured output and exit codes appear in [creator-receipt.json](../evals/results/iteration-1/creator-receipt.json). The generated [review.html](../evals/review.html) contains all 16 runs and their 50 assertion grades, actual response text and selected original Markdown reports. Human qualitative review remains pending; no user feedback or description optimization is claimed.

## Coverage gaps

The evaluated skill-assisted response for case 1 disclosed that the backfill reviewer returned low risk, zero operations and zero findings for three UPDATE statements. It supplied a source-reviewed plan with bounded/resumable batches and write coordination, which satisfies the declared staged-plan assertion. The assertion does not check the reviewer's DML risk classification. Case 6 disclosed incorrect `nullable: true` flags for composite-primary-key columns. The three case-6 assertions check separate schemas, quoted identifiers/overloads and ambiguity, so that defect does not cause a declared assertion failure.

Those defects prompted later implementation fixes. The saved initial outputs remain unchanged and were not regenerated for better scores. Later independent engine review also examined missing DML targets, replacement operations with unknown risk, ambiguous type references and unnamed CHECK identity collisions. Those checks are separate from this paired benchmark. They cannot be counted as paired failures or successes when the original assertion set does not cover them.

The existing assertions miss several meaningful outcomes. A stronger next sample should test unsupported-DML risk and gates, actual composite-key nullability, ordered composite FK mappings, partition representation, unknown replacement gates, ambiguous type binding and distinct unnamed constraints. Case 8 also inherits the evaluation's offline-only constraint, which limits what its passing refusal can establish about the skill itself. Browser evidence from the executors exercises selected local reports; it does not establish every interaction, viewport or browser.

## Missing measurements and provenance

No completion notification supplied timing/token telemetry or executor model identifiers. The root dispatch timestamps only identify when agents started; they do not measure per-case duration or tokens. The installed creator aggregator defaults missing telemetry to zero and sets `runs_per_configuration` to three. The grading script runs that aggregator first, then replaces unavailable run metrics and time/token summaries with `null`, marks their deltas unavailable, and sets the sample count to one before generating the viewer. No speed, token-cost or resource tradeoff claim follows from this benchmark.

No pre-run hash snapshot of the toolkit's source was saved. [artifact-manifest.json](../evals/results/iteration-1/artifact-manifest.json) therefore sets evaluated toolkit hashes to `null`. Hashes taken after the implementation fixes would describe a different version, so they are not substituted. The manifest hashes of input copies and actual output files are available, and original responses explicitly preserve the evaluated defects. This is an audit limitation for exact source-version reproduction.

## Trigger evaluation

The installed creator's trigger runner was attempted with all ten queries in [trigger-queries.json](../evals/trigger-queries.json), one run per query, one worker and a 20-second timeout. Every query failed with `[WinError 10038] An operation was attempted on something that is not a socket`. The runner's Windows subprocess-pipe handling calls `select`, which cannot handle these pipes. The reported 5/10 apparent passes result from failed queries being treated as non-triggering; they are invalid measurements and are excluded from the benchmark.

The exact command, failure status and raw captured output appear in [trigger-evaluation.json](../evals/results/iteration-1/trigger-evaluation.json) and [trigger-evaluation.txt](../evals/results/iteration-1/trigger-evaluation.txt). Trigger accuracy is unavailable. No description-optimization loop was performed.

## Reproduction

The following commands reproduce the historical initial workflow from a v0.2.0 checkout. They are not current Node toolkit commands. Regrade the retained unchanged response/report copies and compact evidence without rerunning either executor:

```powershell
python scripts/grade_evaluations.py
```

Regrade and run the installed creator's real aggregate/static review workflow:

```powershell
python scripts/grade_evaluations.py --creator 'C:/Users/josed/.agents/skills/skill-creator'
```

To recapture evidence from the original sibling outputs before grading:

```powershell
python scripts/grade_evaluations.py --workspace '../database-dependency-migration-workspace/iteration-1' --creator 'C:/Users/josed/.agents/skills/skill-creator'
```

The compact replay validates the retained copied-output hashes and rechecks the extracted graph facts. The original-workspace mode independently parses the original saved model/HTML files and verifies their SQL evidence against input copies. It does not run the toolkit or mutate the original evaluation outputs. A fresh paired sample against the fixed implementation would be a new iteration with its own source snapshot and telemetry.
