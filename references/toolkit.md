# Optional deterministic toolkit

The normal skill workflow is [source analysis](source-analysis.md) and needs no runtime setup. Use this toolkit for parser-backed evidence, validated canonical JSON, deterministic graph exports or the standalone HTML explorer. It requires Node.js 22.18+ and runtime dependencies. Resolve this skill's absolute directory as `<skill-dir>` and keep inputs/outputs in the user's workspace.

If the runtime is unavailable, complete the source review. State that any requested validated model or interactive explorer could not be generated. Never replace the parser with regex extraction or claim manually written JSON is validated.

## Install only the optional runtime

Run inside the installed skill directory, without installing the website or development tools:

An instructions-only copy may omit `package.json`, scripts and engine resources. Use the complete checkout or `.skill` bundle before enabling the toolkit in that case; the source-review workflow already works from the instructions and references.

```sh
npm install --omit=dev --ignore-scripts --package-lock=false
node scripts/dbdep.mjs doctor --json
```

This npm path pins direct dependencies through `package.json`; it does not freeze transitive dependencies. For a reproducible production installation with the shipped pnpm lockfile, the alternative is:

```sh
pnpm install --prod --frozen-lockfile --ignore-workspace --ignore-scripts
```

Neither path is needed for source review. Full workspace setup belongs in [CONTRIBUTING.md](../CONTRIBUTING.md), not in ordinary skill use.

## Route by task

Run `node "<skill-dir>/scripts/dbdep.mjs" <command>` from the user's workspace, or installed `dbdep`. Examples below abbreviate that entry point to `dbdep`.

- Schema exploration: read [parser and confidence](parser-and-confidence.md). Run `dbdep inspect --ddl <schema.sql> [--repo <query-dir>] --out out/schema.dbdep.json`, then `dbdep validate out/schema.dbdep.json --strict --json`. Run `dbdep render out/schema.dbdep.json --out out/dependencies.html` and `dbdep docs out/schema.dbdep.json --out out/report.md`.
- Impact: read [dependency semantics](dependency-semantics.md). Run `dbdep impact <model> --object <schema.table.column> --operation alter-type --to uuid --json`. Use stable IDs for ambiguous objects or overloaded routines. `dbdep render <model> --object <selector> --out out/impact.html` focuses the explorer.
- Migration review: read [migrations](migrations.md). Run `dbdep review --baseline <model> --migration <proposal.sql> --out out/review --json`. Use `--transaction-mode single` for a runner that wraps the file in a transaction and `--metadata <file>` for labeled user-supplied size/traffic. Missing baseline is allowed but partial. `--fail-on high` is an optional policy gate; artifacts are still written on gate failure. Sequential operations are not replayed against an evolving schema.
- Comparison: run `dbdep diff <before.dbdep.json> <after.dbdep.json> --out out/diff --json`. Similar add/drop pairs are possible renames with UNKNOWN status, not confirmed renames.
- Supplied catalogs: read [PostgreSQL catalog](postgres-catalog.md), then `dbdep inspect --catalog <capture.json> --out out/catalog.dbdep.json`.
- Explicitly requested live discovery: read [security](security.md) and [PostgreSQL catalog](postgres-catalog.md). Use `dbdep inspect --dsn-env DBDEP_DATABASE_URL --mode read-only --out out/live.dbdep.json [--capture-out out/catalog.json]`. Never print or persist the DSN. There is no apply command.

Use `dbdep demo <output-directory>` for the three shipped demonstrations. See [troubleshooting](troubleshooting.md), [model validation](model.md) and [diagramming](diagramming.md) as needed. Host-language files contribute toolkit coverage gaps; manual ORM findings belong in a separate source review.

Exit 0 means analysis completed, 2 means invalid input/prerequisites, and 3 means a requested policy gate failed. A successful analysis may contain high-risk findings.
