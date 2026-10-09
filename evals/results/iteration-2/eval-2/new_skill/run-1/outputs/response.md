Both analytics.order_summary and analytics.monthly_revenue depend on sales.orders.total_amount. Arrows below mean the source depends on the target, so impact follows these paths in reverse:

1. analytics.order_summary -> sales.orders.total_amount.
2. analytics.monthly_revenue -> analytics.order_summary.total_amount -> analytics.order_summary -> sales.orders.total_amount.

The second path includes the column's contains edge to its owning view. It is graph reachability, not a claim that every view output expression depends on total_amount.

| Catalog evidence | Recorded dependency |
|---|---|
| ev:90a64f3016d97b0343f1bd48, edge:7382463a30822eedad6c5a9a | pg_depend, pg_rewrite:16399:0 -> pg_class:16389:2. The order_summary rewrite rule references orders column 2. deptype=n. |
| ev:4e94d8a44687244d3018b756, edge:5478cb147e8a08cfcc0208bf | pg_depend, pg_rewrite:16403:0 -> pg_class:16396:2. The monthly_revenue rewrite rule references order_summary column 2. deptype=n. |
| ev:c7362b01ada7e5f7494ecbf7, edge:9efce2644f223eca12a5d782 | pg_attribute, pg_class:16396:2. Establishes order_summary.total_amount's ownership by order_summary. |

These are OBSERVED rows from [the supplied catalog snapshot](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/inputs/examples/analytics/catalog.json), captured at 2026-10-09T11:32:45.035603-05:00. Their pg_depend query hash is sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85. The capture addresses are local to that snapshot. [schema.sql](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/inputs/examples/analytics/schema.sql:4) independently supplies PARSED definitions for order_summary and monthly_revenue. I analyzed the DDL and capture separately, without pretending to merge their coverage.

For a DROP, RESTRICT refuses the operation when PostgreSQL finds relevant dependent objects, such as these views, that have not been removed explicitly. CASCADE permits PostgreSQL to remove dependents under its catalog deletion rules. Internal ownership, rewrite rules, row/array types and dependency codes affect what actually disappears. These paths are not an exact deletion closure, and CASCADE is not a safety approval. Recorded catalog dependencies also omit application SQL and runtime/dynamic targets.

Artifacts: [catalog model](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/eval-2/new_skill/run-1/outputs/catalog.dbdep.json), [separate DDL model](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/eval-2/new_skill/run-1/outputs/schema.dbdep.json), [all impact paths](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/eval-2/new_skill/run-1/outputs/impact.json), [interactive path explorer](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/eval-2/new_skill/run-1/outputs/impact.html), [catalog evidence inventory](C:/Users/josed/Desktop/Jose/whetstone-dev/database-dependency-migration-workspace/iteration-2/eval-2/new_skill/run-1/outputs/report.md).

Both models passed strict validation with no errors. The capture model has 22 nodes, 29 edges, 43 evidence items and 1 UNKNOWN coverage entry. Its reverse impact contains 10 nodes, including the two views, their owned columns/types and the total_amount NOT NULL constraint. These are potential affected objects, not ten promised failures. No SQL ran and no live discovery occurred. Browser behavior was not checked.
