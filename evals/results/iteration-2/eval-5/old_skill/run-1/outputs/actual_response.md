The comparison reports a removed `public.customers.name` column and an added `public.customers.display_name` column. Both are text columns in the same table, so the toolkit records a possible rename with UNKNOWN status. The snapshots do not prove a rename or preserved data.

| Change | Stable identifier | Evidence |
|---|---|---|
| Removed column | `postgresql:local/public/column/customers/name/` | PARSED declaration in `examples/diff/before.sql:1` |
| Added column | `postgresql:local/public/column/customers/display_name/` | PARSED declaration in `examples/diff/after.sql:1` |
| Matched customer key and constraint | `postgresql:local/public/column/customers/id/`, `postgresql:local/public/constraint/customers/customers_pkey/62676e56159a610040517422` | Both snapshots |
| Modified table definition | `postgresql:local/public/table//customers/` | Different column declarations |

If deployment actually drops `name` and adds `display_name`, the removed column's data can be lost and existing textual consumers can break. If it is an intentional rename, the operator must establish that from the migration and consumer transition evidence. Reverse DDL cannot restore dropped values, and these schema declarations contain no runtime or data evidence.

Artifacts are [before.dbdep.json](before.dbdep.json), [after.dbdep.json](after.dbdep.json), [comparison JSON](comparison/diff.json), standalone [comparison HTML](comparison/report.html), [comparison report](comparison/report.md), and the merged [comparison model](comparison/model.dbdep.json). Both input models and the comparison model passed strict validation with no errors. Each input contains 4 nodes, 4 edges and 1 evidence record. All CLI commands exited 0. Browser behavior and visual layout were not tested. No SQL was executed and no database connection was made.
