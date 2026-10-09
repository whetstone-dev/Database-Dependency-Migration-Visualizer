# Evaluation artifacts

The eight prompts in [evals.json](evals.json) were completed once by each of two independent agents. One agent used this skill and toolkit; the other used the same copied inputs without access to the skill/toolkit. Each agent completed all eight cases in one session. This is one paired sample per case, not eight independent repeated trials.

The skill-assisted outputs pass 25 of 25 declared assertions. The baseline passes 24 of 25. The only failed assertion is baseline case 7, "Markdown includes model IDs": its complete `report.md` contains none of its 64 node or 134 edge IDs. The other 24 assertions pass in both configurations. This observed documentation difference does not establish general or statistically significant improvement.

Open [review.html](review.html) for the creator-generated static viewer. Its Outputs tab contains the actual saved responses and selected reports, formal grades and compact extracts of the graph/evidence checks. Its Benchmark tab contains the comparison and limitations. Feedback can be exported with Submit All Reviews; human qualitative review is pending.

- [benchmark.md](benchmark.md) and [benchmark.json](benchmark.json) contain the creator aggregate with documented missing-metric corrections.
- [results/iteration-1](results/iteration-1) contains creator-compatible `eval-N/{with_skill,without_skill}/run-1/grading.json` directories, metadata and selected unchanged outputs.
- [artifact-manifest.json](results/iteration-1/artifact-manifest.json) records hashes of actual copied inputs and original outputs. It does not claim hashes of the evaluated toolkit version, because no pre-run source snapshot/hashes were recorded.
- [creator-receipt.json](results/iteration-1/creator-receipt.json) records the actual aggregation and static-viewer commands and their exit codes.
- [trigger-evaluation.json](results/iteration-1/trigger-evaluation.json) explains why trigger evaluation is unavailable. Its raw failure transcript is retained separately and its apparent pass rate is excluded.
- [../docs/evaluation.md](../docs/evaluation.md) explains grading, limitations and reproduction.

Large original canonical models, complete transcripts, HTML reports, screenshots and copied fixtures remain in the sibling `database-dependency-migration-workspace/iteration-1` directory. `evidence.json` files in this repository are labeled extracts, not replacement canonical outputs. The static viewer renders actual response/report text; the compact archive does not include every artifact linked inside those original responses.

Timing, tokens, executor model identifiers and complete tool-call/error telemetry were not returned. The creator aggregator defaults missing metrics to zero and hardcodes three runs; the grading script corrects those defaults to unavailable values and one run before producing the review. No measured zero durations or token counts are reported.
