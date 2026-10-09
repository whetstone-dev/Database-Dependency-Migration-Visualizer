# PostgreSQL dependency review

Analysis only. No SQL was executed by the analyzer.

Snapshot `snapshot:2675de6c67b14f27ec476950`. PostgreSQL 18, catalog_snapshot.
Nodes: 22. Edges: 29. Evidence: 44. Findings: 6. Unknowns: 1.

Arrows mean source depends on/references target. Impact walks reverse edges. Paths describe potential impact; they do not prove runtime failure or complete consumer coverage.

## Findings

### DDM012 (warning, unknown, PARSED)

Table size/traffic/runtime statistics are unavailable. Lock mode can be described but duration and downtime are unknown.

Collect labeled metadata and rehearse representative workload; do not invent row counts or timing.

Finding ID: `finding:0eb98e4f01dcc1e39c11911e`. Dimensions: locking, rewrite, unresolved_dependencies. Evidence: ev:55869a800d91529f3d4c107c.

### DDM010 (error, high, PARSED)

CASCADE can remove recorded dependent objects. The impact paths include potential static consumers too; those are not PostgreSQL's exact cascade deletion closure.

Review catalog dependency types/internal ownership and explicitly approve each removal. Prefer RESTRICT while investigating.

Finding ID: `finding:bb3848522f33610793c415a2`. Dimensions: data_loss, unresolved_dependencies. Evidence: ev:55869a800d91529f3d4c107c.

### DDM014 (error, high, PARSED)

Constraints/indexes/column-specific triggers depend on the changed object via the displayed edge kinds.

Rebuild or transition affected objects with verified order and constraint validation.

Finding ID: `finding:db4d27c584b85bd820b74833`. Dimensions: compatibility, deployment_order. Evidence: ev:55869a800d91529f3d4c107c.

### DDM001 (error, high, PARSED)

DROP COLUMN destroys column data and affects known dependency/source references.

Preserve data and transition consumers before a separately reviewed destructive contract.

Finding ID: `finding:e5625c83e8db59377c0ed674`. Dimensions: data_loss, compatibility. Evidence: ev:55869a800d91529f3d4c107c.

### DDM011 (error, high, PARSED)

Destructive contract lacks evidence of completed application transition.

Require expand/backfill/validate/transition gates before contract.

Finding ID: `finding:e80d3475d1af1f83b6d9860b`. Dimensions: deployment_order. Evidence: ev:55869a800d91529f3d4c107c.

### DDM008 (error, high, PARSED)

Known views/routines/SQL consumers reference this object. Catalog paths and parsed source references have distinct guarantees; untracked routine bodies remain UNKNOWN.

Review the supplied dependency paths and verify runtime consumers; never claim all function calls were discovered.

Finding ID: `finding:fdf60da5c1473addae40e620`. Dimensions: compatibility, unresolved_dependencies. Evidence: ev:55869a800d91529f3d4c107c.

## Coverage and unknowns

OBSERVED means supplied catalog metadata. PARSED means syntax-aware source evidence. INFERRED means unproven. UNKNOWN means unavailable or unsupported. Static analysis is not exhaustive.

- UNKNOWN: Catalog dependencies cover recorded edges only; repository/runtime consumers and some object definitions are unavailable. Evidence: ev:5c841a0b542b7bbc4a8f8471.

## Migration sequence

### expand

Add nullable replacement columns or compatible interfaces; design UUID mapping and new keys before changing identifier types.

Preconditions: Confirm PostgreSQL version, backups, ownership, consumers and feasible mapping. Review privileges and lock budget.

Verification: Rehearse DDL on a disposable database with representative data. Verify identity/sequence/default semantics.

Recovery: Stop deployment before consumers depend on the new fields; keep old fields available.

### backfill

Backfill bounded, resumable batches using reviewed transformation logic and coordinated dual writers.

Preconditions: Prove mapping uniqueness, handle concurrent writes and define throttling. Numeric identifiers do not have a general UUID cast.

Verification: Check mapping completeness, uniqueness, NULL rates and FK consistency under concurrent traffic.

Recovery: Pause batches and preserve old data; restore from tested backup only under an approved recovery procedure.

### validate

Validate CHECK/FK constraints where NOT VALID is supported. Build concurrent indexes outside transaction blocks when appropriate.

Preconditions: Confirm constraint support, partition restrictions, existing violations and resource budget. Concurrent index failure can leave an invalid index.

Verification: Check constraint validation and pg_index.indisvalid/indisready, compare old/new results and observe lock waits.

Recovery: Investigate failed validation or invalid indexes; repair/retry through separate authorized tooling.

### transition

Deploy compatible readers/writers and transition dependent FKs, views, functions, API/ORM contracts and downstream jobs.

Preconditions: Obtain explicit consumer ownership and deployment-order evidence. Account for UNKNOWN and dynamic SQL paths.

Verification: Observe application errors and old-field usage through an agreed window. Static graph paths do not prove runtime coverage.

Recovery: Revert application reads only while both representations remain consistent; otherwise prefer roll-forward.

### contract

Remove legacy objects only after verified transition and a separate destructive-change review.

Preconditions: Confirm no remaining consumers, validated keys, tested backups and signed-off CASCADE consequences. Schedule lock acquisition.

Verification: Reinspect schema, compare snapshots and run application integration checks. Do not promise zero downtime.

Recovery: Drops can lose data. Reverse DDL does not restore it; use tested recovery or roll-forward with an operator.

Affected root: `postgresql:local/sales/column/orders/total_amount/`.

- `postgresql:local/analytics/column/monthly_revenue/revenue/` via edge:c980619568e864c98439e05f, edge:5478cb147e8a08cfcc0208bf, edge:9efce2644f223eca12a5d782, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/column/order_summary/id/` via edge:88287709ee258a2673402599, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/column/order_summary/total_amount/` via edge:9efce2644f223eca12a5d782, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/type//_monthly_revenue/` via edge:55cc31eaf22b798c2164ec54, edge:7f81923f375e97d964167b72, edge:5478cb147e8a08cfcc0208bf, edge:9efce2644f223eca12a5d782, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/type//_order_summary/` via edge:4d95cd8f47074ab437ac62a5, edge:b6a319aa26a2f9a28fb01645, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/type//monthly_revenue/` via edge:7f81923f375e97d964167b72, edge:5478cb147e8a08cfcc0208bf, edge:9efce2644f223eca12a5d782, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/type//order_summary/` via edge:b6a319aa26a2f9a28fb01645, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/view//monthly_revenue/` via edge:5478cb147e8a08cfcc0208bf, edge:9efce2644f223eca12a5d782, edge:7382463a30822eedad6c5a9a
- `postgresql:local/analytics/view//order_summary/` via edge:7382463a30822eedad6c5a9a
- `postgresql:local/sales/constraint/orders/orders_total_amount_not_null/` via edge:33adc274c68e8a9db5269838

## Object inventory

| ID | Object | Kind | Status | Evidence |
|---|---|---|---|---|
| postgresql:local/analytics/column/monthly_revenue/revenue/ | analytics.monthly_revenue.revenue | column | OBSERVED | ev:b0983bdf4576283eda0289a3 |
| postgresql:local/analytics/column/order_summary/id/ | analytics.order_summary.id | column | OBSERVED | ev:5a4d372fdb8de56e300b05a8 |
| postgresql:local/analytics/column/order_summary/total_amount/ | analytics.order_summary.total_amount | column | OBSERVED | ev:c7362b01ada7e5f7494ecbf7 |
| postgresql:local/analytics/schema//analytics/ | analytics.analytics | schema | OBSERVED | ev:2c83deeee37ec3e87689b909 |
| postgresql:local/analytics/type//_monthly_revenue/ | analytics._monthly_revenue | type | OBSERVED | ev:845e1f63c21ede90483c793e |
| postgresql:local/analytics/type//_order_summary/ | analytics._order_summary | type | OBSERVED | ev:a0c24950cc86ece96b03a0ae |
| postgresql:local/analytics/type//monthly_revenue/ | analytics.monthly_revenue | type | OBSERVED | ev:cfca16ac9a1c3ff6fa4bc14a |
| postgresql:local/analytics/type//order_summary/ | analytics.order_summary | type | OBSERVED | ev:02bb36f63e76a8251e5fe5fc |
| postgresql:local/analytics/view//monthly_revenue/ | analytics.monthly_revenue | view | OBSERVED | ev:107b9e1e4e910e30322cfcaa |
| postgresql:local/analytics/view//order_summary/ | analytics.order_summary | view | OBSERVED | ev:5389583ffac1b21379672f55 |
| postgresql:local/pg_catalog/extension//plpgsql/ | pg_catalog.plpgsql | extension | OBSERVED | ev:eeb1c6f3bc5d0853972c9992 |
| postgresql:local/public/schema//public/ | public.public | schema | OBSERVED | ev:8a43b97405c43896b7f874b9 |
| postgresql:local/sales/column/orders/id/ | sales.orders.id | column | OBSERVED | ev:b99d0e21d0e3f87f72381177 |
| postgresql:local/sales/column/orders/total_amount/ | sales.orders.total_amount | column | OBSERVED | ev:4dbb656b27318ea9f0bfed20 |
| postgresql:local/sales/constraint/orders/orders_id_not_null/ | sales.orders.orders_id_not_null | constraint | OBSERVED | ev:601c22d1fc5af5606bd3d4ba |
| postgresql:local/sales/constraint/orders/orders_pkey/ | sales.orders.orders_pkey | constraint | OBSERVED | ev:7343e9fd75a693aece425800 |
| postgresql:local/sales/constraint/orders/orders_total_amount_not_null/ | sales.orders.orders_total_amount_not_null | constraint | OBSERVED | ev:e054f21253244cf1902a0b00 |
| postgresql:local/sales/index//orders_pkey/ | sales.orders_pkey | index | OBSERVED | ev:12979d2993a242348e218b7a |
| postgresql:local/sales/schema//sales/ | sales.sales | schema | OBSERVED | ev:f86c03cd14b6fade625bb6ee |
| postgresql:local/sales/table//orders/ | sales.orders | table | OBSERVED | ev:6713d46d22a2df2cd32e076b |
| postgresql:local/sales/type//_orders/ | sales._orders | type | OBSERVED | ev:272377cb956d0eec9031e4c7 |
| postgresql:local/sales/type//orders/ | sales.orders | type | OBSERVED | ev:3506d2f1190ae064132ef7d8 |

## Edge inventory

| ID | Source | Target | Kind | Status |
|---|---|---|---|---|
| edge:056208d89c84aa3d6fecdb15 | postgresql:local/analytics/view//order_summary/ | postgresql:local/analytics/schema//analytics/ | catalog_dependency | OBSERVED |
| edge:0a8c47aa37fc354f4b4568c2 | postgresql:local/sales/index//orders_pkey/ | postgresql:local/sales/table//orders/ | contains | OBSERVED |
| edge:1e22031734eb8d95d585eab9 | postgresql:local/analytics/view//monthly_revenue/ | postgresql:local/analytics/schema//analytics/ | catalog_dependency | OBSERVED |
| edge:33adc274c68e8a9db5269838 | postgresql:local/sales/constraint/orders/orders_total_amount_not_null/ | postgresql:local/sales/column/orders/total_amount/ | expression_reference | OBSERVED |
| edge:46be06185d2d854f7d861dc5 | postgresql:local/sales/type//_orders/ | postgresql:local/sales/type//orders/ | catalog_dependency | OBSERVED |
| edge:46eea5bd97bf831a975c7342 | postgresql:local/sales/constraint/orders/orders_id_not_null/ | postgresql:local/sales/table//orders/ | contains | OBSERVED |
| edge:48b0c940d4da7c979141a6b6 | postgresql:local/sales/constraint/orders/orders_pkey/ | postgresql:local/sales/column/orders/id/ | catalog_dependency | OBSERVED |
| edge:4d95cd8f47074ab437ac62a5 | postgresql:local/analytics/type//_order_summary/ | postgresql:local/analytics/type//order_summary/ | catalog_dependency | OBSERVED |
| edge:5478cb147e8a08cfcc0208bf | postgresql:local/analytics/view//monthly_revenue/ | postgresql:local/analytics/column/order_summary/total_amount/ | catalog_dependency | OBSERVED |
| edge:55cc31eaf22b798c2164ec54 | postgresql:local/analytics/type//_monthly_revenue/ | postgresql:local/analytics/type//monthly_revenue/ | catalog_dependency | OBSERVED |
| edge:585b66573bc42ab100b3a1dc | postgresql:local/sales/index//orders_pkey/ | postgresql:local/sales/column/orders/id/ | expression_reference | OBSERVED |
| edge:5888b841d8ac8406dc4efa32 | postgresql:local/analytics/view//order_summary/ | postgresql:local/sales/column/orders/id/ | catalog_dependency | OBSERVED |
| edge:6de9a81ca0690cfadea55519 | postgresql:local/sales/constraint/orders/orders_pkey/ | postgresql:local/sales/column/orders/id/ | expression_reference | OBSERVED |
| edge:7382463a30822eedad6c5a9a | postgresql:local/analytics/view//order_summary/ | postgresql:local/sales/column/orders/total_amount/ | catalog_dependency | OBSERVED |
| edge:7dbacce2ca01cccde5c50180 | postgresql:local/sales/table//orders/ | postgresql:local/sales/schema//sales/ | catalog_dependency | OBSERVED |
| edge:7f81923f375e97d964167b72 | postgresql:local/analytics/type//monthly_revenue/ | postgresql:local/analytics/view//monthly_revenue/ | catalog_dependency | OBSERVED |
| edge:84f3b58a92a101d5ffe166bd | postgresql:local/sales/constraint/orders/orders_pkey/ | postgresql:local/sales/table//orders/ | contains | OBSERVED |
| edge:88287709ee258a2673402599 | postgresql:local/analytics/column/order_summary/id/ | postgresql:local/analytics/view//order_summary/ | contains | OBSERVED |
| edge:8ee17f769a71eb691e4a955d | postgresql:local/sales/constraint/orders/orders_id_not_null/ | postgresql:local/sales/column/orders/id/ | expression_reference | OBSERVED |
| edge:8fa19659c0a992517783b817 | postgresql:local/sales/constraint/orders/orders_total_amount_not_null/ | postgresql:local/sales/table//orders/ | contains | OBSERVED |
| edge:9efce2644f223eca12a5d782 | postgresql:local/analytics/column/order_summary/total_amount/ | postgresql:local/analytics/view//order_summary/ | contains | OBSERVED |
| edge:ad60973d736404b83ade4847 | postgresql:local/sales/index//orders_pkey/ | postgresql:local/sales/constraint/orders/orders_pkey/ | catalog_dependency | OBSERVED |
| edge:b6a319aa26a2f9a28fb01645 | postgresql:local/analytics/type//order_summary/ | postgresql:local/analytics/view//order_summary/ | catalog_dependency | OBSERVED |
| edge:c980619568e864c98439e05f | postgresql:local/analytics/column/monthly_revenue/revenue/ | postgresql:local/analytics/view//monthly_revenue/ | contains | OBSERVED |
| edge:d8b24b933beba20d5e8bbe59 | postgresql:local/sales/constraint/orders/orders_id_not_null/ | postgresql:local/sales/column/orders/id/ | catalog_dependency | OBSERVED |
| edge:d8c8b9c4eefcf4110513f79c | postgresql:local/sales/type//orders/ | postgresql:local/sales/table//orders/ | catalog_dependency | OBSERVED |
| edge:e4981304a9018319416b1400 | postgresql:local/sales/column/orders/id/ | postgresql:local/sales/table//orders/ | contains | OBSERVED |
| edge:f687f0b82151e49858eeca4d | postgresql:local/sales/constraint/orders/orders_total_amount_not_null/ | postgresql:local/sales/column/orders/total_amount/ | catalog_dependency | OBSERVED |
| edge:fa90f9ab092de29493c87262 | postgresql:local/sales/column/orders/total_amount/ | postgresql:local/sales/table//orders/ | contains | OBSERVED |

## Evidence inventory

| ID | Origin | Location | Hash |
|---|---|---|---|
| ev:02bb36f63e76a8251e5fe5fc | postgres_catalog | pg_type at 2026-10-09T16:32:45.035603+00:00 (pg_type:16398:0) | sha256:9c16999f2382b3d4748bd8fe09569edfb24885a9cff77a47d3d7baaf2c492bce |
| ev:0945ec2f971483bce560c4b2 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_type:16390:0-&gt;pg_type:16391:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:0dcbc87e35e0e8b5c14d9e5c | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_class:16400:0-&gt;pg_namespace:16388:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:107b9e1e4e910e30322cfcaa | postgres_catalog | pg_class at 2026-10-09T16:32:45.035603+00:00 (pg_class:16400:0) | sha256:09458ef68619d6c107738d0ed071df3b183d77f14788931aeccdd5d56c8a45f0 |
| ev:10a5cef22313ed07c5c01130 | postgres_catalog | pg_constraint at 2026-10-09T16:32:45.035603+00:00 () | sha256:fa9b4946bdb637292ddf707df2a1d0b3888a370a36a96667834b203e7bd5ff93 |
| ev:12979d2993a242348e218b7a | postgres_catalog | pg_class at 2026-10-09T16:32:45.035603+00:00 (pg_class:16394:0) | sha256:09458ef68619d6c107738d0ed071df3b183d77f14788931aeccdd5d56c8a45f0 |
| ev:272377cb956d0eec9031e4c7 | postgres_catalog | pg_type at 2026-10-09T16:32:45.035603+00:00 (pg_type:16390:0) | sha256:9c16999f2382b3d4748bd8fe09569edfb24885a9cff77a47d3d7baaf2c492bce |
| ev:2b726a8c9138c587bda8edf9 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_type:16398:0-&gt;pg_class:16396:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:2c83deeee37ec3e87689b909 | postgres_catalog | pg_namespace at 2026-10-09T16:32:45.035603+00:00 (pg_namespace:16388:0) | sha256:e044ff4af53fb9dbe91eff0599e205ddc4b6dc24d8e26d7365162e77dfa0d7ba |
| ev:3506d2f1190ae064132ef7d8 | postgres_catalog | pg_type at 2026-10-09T16:32:45.035603+00:00 (pg_type:16391:0) | sha256:9c16999f2382b3d4748bd8fe09569edfb24885a9cff77a47d3d7baaf2c492bce |
| ev:442dac27d805b6a84bbebfb7 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_rewrite:16403:0-&gt;pg_class:16400:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:45d9b35cafa103957cf2af5e | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_class:16396:0-&gt;pg_namespace:16388:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:4dbb656b27318ea9f0bfed20 | postgres_catalog | pg_attribute at 2026-10-09T16:32:45.035603+00:00 (pg_class:16389:2) | sha256:4b9df534f307951c1815569ed2d46ab00935dcf74f36048065a0ae379196db0e |
| ev:4e94d8a44687244d3018b756 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_rewrite:16403:0-&gt;pg_class:16396:2) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:5389583ffac1b21379672f55 | postgres_catalog | pg_class at 2026-10-09T16:32:45.035603+00:00 (pg_class:16396:0) | sha256:09458ef68619d6c107738d0ed071df3b183d77f14788931aeccdd5d56c8a45f0 |
| ev:53e332384fa39e3e95d5c713 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_type:16391:0-&gt;pg_class:16389:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:549eb3a8383dbb88a06197b6 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_class:16394:0-&gt;pg_constraint:16395:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:55869a800d91529f3d4c107c | migration_diff | examples/analytics/drop.sql:1-1 | sha256:297b740b46ede38605d0d18d43357d4abfd26ee5803285d390623a59cbb52201 |
| ev:5a4d372fdb8de56e300b05a8 | postgres_catalog | pg_attribute at 2026-10-09T16:32:45.035603+00:00 (pg_class:16396:1) | sha256:4b9df534f307951c1815569ed2d46ab00935dcf74f36048065a0ae379196db0e |
| ev:5c841a0b542b7bbc4a8f8471 | postgres_catalog | server_version at 2026-10-09T16:32:45.035603+00:00 () | sha256:82dac9244dba639bc043db976903d9a364691818ca5cac80d5b2e24fbf90a76d |
| ev:5ebda9f77097aff56bde2cf2 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_constraint:16392:0-&gt;pg_class:16389:1) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:601c22d1fc5af5606bd3d4ba | postgres_catalog | pg_constraint at 2026-10-09T16:32:45.035603+00:00 (pg_constraint:16392:0) | sha256:fa9b4946bdb637292ddf707df2a1d0b3888a370a36a96667834b203e7bd5ff93 |
| ev:6713d46d22a2df2cd32e076b | postgres_catalog | pg_class at 2026-10-09T16:32:45.035603+00:00 (pg_class:16389:0) | sha256:09458ef68619d6c107738d0ed071df3b183d77f14788931aeccdd5d56c8a45f0 |
| ev:7343e9fd75a693aece425800 | postgres_catalog | pg_constraint at 2026-10-09T16:32:45.035603+00:00 (pg_constraint:16395:0) | sha256:fa9b4946bdb637292ddf707df2a1d0b3888a370a36a96667834b203e7bd5ff93 |
| ev:845e1f63c21ede90483c793e | postgres_catalog | pg_type at 2026-10-09T16:32:45.035603+00:00 (pg_type:16401:0) | sha256:9c16999f2382b3d4748bd8fe09569edfb24885a9cff77a47d3d7baaf2c492bce |
| ev:8a43b97405c43896b7f874b9 | postgres_catalog | pg_namespace at 2026-10-09T16:32:45.035603+00:00 (pg_namespace:2200:0) | sha256:e044ff4af53fb9dbe91eff0599e205ddc4b6dc24d8e26d7365162e77dfa0d7ba |
| ev:90a64f3016d97b0343f1bd48 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_rewrite:16399:0-&gt;pg_class:16389:2) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:93a6a1713544f0a43f57935e | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_rewrite:16399:0-&gt;pg_class:16396:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:94bf53b50e435deee109a236 | postgres_catalog | pg_index at 2026-10-09T16:32:45.035603+00:00 () | sha256:99430df1dcc4c9019f78d316353b0b066b0c8ae41613397a1627e53387367ce9 |
| ev:97b8b53b0789c823f69fe6a5 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_type:16401:0-&gt;pg_type:16402:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:a0c24950cc86ece96b03a0ae | postgres_catalog | pg_type at 2026-10-09T16:32:45.035603+00:00 (pg_type:16397:0) | sha256:9c16999f2382b3d4748bd8fe09569edfb24885a9cff77a47d3d7baaf2c492bce |
| ev:a18cd7ab749ffd45da973e4f | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_type:16397:0-&gt;pg_type:16398:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:ae9518b47e51bd76d8120289 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_rewrite:16399:0-&gt;pg_class:16389:1) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:b0983bdf4576283eda0289a3 | postgres_catalog | pg_attribute at 2026-10-09T16:32:45.035603+00:00 (pg_class:16400:1) | sha256:4b9df534f307951c1815569ed2d46ab00935dcf74f36048065a0ae379196db0e |
| ev:b99d0e21d0e3f87f72381177 | postgres_catalog | pg_attribute at 2026-10-09T16:32:45.035603+00:00 (pg_class:16389:1) | sha256:4b9df534f307951c1815569ed2d46ab00935dcf74f36048065a0ae379196db0e |
| ev:c7362b01ada7e5f7494ecbf7 | postgres_catalog | pg_attribute at 2026-10-09T16:32:45.035603+00:00 (pg_class:16396:2) | sha256:4b9df534f307951c1815569ed2d46ab00935dcf74f36048065a0ae379196db0e |
| ev:cfca16ac9a1c3ff6fa4bc14a | postgres_catalog | pg_type at 2026-10-09T16:32:45.035603+00:00 (pg_type:16402:0) | sha256:9c16999f2382b3d4748bd8fe09569edfb24885a9cff77a47d3d7baaf2c492bce |
| ev:d680e8bdddcc4d7014effc22 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_class:16389:0-&gt;pg_namespace:16387:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:ddddf24415e7310b1823ff63 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_constraint:16393:0-&gt;pg_class:16389:2) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:e054f21253244cf1902a0b00 | postgres_catalog | pg_constraint at 2026-10-09T16:32:45.035603+00:00 (pg_constraint:16393:0) | sha256:fa9b4946bdb637292ddf707df2a1d0b3888a370a36a96667834b203e7bd5ff93 |
| ev:e073c156d4870e6df674b8d8 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_constraint:16395:0-&gt;pg_class:16389:1) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:e1b7cfaf007c8cada9f1ae20 | postgres_catalog | pg_depend at 2026-10-09T16:32:45.035603+00:00 (pg_type:16402:0-&gt;pg_class:16400:0) | sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 |
| ev:eeb1c6f3bc5d0853972c9992 | postgres_catalog | pg_extension at 2026-10-09T16:32:45.035603+00:00 (pg_extension:15210:0) | sha256:e20869df2b51a80de931d27c03ff98f05bc37f29466b8103f3c782ee53127ec3 |
| ev:f86c03cd14b6fade625bb6ee | postgres_catalog | pg_namespace at 2026-10-09T16:32:45.035603+00:00 (pg_namespace:16387:0) | sha256:e044ff4af53fb9dbe91eff0599e205ddc4b6dc24d8e26d7365162e77dfa0d7ba |
