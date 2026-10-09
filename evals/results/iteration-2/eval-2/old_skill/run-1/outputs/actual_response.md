The supplied catalog records `analytics.order_summary` as a direct dependent of `sales.orders.total_amount`. `analytics.monthly_revenue` depends transitively on that column through the first view.

The graph paths point from dependent to dependency:

- `analytics.order_summary` -> `sales.orders.total_amount`, edge `edge:7382463a30822eedad6c5a9a`. Catalog evidence `ev:90a64f3016d97b0343f1bd48` records `pg_rewrite:16399:0->pg_class:16389:2`, dependency type `n`.
- `analytics.monthly_revenue` -> `analytics.order_summary.total_amount` -> `analytics.order_summary` -> `sales.orders.total_amount`, edges `edge:5478cb147e8a08cfcc0208bf`, `edge:9efce2644f223eca12a5d782`, and `edge:7382463a30822eedad6c5a9a`. The first edge has evidence `ev:4e94d8a44687244d3018b756`, address `pg_rewrite:16403:0->pg_class:16396:2`, dependency type `n`. The middle edge is structural containment of the view column in its owner.

Both catalog dependency records are OBSERVED from `examples/analytics/catalog.json`, captured at `2026-10-09T11:32:45.035603-05:00`, using query ID `pg_depend`. The model retains the query hash and catalog addresses. Their source query hash is `sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85`. The separate DDL model supplies PARSED corroboration at `examples/analytics/schema.sql:4-5`.

For a proposed drop, RESTRICT blocks removal when relevant dependent objects remain. CASCADE permits PostgreSQL to remove dependent objects according to its catalog deletion rules, potentially including these views. Exact effects depend on the operation, dependency types and internal ownership. These reverse paths are potential impact evidence; this analyzer does not compute the exact CASCADE deletion closure or approve CASCADE.

The catalog model also includes view columns, row and array types, and the total_amount not-null constraint in its reverse impact results. Recorded catalog coverage does not establish exhaustive application or runtime consumers, and unavailable definitions remain UNKNOWN.

Artifacts are [catalog.dbdep.json](catalog.dbdep.json), [ddl.dbdep.json](ddl.dbdep.json), [impact.json](impact.json), [impact.html](impact.html), and [report.md](report.md). Both models passed strict validation with no errors. The catalog model contains 22 nodes, 29 edges, 43 evidence records and 1 unknown; the DDL model contains 11 nodes, 12 edges and 5 evidence records. All CLI commands exited 0. HTML generation was checked, but browser interaction and visual layout were not tested. No SQL or database connection was executed.
