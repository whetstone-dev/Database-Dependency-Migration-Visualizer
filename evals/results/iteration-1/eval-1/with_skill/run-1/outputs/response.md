Changing `public.customers.id` from bigint to UUID affects the customer primary key, the address and order foreign keys and their `customer_id` columns, `customer_summary`, and both supplied application queries. The order customer index is a transitive dependent. The graph reports 8 direct and 12 total potential dependents, including view-owned columns. These paths indicate review scope, not 12 proven execution failures.

Evidence is PARSED from `ecommerce/schema.sql:1-11,17-22,34-38`, `ecommerce/app/customers.sql:1` and `ecommerce/app/orders.sql:1-2`. The canonical model has 52 nodes, 98 edges, 12 evidence records and 8 UNKNOWN gaps. Strict validation passed.

The supplied contract proposal is high risk. `id::text::uuid` does not design a mapping from integer identities to UUIDs. Existing FKs, the view, application parameter/join contracts, the primary key, index and identity generation need coordinated transition. Dropping `orders.customer_id` can destroy its data and lacks evidence that consumers have moved.

Use the review-only expand, backfill, validate, transition and contract gates in [staged-migration-review.md](staged-migration-review.md). Preserve old keys while the new mapping is complete and validated. Do not use reverse DDL as a data recovery claim.

Artifacts: [canonical model](schema.dbdep.json), [interactive impact explorer](schema.html), [Markdown inventory](schema.md), [impact JSON](impact.json), [resolved evidence paths](resolved-impact-paths.json), [validation](schema-validation.json), and stage reviews in `review-expand/`, `review-backfill/` and `review-contract/`.

The reviewer reports no operations or findings and a low risk level for the UPDATE backfill. That is limited DML review coverage, not a safety verdict. Routine bodies, actual identity sequence names/default targets and runtime consumers remain UNKNOWN. No database was contacted or SQL executed. Browser interactions for this particular task's HTML were not independently tested; the same renderer was smoke checked in evaluations 3 and 7.
