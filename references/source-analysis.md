# Source analysis without runtime setup

Use the agent's existing file reader and search tools. No package manager, compiler, ORM CLI or database is needed. `rg` can locate candidates; inspect the surrounding declaration, mapping and call before reporting a dependency. Exclude generated/vendor/build files unless they contain the only available evidence. Do not execute migrations or import application code to discover mappings.

## Establish the baseline

Record the schema source, proposed migration, PostgreSQL/provider version if supplied, application directories and transaction context. A current ORM model or model snapshot may already include the proposed change. It does not prove the pre-migration schema or deployed state. Keep before and after versions distinct.

For a local Git/PR review, use the requested base/head and read their diff. `git diff --name-status <base>...<head>` identifies changed files; `git show <base>:<path>` reads baseline files without checking out a branch. Record the resolved commits and cite each excerpt's revision. Examine unchanged consumers too. If the base or migration order is unavailable, identify the gap and continue with the supplied files.

## Trace dependencies

Inventory changed tables, columns, constraints, indexes, views, sequences and routines. Inspect SQL consumers and application mappings using both database names and mapped symbols. Trace foreign-key columns, index expressions, view definitions, joins, projections, filters and writes. Include `SELECT *` or implicit ORM projections as conditional consumers when the returned shape may change.

An arrow `consumer -> dependency` means the consumer references the dependency. Trace reverse paths from the changed object. For every reported path, cite each link. A shared word or matching property name is insufficient. Record unresolved schemas, aliases, overloads and naming conventions as UNKNOWN. Do not infer a complete application call graph from a database access method.

Use a compact evidence table:

| Changed object | Consumer and path | Evidence | Interpretation |
| --- | --- | --- | --- |
| Fully qualified table/column | File or mapped property, then intermediate dependencies | File:line and revision, or supplied catalog record | SOURCE_READ, OBSERVED, PARSED, INFERRED or UNKNOWN with reason |

SOURCE_READ describes directly inspected text in this prose review. It does not mean the SQL passed a parser, that an ORM generated a particular query, or that a path runs in production. For an ORM consumer, cite both the mapping and the use; mark translation/runtime assumptions INFERRED or UNKNOWN. Keep this table outside canonical toolkit JSON.

## EF Core migrations and C# consumers

Inspect project/package files for EF Core and the PostgreSQL provider. Read the migration's `Up` operations in order. Read `Down` separately as a recovery proposal, never as part of the forward sequence or proof that lost data can be restored. Compare the appropriate baseline model snapshot and explicit schema declarations.

Map `CreateTable`, `AddColumn`, `AlterColumn`, `RenameColumn`, `RenameTable`, `DropColumn`, foreign keys and indexes to their schema/table/column arguments. Read literal `migrationBuilder.Sql` text as SQL evidence. Helper calls, conditionals or generated SQL that cannot be resolved from source remain UNKNOWN.

Follow `DbContext`, entity configuration, `ToTable`, `HasColumnName`, `HasForeignKey`, `HasPrincipalKey`, and `[Table]`/`[Column]` into entity/property uses. Check LINQ projections and filters, writes, `FromSql*`, `ExecuteSql*`, `DbCommand` and Dapper query calls when present. A property referenced in a LINQ expression is a potential consumer only after its database mapping is established. Name changes in C# alone do not prove a database rename. Conventions, shadow properties, value converters, inheritance, owned types, split tables and runtime configuration may need follow-up.

EF's `Up`/`Down` and snapshot roles are documented in [managing migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/managing). Explicit property mappings are documented in [entity properties](https://learn.microsoft.com/en-us/ef/core/modeling/entity-properties). Verify provider/version-specific SQL claims against the project's actual version.

## Prisma and TypeORM

For Prisma, identify the installed version and its migration format first. In SQL-based migration histories, read ordered `prisma/migrations/*/migration.sql` files, then map model/field names through `@@map`, `@map`, schema declarations and relation scalar fields. Follow the mapped model into Prisma Client reads/writes and inspect `$queryRaw`/`$executeRaw` literals. Do not treat a relation field as a physical column or an application field rename as a database rename. Newer migration formats must be inspected as supplied; an unrecognized format remains UNKNOWN. See [Prisma database mapping](https://docs.prisma.io/docs/orm/v7/prisma-schema/data-model/database-mapping).

For TypeORM, read `MigrationInterface.up` and literal `queryRunner.query` calls or explicit table/column operations in execution order. Review `down` separately. Resolve `@Entity`, `@Column`, `@JoinColumn` and `EntitySchema` physical names into repository calls, query builders and raw SQL. Inspect the configured naming strategy; unavailable or computed names remain UNKNOWN. Decorated class/property names alone do not prove physical names. See [TypeORM migrations](https://typeorm.io/docs/advanced-topics/migrations/).

## Track sequential state

Maintain a ledger with step, source location, target identity, known before state, operation, after state and unresolved effects. Start from the identified baseline, not the final ORM model. For explicit creates/adds, register the new object; for renames, retain its identity and track old/new names; for drops, mark it absent; for explicit type/null/default changes, update only those known attributes. Update explicitly defined FK/index/view relationships when their targets resolve. Name binding after a rename must use the new name. Stored PostgreSQL dependencies and literal application SQL have different rename behavior.

For example, `ADD COLUMN code text; RENAME COLUMN code TO external_code; CREATE INDEX ... (external_code)` references a column introduced in the proposal. Explain that link rather than reporting it missing from the baseline. The conclusion remains conditional on preceding operations succeeding.

Unsupported operations, dynamic SQL, missing predecessors, ambiguous names, data conversions and helper-generated changes introduce UNKNOWN effects. Carry those effects into later findings that depend on them; continue reasoning about independent objects. If a statement is invalid or blocked by a dependency, do not assume it succeeds or claim subsequent steps execute. For explicit transactions/savepoints, track rollback only where the boundary is clear; otherwise mark resulting state UNKNOWN. Data/backfill correctness and transaction-runner behavior cannot be established by a schema ledger.

This ledger is agent reasoning, not a deterministic migration simulator. The bundled engine still reviews against a fixed baseline and does not implement these state transitions.

## Deliver the review

Use [the report outline](../templates/review-report.md). Explain destructive changes, conversions, dependency blockers, reader/writer compatibility and deployment order with evidence. Describe lock/rewrite risks as conditional when version, table size or traffic is unknown. Report backfill correctness as UNKNOWN without operational evidence. Do not invent measured downtime or a safe rollback.

A PR-ready summary should list changed objects, strongest high-risk findings, key consumers and unresolved dependencies, with links to source evidence and the full report if available. Preparing Markdown needs no GitHub connection. Publishing a comment/check requires an explicit publication request and an available GitHub tool. This skill does not install a webhook, bot or automatic PR workflow.
