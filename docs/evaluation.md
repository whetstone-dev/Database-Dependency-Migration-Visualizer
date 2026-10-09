# Evaluation method and results

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

The grader read the actual saved responses, relevant reports/models, evidence and execution transcripts. [grade_evaluations.py](../scripts/grade_evaluations.py) performs repeatable checks for unique IDs, existing edge endpoints, nonempty/resolved evidence references, source evidence, dependency reachability, distinct object identities and exact HTML-model equality. It checks the complete original Markdown for exact node/edge IDs. Narrative assertions use the actual saved response/report and analysis JSON under an explicit rubric, with an evidence explanation for each verdict.

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

Regrade the retained unchanged response/report copies and compact evidence without rerunning either executor:

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
