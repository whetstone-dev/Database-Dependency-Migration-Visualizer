# Tooling roadmap

Normal skill use now reads sources and produces a review without additional runtime setup. The following work extends the deterministic toolkit and automation. These are acceptance criteria, not shipped features or completed accuracy measurements.

## ORM-aware application analysis

Start with EF Core migrations and C# consumers. Preserve `Up` order, map explicit database names through entity configuration, and attach both mapping and use-site evidence. Separate migrations, model snapshots and deployed-schema facts. Mark provider-generated SQL, conventions, helpers and unresolved translations UNKNOWN. Then add version-aware Prisma and TypeORM adapters. Validate each adapter against independent expected consumers before claiming supported coverage.

The skill currently guides manual inspection of these sources; the toolkit still records host-language coverage gaps.

## GitHub pull-request integration

On PRs containing migrations, analyze against the identified base commit and include unchanged consumers. Publish affected objects, relevant source evidence, high-risk findings and unresolved dependencies as one maintained comment or check. Include base/head identities and analysis coverage. Preserve reports when a policy gate fails. Treat fork source as untrusted and keep analysis credentials separate from the permission to publish results.

The skill currently prepares comment-ready Markdown and can publish only when requested through an available GitHub tool. It does not install automatic PR analysis.

## Stateful migration analysis

Evaluate ordered operations against an evolving schema model. Preserve object identities through renames, register new objects, remove dropped objects, and update supported dependency relationships. Resolve later references against the preceding state. Carry unsupported transformation effects into later dependent operations as UNKNOWN. Cover transaction/rollback boundaries, failed preconditions, add/rename/use sequences and changes to foreign keys, views and indexes.

The skill currently uses a manual ledger; the engine still reviews against a fixed baseline.

## Independent accuracy testing

Select at least three real PostgreSQL projects and freeze repository revisions, migration inputs and consumer scope. Establish expected dependencies manually for at least 20 meaningful changes across those projects before inspecting analyzer output. Include table/column drops, renames, type changes, foreign keys, view chains, ORM mappings and sequential operations.

Have an independent reviewer resolve disagreements about expected edges and warnings. Record evidence for each expected dependency and each warning judgment. Measure:

- Missed dependencies as counts and recall, with expected dependencies as the denominator.
- Incorrect edges as counts and precision, with reported edges as the denominator.
- False-positive warnings as counts and rate among judged warnings; retain unresolved warning judgments separately.
- Setup time from a clean checkout to the first usable review, separately for normal skill use and toolkit setup. Record environment, prerequisites and failed attempts.

Report per-project and per-change results as well as totals. Distinguish an abstention/UNKNOWN from a false edge, while counting an expected dependency not recovered in the missed-dependency metric. Preserve raw outputs and human judgments. Existing curated fixtures and historical evaluations do not satisfy this study.

## Distribution

Keep install-and-use source review independent of Node.js, pnpm and a database. Preserve manual-copy/clone and Skills CLI installation. Keep runtime setup optional and production-only when the user wants validated machine artifacts. Check instructions in an environment without toolkit dependencies and keep README, skill references and bilingual web guidance aligned.
