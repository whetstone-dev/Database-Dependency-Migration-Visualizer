Changing `public.customers.id` from bigint to UUID affects the key and known dependent objects. The offline review reports high risk. Numeric IDs need a designed UUID mapping; a direct type change does not establish a valid conversion.

The parsed references include:

| Dependent | Source evidence | Potential impact |
|---|---|---|
| `public.orders.customer_id` and its FK | `examples/ecommerce/schema.sql:17-22`, specifically line 19 | Transition the referencing column and constraint with the customer key. |
| `public.addresses.customer_id` and its FK | `examples/ecommerce/schema.sql:7-11`, specifically line 9 | Transition this referencing key too. |
| Customer primary key | `examples/ecommerce/schema.sql:1-6` | Preserve uniqueness and choose new generation semantics. The current column is an identity. |
| `public.orders_customer_idx` | `examples/ecommerce/schema.sql:34` | The reverse path through `orders.customer_id` identifies a potential index transition. |
| `public.customer_summary` | `examples/ecommerce/schema.sql:35-38` | The view selects and joins on `c.id`; update its interface and dependent consumers. |
| Customer lookup SQL | `examples/ecommerce/app/customers.sql:1` | Review parameter and result types for `c.id`. |
| Orders join SQL | `examples/ecommerce/app/orders.sql:1-2` | Review the `c.id = o.customer_id` join and application contracts. |

The canonical root is `postgresql:local/public/column/customers/id/`. Graph arrows point from each dependent to its target; impact traverses those edges in reverse. Paths establish potential consumers, not confirmed runtime failures or complete coverage.

The generated review has DDM002 for type compatibility, locking and conditional rewrite; DDM008 for known consumers; DDM014 for constraints and indexes; DDM015 for identity/default semantics; and DDM012 for missing operational size and traffic evidence. ALTER COLUMN TYPE generally needs ACCESS EXCLUSIVE, but actual rewrite requirements and lock duration remain unknown here. Identity sequence names and routine runtime references also remain UNKNOWN.

Use this review-only sequence:

1. Expand with nullable UUID representations and a verified unique mapping, including the child keys. Decide replacement generation, defaults and ownership before deployment.
2. Backfill bounded resumable batches with coordinated writers. Check completeness, uniqueness, NULLs and FK consistency. Backfill DML itself is outside this hazard engine.
3. Validate new keys and supported NOT VALID constraints. Review indexes, partition restrictions and deployment context in a disposable database.
4. Transition the view, FKs, application readers and writers. Confirm consumer ownership and observe old-key usage during an agreed window.
5. Contract only after the transition gates pass and a separate destructive review approves removal. Retain recoverable source data and tested backups. Reverse DDL cannot restore lost data.

Artifacts are [schema.dbdep.json](schema.dbdep.json), [impact.json](impact.json), the standalone interactive [impact.html](impact.html), [report.md](report.md), and the staged [review report](review/report.md), [review HTML](review/report.html), and [review JSON](review/review.json). The hypothetical [proposal-analysis.sql](proposal-analysis.sql) exists only to analyze the requested operation.

Strict validation of the base model passed with no errors. It contains 52 nodes, 98 edges, 12 evidence records and 8 unknowns. All recorded CLI commands completed with exit code 0. HTML was generated, but browser interaction and visual appearance were not tested. No SQL was executed and no database connection was made.
