# Source review outline

Use this outline for a normal skill review. Scale it to the change and omit empty sections. Write the report directly as Markdown; no toolkit execution is required.

## Scope and evidence

Identify the baseline, migration order, source directories, revisions and transaction assumptions. State that this is a source review. Distinguish SOURCE_READ text evidence, OBSERVED catalog facts, PARSED toolkit evidence, INFERRED hypotheses and UNKNOWN gaps. Cite paths and lines; include revision information when reviewing a diff.

## Affected objects and consumers

List each changed database object, dependent object/application consumer, dependency path, mapping evidence and use-site evidence. Explain potential impact and any condition needed for the path to hold.

## Findings

For each finding, give its risk level, source location, trigger, affected consumers, consequence, uncertainty and proposed review action. Separate definite source problems from conditional operational risks. No measured size, traffic, lock duration or data correctness without supplied evidence.

## Sequential state

For multi-step changes, include the before/operation/after ledger and unresolved effects. Identify statements whose success depends on preceding operations. Preserve UNKNOWN state when a transformation cannot be established.

## Unresolved dependencies and coverage

List unsupported SQL/ORM constructs, unavailable mappings, missing baseline/version/transaction context, dynamic consumers and absent operational evidence. Say what evidence would resolve each material gap. A search with no matches does not establish no consumers.

## Review-only phase plan

Give change-specific expand, compatibility, backfill/verification and contract gates where relevant. Explain recovery prerequisites and retained data. Do not describe reverse DDL as a lossless rollback.

## PR summary and checks

When reviewing a PR, provide concise comment-ready Markdown with changed objects, strongest risks, key evidence and unknowns. Record only checks actually performed. State whether toolkit validation ran; a manual review is not a passing machine check. Publishing is a separate requested action.

## Generated toolkit reports

`src/dbdep/reports.mjs` generates snapshot identity/counts, deterministic findings, coverage gaps, phase plan, affected paths, object/edge/evidence inventories. Regenerate these artifacts from the validated model; do not hand-edit them. See `schemas/report.schema.json` for the machine-readable envelope. SOURCE_READ is not part of that schema.
