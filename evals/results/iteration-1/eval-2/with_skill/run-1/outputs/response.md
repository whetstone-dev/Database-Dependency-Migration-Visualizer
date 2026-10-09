`analytics.order_summary` directly depends on `sales.orders.total_amount`; `analytics.monthly_revenue` depends on it transitively through `order_summary.total_amount`. Both the parsed DDL and supplied catalog support that chain.

The observed graph path is `monthly_revenue` -> `order_summary.total_amount` -> `order_summary` -> `sales.orders.total_amount`. The middle ownership edge connects a view column to its view. Arrows mean the source depends on the target. Reverse traversal discovers potential consumers.

The two view dependency edges preserve normal dependency type `n`, `pg_rewrite` addresses and `pg_depend` evidence captured at `2026-10-09T16:10:28.084359+00:00`: `pg_rewrite:16555:0->pg_class:16545:2` and `pg_rewrite:16559:0->pg_class:16552:2`. Their query hash is `sha256:8db273e34d7c67eb4b59410d9be9c1cdddeb14c496658eb7ea62b0d3086a5c35`. File evidence is PARSED from `analytics/schema.sql:4-5`; catalog evidence is OBSERVED supplied metadata, not a live discovery result.

RESTRICT blocks removal while these normal dependent views exist. CASCADE permits PostgreSQL to remove recorded dependents, including transitive dependent views. Automatic/internal objects have different ownership semantics. The graph's 10 catalog dependents also include view-owned columns, row/array types and the column's NOT NULL constraint; it is not an exact CASCADE deletion closure or an exhaustive list of runtime consumers.

Artifacts: [catalog model](analytics-catalog.dbdep.json), [DDL model](analytics-ddl.dbdep.json), [observed paths](catalog-resolved-paths.json), [parsed paths](ddl-resolved-paths.json), [catalog impact](catalog-impact.json), [catalog explorer](catalog.html), and [CASCADE proposal review](cascade-review/report.html). Both models and the generated review model passed strict validation. They contain 22 nodes/29 edges and 11 nodes/12 edges respectively.

Catalog and repository models were kept separate because this toolkit does not merge them. The supplied capture's freshness and production correspondence were not verified. No SQL, live discovery, exact drop simulation or browser checks for these HTML files were performed.
