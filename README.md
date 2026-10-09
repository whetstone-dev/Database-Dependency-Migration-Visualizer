# Database dependency migration

A PostgreSQL dependency and migration-review skill for AI coding agents. Install it, point your agent at your schema, migration and application sources, and get a source-cited review. Normal skill use needs no pnpm, Node.js, dependency installation, build or database server.

An optional Node.js toolkit produces parser-backed dependency models and standalone interactive HTML reports. Its versioned `*.dbdep.json` model is the source of truth for generated toolkit artifacts; the canonical contract is **1.0.0** and the package version is **v0.3.2**. The skill and toolkit never apply migrations. Installing from the repository uses current `main`; release tags remain immutable.

## What it does

The skill reads sources directly and produces Markdown reviews with affected objects, application consumers, dependency paths, migration risks and unresolved dependencies. It includes guidance for EF Core migrations and C# consumers, then Prisma and TypeORM mappings. A written schema ledger follows explicit sequential operations and carries unsupported effects forward as UNKNOWN. It can prepare a PR comment summary without a GitHub connection. These are agent-assisted reviews, not automated ORM parsing, machine validation or migration simulation.

The optional toolkit:

- Parses common PostgreSQL DDL and simple SQL references with PostgreSQL 18's WebAssembly parser, preserving identifiers, file locations and source hashes.
- Shows table and column dependencies, reverse impact paths, cycles, and distinct foreign-key relationships in a standalone offline HTML explorer.
- Reviews fifteen migration hazard rules, transaction context, conditional rewrite/locking risks, and optional risk-policy gates. Phase plans remain review checklists.
- Compares schema snapshots and marks possible renames as UNKNOWN.
- Reads supplied catalog captures, or performs explicitly requested live discovery with fixed read-only catalog queries. Business rows and routine bodies are not captured.
- Separates OBSERVED metadata, PARSED syntax, INFERRED hypotheses and UNKNOWN gaps. `source -> target` means source depends on target; blast radius follows reverse edges.

The website and toolkit report controls support English and Spanish, light/dark themes, and reduced motion. Toolkit CLI output, generated Markdown and analytical explanations are English. Source reviews can follow the user's requested language. Source names and evidence retain their original language.

## Install the skill

You need an agent that supports `SKILL.md`, such as Codex or Claude Code, and access to the files you want reviewed. The agent uses its existing file-reading and search tools. No additional runtime setup follows skill installation.

### Manual installation without Node.js

Copy or symlink this checkout, or unpack the `.skill` archive, into your agent's skill directory. Keep `SKILL.md`, `references/` and `templates/` together. The scripts, schemas and viewer are optional toolkit resources. Reload your agent and use the skill immediately.

Alternatively, clone from your project root:

```sh
git clone https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer.git .agents/skills/database-dependency-migration
```

For a personal Codex skill on macOS/Linux:

```sh
git clone https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer.git ~/.agents/skills/database-dependency-migration
```

On Windows PowerShell:

```powershell
git clone https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer.git "$HOME/.agents/skills/database-dependency-migration"
```

For Claude Code, use `.claude/skills/database-dependency-migration` in a project or `~/.claude/skills/database-dependency-migration` personally. No package installation is needed.

### Skills CLI

If you already use the [Skills CLI](https://www.skills.sh/docs/cli), install with one command:

```sh
npx skills@1.7.2 add whetstone-dev/Database-Dependency-Migration-Visualizer --skill database-dependency-migration --agent codex --copy
```

This installs into `.agents/skills/database-dependency-migration` in the current project. Replace `codex` with `claude-code`, or add `--global` for a personal installation. Reload your agent and use the skill; there is no follow-up `pnpm install` step. The installer itself requires Node.js 22.20+; manual copying/cloning does not.

Skills CLI copies the repository directory containing the root `SKILL.md`, including development files, website and evaluations. The `.skill` archive excludes the website and evaluation records. Neither installation needs those development files to run a source review.

### Updating

```sh
npx skills@1.7.2 update database-dependency-migration --project
# Personal Skills CLI installation:
npx skills@1.7.2 update database-dependency-migration --global
# Manual Git project installation:
git -C .agents/skills/database-dependency-migration pull --ff-only
```

For a personal/manual installation, use its actual directory with `git -C`; replace copied files with the updated skill when not using Git. Reload the agent. Only users of the optional toolkit need to refresh runtime dependencies after updating. Keep inputs and reports in the user's workspace, outside the installed skill directory.

## Usage

Ask your agent to use `database-dependency-migration` with the actual input paths. Useful requests include:

- "Use database-dependency-migration to review `schema.sql`, `migrations/007.sql` and `src/`. Write a Markdown report with affected consumers, source lines, high-risk findings and unknowns."
- "Review this EF Core migration and C# consumers. Follow the entity mappings to database names and track changes in `Up` order. No runtime installation."
- "Review the migration changes in this local PR diff and prepare a comment summary with source evidence and unresolved dependencies."
- "Review this BIGINT-to-UUID customer-key proposal against the baseline. Explain foreign-key impact and a phased review plan. Do not execute SQL."
- "Use this supplied catalog capture to trace downstream views of `sales.orders.total_amount`. Separate observed dependencies from runtime coverage gaps."
- "Our runner uses one transaction. Review `007.sql` with `workload-profile.json` as user-supplied size/traffic, and explain definite versus conditional hazards."
- "With the optional toolkit, inspect `schema.sql` and `queries/`. Create a validated model and interactive HTML report, cite source lines, and list unsupported consumers."

The default output is a source-cited review, with optional Mermaid paths. Direct file inspection is labeled SOURCE_READ in review prose; this does not add a new state to canonical JSON. OBSERVED catalog facts, PARSED toolkit evidence, INFERRED hypotheses and UNKNOWN gaps stay distinct. See [source analysis](references/source-analysis.md) and [the report outline](templates/review-report.md).

### Standalone `dbdep` toolkit

The toolkit is optional and works independently of the agent skill. It requires Node.js **22.18+** and runtime packages. From the installed skill directory or checkout root, install only its runtime with npm:

```sh
npm install --omit=dev --ignore-scripts --package-lock=false
node scripts/dbdep.mjs doctor --json
```

This installs the toolkit's pinned direct dependencies without the website or development tools. npm resolves transitive versions; use `pnpm install --prod --frozen-lockfile --ignore-workspace --ignore-scripts` with pnpm **12.10.1** when frozen transitive dependencies are required. Full workspace setup is for contributors and website development, documented in [CONTRIBUTING.md](CONTRIBUTING.md). Neither command is needed for normal skill use.

Runtime dependencies include `libpg-query`, Ajv, Commander, `pg` and `pg-connection-string`. Python is not required. Offline toolkit analysis needs no database server. PostgreSQL 18 supplies the parser grammar; PostgreSQL 14-18 catalog/review context has partial coverage. See [toolkit usage](references/toolkit.md).

Run from the checkout:

```sh
node scripts/dbdep.mjs inspect --ddl examples/ecommerce/schema.sql --repo examples/ecommerce/app --out out/schema.dbdep.json
node scripts/dbdep.mjs validate out/schema.dbdep.json --strict --json
node scripts/dbdep.mjs render out/schema.dbdep.json --object public.customers.id --out out/dependencies.html
node scripts/dbdep.mjs docs out/schema.dbdep.json --out out/report.md
node scripts/dbdep.mjs impact out/schema.dbdep.json --object public.customers.id --operation alter-type --to uuid --json
node scripts/dbdep.mjs review --baseline out/schema.dbdep.json --migration examples/high-traffic/migrations/007.sql --metadata examples/high-traffic/workload-profile.json --transaction-mode single --out out/review --fail-on high --json
node scripts/dbdep.mjs diff before.dbdep.json after.dbdep.json --out out/diff --json
node scripts/dbdep.mjs mermaid out/schema.dbdep.json --out out/graph.mmd
node scripts/dbdep.mjs dot out/schema.dbdep.json --out out/graph.dot
node scripts/dbdep.mjs inspect --catalog examples/analytics/catalog.json --out out/catalog.dbdep.json
node scripts/dbdep.mjs demo out/demo --json
```

`pnpm dbdep <command>` runs the same entry point. From another working directory, use `node "<skill-directory>/scripts/dbdep.mjs" ...`. A local npm tarball can expose `dbdep` through `npm install -g <package.tgz>`; no published npm package is assumed.

`snapshot` aliases `inspect`. A schema directory contains declarations; it does not replay migrations. Review without a baseline is explicitly partial. Exit **0** means analysis completed, **2** means invalid input/prerequisites, and **3** means a requested policy gate failed. A successful analysis may contain high-risk findings; failed risk gates still write review artifacts.

Live discovery requires an explicit request, an environment variable containing the DSN, and a suitable least-privileged login:

```sh
node scripts/dbdep.mjs inspect --dsn-env DBDEP_DATABASE_URL --mode read-only --out out/live.dbdep.json --capture-out out/catalog.json
```

Connection details are not printed or persisted. Queries use fixed catalog relations/functions, timeouts and a repeatable-read read-only transaction. Read [catalog capture](references/postgres-catalog.md) and the [security boundary](references/security.md) before discovery.

## Curated scenarios

`node scripts/dbdep.mjs demo out/demo --json` regenerates all three scenarios with the optional toolkit. The checked-in HTML reports open locally without installing the runtime.

| Scenario                       | What to review                                                                                | Sources and outputs                                                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer identifier transition | Foreign keys, a summary view and application SQL affected by a BIGINT-to-UUID proposal        | [Schema](examples/ecommerce/schema.sql), [proposal](examples/ecommerce/migrations/003_contract_legacy_id.sql), [HTML](examples/rendered/ecommerce/report.html), [model](examples/rendered/ecommerce/model.dbdep.json)            |
| Chained views                  | Reverse impact through recorded `pg_rewrite` ownership and qualified CASCADE risk             | [Catalog](examples/analytics/catalog.json), [capture provenance](examples/analytics/capture-provenance.json), [HTML](examples/rendered/analytics/report.html), [model](examples/rendered/analytics/model.dbdep.json)             |
| Index and transaction hazards  | Regular-index locking, conditional type rewrite, and concurrent indexing inside a transaction | [Proposal](examples/high-traffic/migrations/007.sql), [user metadata](examples/high-traffic/workload-profile.json), [HTML](examples/rendered/high-traffic/report.html), [model](examples/rendered/high-traffic/model.dbdep.json) |

![Customer identifier dependency report](examples/rendered/ecommerce/screenshot.png)

Screenshots illustrate presentation. Tests and source evidence establish graph behavior. UUID mapping needs operational review; catalog captures do not reveal every runtime consumer; scenario size/traffic is supplied, not measured. See the [example index](examples/README.md).

## Website and GitHub Pages

The separate [Next.js website](site/README.md) exports the home page and bilingual documentation at `/docs/` as static HTML. It retains source-backed examples and links to full standalone reports. It has no upload flow or database connection.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm preview
```

Open the localhost URL printed by the preview. GitHub Pages deployment is a manual workflow after review and publication; it publishes `site/out`. The build uses the configured Pages base path, including a repository subdirectory. Existing `/#/docs` bookmarks redirect after JavaScript loads. Curated examples and copied documentation become public. Local `out/`, `tmp/` and evaluation directories are not deployed. Follow the [Pages setup and deployment guide](docs/github-pages.md). No live deployment is claimed here.

## Repository layout

| Path                                    | Contents                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `SKILL.md`, `agents/`                   | Agent entry point, task routing and display metadata                                  |
| `src/dbdep/`                            | Independent model, parser, graph, catalog, hazard, planning, reporting and CLI engine |
| `scripts/dbdep.mjs`                     | Standalone CLI entry point                                                            |
| `scripts/`                              | Fixture, packaging, install-smoke and evaluation development tools                    |
| `schemas/`, `references/`, `templates/` | Canonical schemas, evidence semantics, safety guidance and report template            |
| `assets/viewer/`                        | Offline report viewer and embedded licensed fonts                                     |
| `examples/`                             | Curated inputs, authentic sanitized capture and generated reports                     |
| `tests/`                                | Node, browser and isolated live regressions                                           |
| `site/`                                 | Next.js static website, documentation and license notices                             |
| `evals/`, `docs/`                       | Frozen evaluation evidence, validation, security audit and maintenance guides         |

## Known limitations

- PostgreSQL only. The parser checks syntax, not complete server name/type binding or compatibility across releases.
- Source reviews depend on the agent's inspection and available evidence. ORM mappings and sequential ledgers are manual reasoning, not automated adapters or exhaustive runtime discovery.
- Toolkit SQL references are potential consumers. Nested/CTE column scopes, routine bodies, dynamic SQL and host-language/ORM SQL retain UNKNOWN gaps.
- The toolkit does not replay migrations against an evolving schema. Manual ledgers can follow explicit operations, but unsupported transformations and dependent later conclusions stay UNKNOWN. Backfill/DML correctness remains unproven.
- Catalog/repository merging is unavailable. Compare matching capture modes; catalog definition diff is partial. Similar add/drop pairs do not confirm renames.
- Reverse paths do not prove consumer failure or PostgreSQL's exact CASCADE deletion closure. Lock duration, rewrite timing, zero downtime and lossless rollback are not guaranteed.
- Phase plans require change-specific operational review. The viewer shows at most 350 nodes, 40 path previews and 16 steps per preview; CLI paths remain complete. SVG/JSON export is available; PNG export is unavailable.
- Object names and paths can expose sensitive architecture. Provenance and validation are not general secret detectors. Keep reports local unless sharing is requested.

Read [parser coverage](references/parser-and-confidence.md), [dependency semantics](references/dependency-semantics.md), [migration review](references/migrations.md), and the [model contract](references/model.md).

## Next improvements

The current change makes ordinary skill use independent of runtime setup. The broader tooling work is tracked in [the roadmap](docs/roadmap.md): automated ORM analysis starting with EF Core/C#, GitHub PR comments/checks, deterministic stateful migration analysis, and an independent accuracy study across at least three real PostgreSQL projects and 20 meaningful changes. Those automated capabilities and accuracy results are not claimed by the source-review workflow.

## Validation and contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development checks, fixture regeneration, installation smoke tests and release conventions. [Standalone skill validation](docs/standalone-skill-validation.md) records this no-runtime workflow change. [Security policy](SECURITY.md), [security audit](docs/security-audit.md), [Node validation](docs/node-validation.md) and [release procedure](docs/releases.md) record boundaries and earlier verification. Audit receipts distinguish local results from configured remote checks.

[Evaluation prompts](evals/evals.json), [trigger cases](evals/trigger-queries.json), [retained results](evals/README.md) and the [evaluation method](docs/evaluation.md) preserve actual runs and their limitations. The frozen comparison predates current hardening; it is not proof of production reliability or performance advantage. Human qualitative review and some trigger measurements remain unavailable.

## Design provenance and license

The model/validator/artifact pattern draws on [whetstone-dev/network-engineering](https://github.com/whetstone-dev/network-engineering); standalone typed diagrams and separate visual gates draw on [tt-a1i/archify](https://github.com/tt-a1i/archify). Their engines and assets were not imported. Emil Kowalski's design-engineering guidance informed interaction polish. This PostgreSQL engine is independent.

Original code is [MIT](LICENSE), copyright whetstone-dev. Dependencies retain their own licenses; embedded PostgreSQL code retains upstream notices and embedded fonts retain complete SIL Open Font License notices. The website includes React Bits adaptations under MIT + Commons Clause and GSAP under its Standard License. Read the [toolkit notices](THIRD_PARTY_NOTICES.md) and [website notices](site/THIRD_PARTY_NOTICES.md) before redistribution.
