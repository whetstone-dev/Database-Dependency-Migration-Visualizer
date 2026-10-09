# Paired evaluation benchmark

One paired sample for each of eight cases. No repeated-run or statistical improvement claim.

| Configuration | Assertions passed | Assertions failed | Assertion-weighted pass rate | Creator case mean |
|---|---:|---:|---:|---:|
| with_skill | 25/25 | 0 | 100.00% | 100.00% |
| without_skill | 24/25 | 1 | 96.00% | 95.83% |

Time, tokens and complete executor telemetry are unavailable. No values in this report represent measured zero durations/tokens.

## Observations

- Single paired sample per case: with_skill passes 25/25 assertions; without_skill passes 24/25. This observed difference does not prove general skill improvement or statistical significance.
- The only differentiated assertion is eval 7 'Markdown includes model IDs': with-skill schema.md has all 50 node and 88 edge IDs; baseline report.md has zero model IDs.
- The other 24 assertions pass in both configurations and did not distinguish skill value in this sample.
- Creator's pass-rate mean weights each case equally: 100% with_skill versus 95.83% without_skill. The assertion-weighted totals are 100% versus 96%. Standard deviation is across heterogeneous cases, not repeated-run reliability.
- Duration, tokens, complete tool-call/error telemetry and executor model metadata were not returned. Missing values are null, not measured zeros. No resource tradeoff can be assessed.
- Saved with-skill outputs disclose zero-operation/low-risk backfill review and wrong composite-PK nullability. Existing assertions miss both implementation gaps. Later fixes are not part of these evaluated outputs.
- Trigger evaluation is unavailable: all 10 creator queries failed with Windows WinError 10038. The apparent 5/10 passes are invalid and excluded; no description optimization was performed.
- Human qualitative review is pending. The static viewer contains actual saved responses/reports plus compact evidence extracts; large raw models, SQL/catalog copies and transcripts stay in the sibling workspace.
