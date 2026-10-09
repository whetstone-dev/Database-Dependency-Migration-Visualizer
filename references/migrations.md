# Migration review and rules

In the optional toolkit, migration SQL is parsed locally and never executed. The baseline is not mutated or replayed. Findings add migration evidence to a copy of the baseline. Multiple operations can target the baseline object; references to objects introduced/renamed earlier in the proposal can remain unresolved. Plans are operator review material with explicit assumptions and recovery steps.

For normal skill use, read sources directly and track explicit sequential operations in the [source-analysis ledger](source-analysis.md#track-sequential-state). Cite manual findings as SOURCE_READ and carry unsupported effects forward as UNKNOWN. This does not add stateful replay to the engine or establish backfill correctness. The rule table below documents engine rules; manual reviews may use the risk categories without claiming those rules ran.

| Rule | Trigger | Interpretation |
|---|---|---|
| DDM001 | Drop table/column | Destructive data potential and dependency impact |
| DDM002 | Alter column type | Conversion/type compatibility; conditional rewrite and ACCESS EXCLUSIVE lock |
| DDM003 | Set not null | NULL verification, potential scan, validated CHECK alternative |
| DDM004 | Add default column | Constant fast default on 11+ versus volatile/unclassified/older defaults |
| DDM005 | Regular create index | SHARE lock blocks writes; concurrency tradeoff |
| DDM006 | Concurrent index in explicit/external transaction | Definite forbidden context |
| DDM007 | Add CHECK/FK | NOT VALID and later validation where supported |
| DDM008 | Altered referenced object | Views/routines/application SQL, separated by evidence |
| DDM009 | Rename column | Recorded identities versus stale textual consumers |
| DDM010 | Drop CASCADE | Review potential consequences; no exact deletion closure |
| DDM011 | Destructive contract | Transition completion is unproven; require phase gates |
| DDM012 | Missing size/traffic | Operational impact unknown; no invented measurements |
| DDM013 | Ambiguous/unsupported reference | Retain coverage gap and resolve from supported input |
| DDM014 | Affected constraint/index/trigger | Preserve edge type and deployment requirements |
| DDM015 | Identity/default/generated change | Preserve generation and ownership semantics |

Risk dimensions are data_loss, locking, rewrite, compatibility, deployment_order and unresolved_dependencies. Risk levels are low/medium/high/unknown. Unknown operational impact can coexist with a definite syntax/transaction prohibition. Neither lock mode nor a supplied size predicts lock duration. `--fail-on high` gates high risks; `medium` gates high/medium; `unknown` gates high/medium/unknown. Analysis outputs still exist if the policy exits 3.

For a transactional migration runner, use `--transaction-mode single`. Default analysis assumes statement execution and detects explicit BEGIN/START/COMMIT/ROLLBACK. ROLLBACK TO SAVEPOINT does not exit the outer transaction. PostgreSQL may also execute multi-statement submissions in an implicit transaction; the tool cannot detect the runner's submission protocol. Declare that context explicitly.

Integer to UUID requires a designed mapping, uniqueness, FK/key/index/view transition and compatible application deployment. Casting decimal text to UUID does not create a valid semantic mapping. Expand nullable representations, coordinate writers, backfill bounded batches, validate, transition consumers, then separately approve contract. Data loss cannot be undone by reverse DDL. Recovery requires retained source data, tested backups or roll-forward.

Regular and concurrent index tradeoffs and ALTER TABLE rules follow [PostgreSQL 18 CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html) and [PostgreSQL 17 ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html). Constant defaults and validated-check scan avoidance are qualified by version. The analyzer conservatively treats arbitrary default function volatility as unknown. Partition restrictions still require review.
