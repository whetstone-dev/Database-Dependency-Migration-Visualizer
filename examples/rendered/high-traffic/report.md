# PostgreSQL dependency review

Analysis only. No SQL was executed by the analyzer.

Snapshot ` snapshot:0362657069299f80c25efffe `. PostgreSQL 18, offline\_ddl.
Nodes: 52. Edges: 98. Evidence: 18. Findings: 4. Unknowns: 8.

Arrows mean source depends on/references target. Impact walks reverse edges. Paths describe potential impact; they do not prove runtime failure or complete consumer coverage.

## Findings

### DDM014 (error, high, PARSED)

Constraints/indexes/column-specific triggers depend on the changed object via the displayed edge kinds.

Rebuild or transition affected objects with verified order and constraint validation.

Finding ID: ` finding:0ea66c21e46700e8de9703bd `. Dimensions: compatibility, deployment\_order. Evidence: ev:551306041c228ae54da88290.

### DDM006 (error, high, PARSED)

CREATE INDEX CONCURRENTLY is forbidden inside a transaction block, including an externally declared single-transaction runner.

Run the reviewed concurrent index operation outside transaction blocks; inspect invalid-index aftermath on failure.

Finding ID: ` finding:61f2a716d49ea583a4524bbf `. Dimensions: deployment\_order, locking. Evidence: ev:f5f5e93f642715781126c9c2.

### DDM005 (warning, medium, PARSED)

Regular CREATE INDEX takes SHARE lock and blocks writes. Impact depends on table size, workload and lock waits; no duration is predicted.

Consider CREATE INDEX CONCURRENTLY outside transaction blocks; check version/partition restrictions and invalid indexes.

Finding ID: ` finding:b2c6ce04fbdf286d25f7cfc3 `. Dimensions: locking. Evidence: ev:dcedb83e305f10addb8f3fe7.

### DDM002 (error, high, PARSED)

Type transition numeric\(12,2\) to float8. Conversion compatibility requires type/cast and data verification. PostgreSQL 18 ALTER COLUMN TYPE generally takes ACCESS EXCLUSIVE; rewrite/index rebuild depends on cast, typmod and USING expression. Rewrite and lock duration are conditional.

Design and verify a mapping/replacement column. Check USING, defaults, FKs, views, indexes and actual cast support in a disposable database.

Finding ID: ` finding:e8c62af5af6d801991d01b20 `. Dimensions: compatibility, locking, rewrite. Evidence: ev:551306041c228ae54da88290.

## Coverage and unknowns

OBSERVED means supplied catalog metadata. PARSED means syntax-aware source evidence. INFERRED means unproven. UNKNOWN means unavailable or unsupported. Static analysis is not exhaustive.

- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:7de9792a75dda688bf1f738f.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:8dadc8fc9c511aafd4803a87.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:4f849d665202a664e7893d4a.
- UNKNOWN: Routine body/runtime references are not exhaustively analyzed offline, including dynamic SQL. Evidence: ev:e9af3cfadad5d8900305d336.
- UNKNOWN: Default/generated function and sequence expression targets need catalog resolution. Evidence: ev:40680f826d95f1ec183340ed.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:40680f826d95f1ec183340ed.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:e3fa1e6bfbfed48ae579bc40.
- UNKNOWN: Default/generated function and sequence expression targets need catalog resolution. Evidence: ev:7de9792a75dda688bf1f738f.

## Migration sequence

### expand

Where a replacement is needed, add nullable columns or compatible interfaces. Define the replacement representation and any identifier mapping before changing keys.

Preconditions: Confirm PostgreSQL version, backups, ownership, consumers and feasible mapping. Review privileges and lock budget.

Verification: Rehearse DDL on a disposable database with representative data. Verify identity/sequence/default semantics.

Recovery: Stop deployment before consumers depend on the new fields; keep old fields available.

### backfill

If stored data needs a representation change, backfill bounded, resumable batches using reviewed transformation logic and coordinated dual writers.

Preconditions: Validate transformation semantics and mapping uniqueness where identifiers change. Handle concurrent writes and define throttling.

Verification: Check transformation results, applicable mapping completeness and uniqueness, NULL rates and FK consistency under concurrent traffic.

Recovery: Pause batches and preserve old data; restore from tested backup only under an approved recovery procedure.

### validate

Validate CHECK/FK constraints where NOT VALID is supported. Build concurrent indexes outside transaction blocks when appropriate.

Preconditions: Confirm constraint support, partition restrictions, existing violations and resource budget. Concurrent index failure can leave an invalid index.

Verification: Check constraint validation and pg\_index.indisvalid/indisready, compare old/new results and observe lock waits.

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

Affected root: ` postgresql:local/public/column/orders/total_amount/ `.

- ` postgresql:local/public/constraint/orders/orders_total_amount_check__8c94b42a7e78/8c94b42a7e78904691546dba ` via edge:bc0cecf27a9d335975ad3a49

## Object inventory

| ID | Object | Kind | Status | Evidence |
|---|---|---|---|---|
| postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Fcustomers.sql%3Aev%3Ae4dc7c3f3bcbc60c845f14b5/ | application."examples/ecommerce/app/customers.sql:ev:e4dc7c3f3bcbc60c845f14b5" | query | PARSED | ev:e4dc7c3f3bcbc60c845f14b5 |
| postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | application."examples/ecommerce/app/orders.sql:ev:f8c7e18154ef774049bc8694" | query | PARSED | ev:f8c7e18154ef774049bc8694 |
| postgresql:local/public/column/addresses/city/ | public.addresses.city | column | PARSED | ev:4f849d665202a664e7893d4a |
| postgresql:local/public/column/addresses/customer\_id/ | public.addresses.customer\_id | column | PARSED | ev:4f849d665202a664e7893d4a |
| postgresql:local/public/column/addresses/id/ | public.addresses.id | column | PARSED | ev:4f849d665202a664e7893d4a |
| postgresql:local/public/column/customer\_summary/email/ | public.customer\_summary.email | column | PARSED | ev:c81447f17e11c2d5b6c401da |
| postgresql:local/public/column/customer\_summary/id/ | public.customer\_summary.id | column | PARSED | ev:c81447f17e11c2d5b6c401da |
| postgresql:local/public/column/customer\_summary/order\_count/ | public.customer\_summary.order\_count | column | PARSED | ev:c81447f17e11c2d5b6c401da |
| postgresql:local/public/column/customers/email/ | public.customers.email | column | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/column/customers/id/ | public.customers.id | column | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/column/customers/name/ | public.customers.name | column | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/column/customers/updated\_at/ | public.customers.updated\_at | column | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/column/order\_items/order\_id/ | public.order\_items.order\_id | column | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/column/order\_items/product\_id/ | public.order\_items.product\_id | column | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/column/order\_items/quantity/ | public.order\_items.quantity | column | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/column/orders/created\_at/ | public.orders.created\_at | column | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/column/orders/customer\_id/ | public.orders.customer\_id | column | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/column/orders/id/ | public.orders.id | column | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/column/orders/total\_amount/ | public.orders.total\_amount | column | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/column/payments/amount/ | public.payments.amount | column | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/column/payments/id/ | public.payments.id | column | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/column/payments/order\_id/ | public.payments.order\_id | column | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/column/products/id/ | public.products.id | column | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/column/products/price/ | public.products.price | column | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/column/products/sku/ | public.products.sku | column | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/constraint/addresses/addresses\_customer\_id\_fkey/884466556956c633a5c8fcd4 | public.addresses.addresses\_customer\_id\_fkey | constraint | PARSED | ev:4f849d665202a664e7893d4a |
| postgresql:local/public/constraint/addresses/addresses\_pkey/62676e56159a610040517422 | public.addresses.addresses\_pkey | constraint | PARSED | ev:4f849d665202a664e7893d4a |
| postgresql:local/public/constraint/customers/customers\_email\_key/30ba9a81fb7ea6ec9ff167f7 | public.customers.customers\_email\_key | constraint | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/constraint/customers/customers\_pkey/62676e56159a610040517422 | public.customers.customers\_pkey | constraint | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/constraint/order\_items/order\_items\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | public.order\_items.order\_items\_order\_id\_fkey | constraint | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/constraint/order\_items/order\_items\_pkey/0f66fa763c977cd394d53f04 | public.order\_items.order\_items\_pkey | constraint | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/constraint/order\_items/order\_items\_product\_id\_fkey/4f7950eb41a49d97e2c7146e | public.order\_items.order\_items\_product\_id\_fkey | constraint | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/constraint/order\_items/order\_items\_quantity\_check\_\_485b310e0371/485b310e03717749fd366756 | public.order\_items.order\_items\_quantity\_check\_\_485b310e0371 | constraint | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/constraint/orders/orders\_customer\_id\_fkey/884466556956c633a5c8fcd4 | public.orders.orders\_customer\_id\_fkey | constraint | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/constraint/orders/orders\_pkey/62676e56159a610040517422 | public.orders.orders\_pkey | constraint | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/constraint/orders/orders\_total\_amount\_check\_\_8c94b42a7e78/8c94b42a7e78904691546dba | public.orders.orders\_total\_amount\_check\_\_8c94b42a7e78 | constraint | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/constraint/payments/payments\_amount\_check\_\_2fbbb5aae972/2fbbb5aae972c43b3e1ddb51 | public.payments.payments\_amount\_check\_\_2fbbb5aae972 | constraint | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/constraint/payments/payments\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | public.payments.payments\_order\_id\_fkey | constraint | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/constraint/payments/payments\_pkey/62676e56159a610040517422 | public.payments.payments\_pkey | constraint | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/constraint/products/products\_pkey/62676e56159a610040517422 | public.products.products\_pkey | constraint | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/constraint/products/products\_price\_check\_\_a1bdfb6cc254/a1bdfb6cc254d41061cec471 | public.products.products\_price\_check\_\_a1bdfb6cc254 | constraint | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/constraint/products/products\_sku\_key/30ba9a81fb7ea6ec9ff167f7 | public.products.products\_sku\_key | constraint | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/function//touch\_customer/ | public.touch\_customer | function | PARSED | ev:e9af3cfadad5d8900305d336 |
| postgresql:local/public/index//orders\_customer\_idx/ | public.orders\_customer\_idx | index | PARSED | ev:3eff11898bac02d99ee08daf |
| postgresql:local/public/table//addresses/ | public.addresses | table | PARSED | ev:4f849d665202a664e7893d4a |
| postgresql:local/public/table//customers/ | public.customers | table | PARSED | ev:40680f826d95f1ec183340ed |
| postgresql:local/public/table//order\_items/ | public.order\_items | table | PARSED | ev:b306c585df0ee00d863316dd |
| postgresql:local/public/table//orders/ | public.orders | table | PARSED | ev:7de9792a75dda688bf1f738f |
| postgresql:local/public/table//payments/ | public.payments | table | PARSED | ev:e3fa1e6bfbfed48ae579bc40 |
| postgresql:local/public/table//products/ | public.products | table | PARSED | ev:8dadc8fc9c511aafd4803a87 |
| postgresql:local/public/trigger/customers/customers\_touch/ | public.customers.customers\_touch | trigger | PARSED | ev:776d7da11045ee31e44912e0 |
| postgresql:local/public/view//customer\_summary/ | public.customer\_summary | view | PARSED | ev:c81447f17e11c2d5b6c401da |

## Edge inventory

| ID | Source | Target | Kind | Status |
|---|---|---|---|---|
| edge:014fb6369ba96ca9ec2ffb6e | postgresql:local/public/index//orders\_customer\_idx/ | postgresql:local/public/column/orders/customer\_id/ | expression\_reference | PARSED |
| edge:0d63cdfda898dda0d0ad8205 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Fcustomers.sql%3Aev%3Ae4dc7c3f3bcbc60c845f14b5/ | postgresql:local/public/column/customers/name/ | query\_reference | PARSED |
| edge:0fd89a08c8cb49371591999e | postgresql:local/public/constraint/order\_items/order\_items\_quantity\_check\_\_485b310e0371/485b310e03717749fd366756 | postgresql:local/public/column/order\_items/quantity/ | expression\_reference | PARSED |
| edge:122fa6ad729c390103dc691f | postgresql:local/public/index//orders\_customer\_idx/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:18a94627aae399dfc7524ec3 | postgresql:local/public/column/orders/id/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:1a413343114cc7a6e07d44c2 | postgresql:local/public/column/customers/updated\_at/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:1aa24304fac7db22fadbc3a2 | postgresql:local/public/column/addresses/customer\_id/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:1d9d0976df3698a0baab6d4f | postgresql:local/public/constraint/order\_items/order\_items\_pkey/0f66fa763c977cd394d53f04 | postgresql:local/public/column/order\_items/product\_id/ | expression\_reference | PARSED |
| edge:21f46e17cc79c2dc179c60b7 | postgresql:local/public/constraint/addresses/addresses\_pkey/62676e56159a610040517422 | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:24a25eea6c256af13096b2d4 | postgresql:local/public/view//customer\_summary/ | postgresql:local/public/column/customers/email/ | query\_reference | PARSED |
| edge:2b4a327b2a480706c0fa842d | postgresql:local/public/column/addresses/id/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:2d6b9ecfcf9878d978cd8602 | postgresql:local/public/constraint/order\_items/order\_items\_product\_id\_fkey/4f7950eb41a49d97e2c7146e | postgresql:local/public/column/order\_items/product\_id/ | expression\_reference | PARSED |
| edge:2eddcbe6246a409f53fb05a8 | postgresql:local/public/column/addresses/city/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:2f87c0839429a4ab70f6577b | postgresql:local/public/constraint/orders/orders\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/column/orders/customer\_id/ | expression\_reference | PARSED |
| edge:2fc82a466cea94afdf966e07 | postgresql:local/public/trigger/customers/customers\_touch/ | postgresql:local/public/table//customers/ | trigger\_association | PARSED |
| edge:31b516307eef6dd0a3d257d6 | postgresql:local/public/column/order\_items/order\_id/ | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:3d411ea3b817ba78d8239733 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | postgresql:local/public/table//orders/ | query\_reference | PARSED |
| edge:3e7919197cdfba064bae5dee | postgresql:local/public/constraint/addresses/addresses\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/column/addresses/customer\_id/ | expression\_reference | PARSED |
| edge:3f36d958c1a16f4f5063977f | postgresql:local/public/constraint/customers/customers\_email\_key/30ba9a81fb7ea6ec9ff167f7 | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:4288ed89833d0022c1d54d05 | postgresql:local/public/constraint/payments/payments\_pkey/62676e56159a610040517422 | postgresql:local/public/column/payments/id/ | expression\_reference | PARSED |
| edge:42b516772ae0c490fc62e11c | postgresql:local/public/column/payments/amount/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:44748c81a94abde3f9f756c1 | postgresql:local/public/column/customers/email/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:449d080bde5028b829fd281a | postgresql:local/public/column/customers/name/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:4852fede4511dce0fbc8a7af | postgresql:local/public/column/order\_items/order\_id/ | postgresql:local/public/column/orders/id/ | foreign\_key | PARSED |
| edge:493a5da95d3bdaadae7e03fb | postgresql:local/public/constraint/orders/orders\_total\_amount\_check\_\_8c94b42a7e78/8c94b42a7e78904691546dba | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:4c6e6857c89ea809b31a3996 | postgresql:local/public/constraint/order\_items/order\_items\_product\_id\_fkey/4f7950eb41a49d97e2c7146e | postgresql:local/public/column/products/id/ | foreign\_key | PARSED |
| edge:535a1452c20c4f6274bc02e5 | postgresql:local/public/constraint/payments/payments\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:5402d78cd2ee1aefae55d740 | postgresql:local/public/column/orders/created\_at/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:57783f8cc3c12381d5a1b58e | postgresql:local/public/constraint/payments/payments\_amount\_check\_\_2fbbb5aae972/2fbbb5aae972c43b3e1ddb51 | postgresql:local/public/column/payments/amount/ | expression\_reference | PARSED |
| edge:57d138471f7e225c7e01d90c | postgresql:local/public/constraint/payments/payments\_amount\_check\_\_2fbbb5aae972/2fbbb5aae972c43b3e1ddb51 | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:5854677188c6ab1c841f33ed | postgresql:local/public/view//customer\_summary/ | postgresql:local/public/column/orders/customer\_id/ | query\_reference | PARSED |
| edge:60a259d4dc6d48cdf764e46f | postgresql:local/public/constraint/payments/payments\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/table//orders/ | foreign\_key | PARSED |
| edge:612709d82e5f92d0eb08603a | postgresql:local/public/constraint/order\_items/order\_items\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/column/order\_items/order\_id/ | expression\_reference | PARSED |
| edge:62a5bb71cf88a0ebc61e744d | postgresql:local/public/column/payments/order\_id/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:62fcf75c3913fb26cc394149 | postgresql:local/public/table//order\_items/ | postgresql:local/public/table//orders/ | foreign\_key | PARSED |
| edge:6b337fb6d4bfa4f999a1cc86 | postgresql:local/public/constraint/addresses/addresses\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/column/customers/id/ | foreign\_key | PARSED |
| edge:6c3f2ed8788f2720c5aff75f | postgresql:local/public/column/addresses/customer\_id/ | postgresql:local/public/column/customers/id/ | foreign\_key | PARSED |
| edge:6e209e98877452de8f04385b | postgresql:local/public/column/customer\_summary/email/ | postgresql:local/public/view//customer\_summary/ | contains | PARSED |
| edge:75fa9aa95ba7b9d956e76660 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | postgresql:local/public/column/orders/id/ | query\_reference | PARSED |
| edge:7925f99039a93219e51926db | postgresql:local/public/constraint/payments/payments\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/column/payments/order\_id/ | expression\_reference | PARSED |
| edge:7c94d6184e2c7e444f2c9312 | postgresql:local/public/constraint/customers/customers\_pkey/62676e56159a610040517422 | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:7f3b931f78bdeb022b90e8ba | postgresql:local/public/constraint/order\_items/order\_items\_product\_id\_fkey/4f7950eb41a49d97e2c7146e | postgresql:local/public/table//products/ | foreign\_key | PARSED |
| edge:80ea424e44ca67d3c85bc3c5 | postgresql:local/public/column/customers/id/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:84d30a74505bc15546505d27 | postgresql:local/public/constraint/customers/customers\_pkey/62676e56159a610040517422 | postgresql:local/public/column/customers/id/ | expression\_reference | PARSED |
| edge:874d99945657054a80df9f02 | postgresql:local/public/column/payments/id/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:888273ce7767cc3e55291871 | postgresql:local/public/column/orders/total\_amount/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:898dfc1b3549f6fe9e1041ce | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | postgresql:local/public/column/orders/customer\_id/ | query\_reference | PARSED |
| edge:8a9ad2f29f72dd1a1af8587d | postgresql:local/public/constraint/products/products\_price\_check\_\_a1bdfb6cc254/a1bdfb6cc254d41061cec471 | postgresql:local/public/table//products/ | contains | PARSED |
| edge:8d3c400eda2590da824c965e | postgresql:local/public/column/customer\_summary/id/ | postgresql:local/public/view//customer\_summary/ | contains | PARSED |
| edge:9001b115d6c5c48b4b5718ff | postgresql:local/public/column/order\_items/quantity/ | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:90c8c74b3403895629e680da | postgresql:local/public/constraint/products/products\_price\_check\_\_a1bdfb6cc254/a1bdfb6cc254d41061cec471 | postgresql:local/public/column/products/price/ | expression\_reference | PARSED |
| edge:96cdb0d84bc00a09ceb5109e | postgresql:local/public/table//payments/ | postgresql:local/public/table//orders/ | foreign\_key | PARSED |
| edge:98d3f4f0a67ad80a7f7ab0bd | postgresql:local/public/constraint/order\_items/order\_items\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/table//orders/ | foreign\_key | PARSED |
| edge:9d307aea5e208abba7504fb0 | postgresql:local/public/trigger/customers/customers\_touch/ | postgresql:local/public/function//touch\_customer/ | trigger\_association | PARSED |
| edge:a642923dda75dbdc7098d8d7 | postgresql:local/public/table//order\_items/ | postgresql:local/public/table//products/ | foreign\_key | PARSED |
| edge:a666f589e93aa92ac58f69ea | postgresql:local/public/constraint/orders/orders\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/table//customers/ | foreign\_key | PARSED |
| edge:a8578a71397a160629502a5d | postgresql:local/public/column/orders/customer\_id/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:a8bea9311b58d34372ee5943 | postgresql:local/public/view//customer\_summary/ | postgresql:local/public/column/orders/id/ | query\_reference | PARSED |
| edge:a9189d507b83265b33fafc29 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Fcustomers.sql%3Aev%3Ae4dc7c3f3bcbc60c845f14b5/ | postgresql:local/public/column/customers/id/ | query\_reference | PARSED |
| edge:aa1d9857feb03fc467ed1835 | postgresql:local/public/column/customer\_summary/order\_count/ | postgresql:local/public/view//customer\_summary/ | contains | PARSED |
| edge:aa9343ef5c72a1e514641dc7 | postgresql:local/public/view//customer\_summary/ | postgresql:local/public/column/customers/id/ | query\_reference | PARSED |
| edge:aac409ebab28c4f020bdeda0 | postgresql:local/public/constraint/order\_items/order\_items\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:ac3cbd05c6a9226c89d527a4 | postgresql:local/public/constraint/products/products\_pkey/62676e56159a610040517422 | postgresql:local/public/table//products/ | contains | PARSED |
| edge:ad680030f5a2e293affc3783 | postgresql:local/public/constraint/order\_items/order\_items\_quantity\_check\_\_485b310e0371/485b310e03717749fd366756 | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:b3f2f89e86307ac919bd989c | postgresql:local/public/constraint/addresses/addresses\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:bc0cecf27a9d335975ad3a49 | postgresql:local/public/constraint/orders/orders\_total\_amount\_check\_\_8c94b42a7e78/8c94b42a7e78904691546dba | postgresql:local/public/column/orders/total\_amount/ | expression\_reference | PARSED |
| edge:bd8703a71aa20f06a188f31a | postgresql:local/public/column/order\_items/product\_id/ | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:bdbb2b13e6ac09f5824bae43 | postgresql:local/public/column/order\_items/product\_id/ | postgresql:local/public/column/products/id/ | foreign\_key | PARSED |
| edge:bfd9cd55aaab90c4ed183b91 | postgresql:local/public/constraint/addresses/addresses\_pkey/62676e56159a610040517422 | postgresql:local/public/column/addresses/id/ | expression\_reference | PARSED |
| edge:c0e890722d6fafc386c0e426 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | postgresql:local/public/column/customers/id/ | query\_reference | PARSED |
| edge:c65687c186e8bee9cb8c0471 | postgresql:local/public/constraint/addresses/addresses\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/table//customers/ | foreign\_key | PARSED |
| edge:c7ba0696045c497301e52033 | postgresql:local/public/constraint/payments/payments\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/column/orders/id/ | foreign\_key | PARSED |
| edge:c8311f0c1b599de8590f98cd | postgresql:local/public/constraint/order\_items/order\_items\_product\_id\_fkey/4f7950eb41a49d97e2c7146e | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:c97827f27d1098e9f3c77ea4 | postgresql:local/public/constraint/orders/orders\_pkey/62676e56159a610040517422 | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:ca4029a75da40252e4498d21 | postgresql:local/public/column/payments/order\_id/ | postgresql:local/public/column/orders/id/ | foreign\_key | PARSED |
| edge:ca848fa6534d7f92402c1a52 | postgresql:local/public/constraint/order\_items/order\_items\_pkey/0f66fa763c977cd394d53f04 | postgresql:local/public/column/order\_items/order\_id/ | expression\_reference | PARSED |
| edge:cc0012b67ac594d5d7bd6657 | postgresql:local/public/constraint/products/products\_sku\_key/30ba9a81fb7ea6ec9ff167f7 | postgresql:local/public/table//products/ | contains | PARSED |
| edge:cddcdabaec4c64d86a5967e5 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Fcustomers.sql%3Aev%3Ae4dc7c3f3bcbc60c845f14b5/ | postgresql:local/public/column/customers/email/ | query\_reference | PARSED |
| edge:d1d2cc90cfc4e410bdc75cec | postgresql:local/public/constraint/products/products\_sku\_key/30ba9a81fb7ea6ec9ff167f7 | postgresql:local/public/column/products/sku/ | expression\_reference | PARSED |
| edge:d31da38e2ae27e8c7cfcd42f | postgresql:local/public/constraint/order\_items/order\_items\_pkey/0f66fa763c977cd394d53f04 | postgresql:local/public/table//order\_items/ | contains | PARSED |
| edge:d660558bd60070ae4acb636e | postgresql:local/public/constraint/orders/orders\_pkey/62676e56159a610040517422 | postgresql:local/public/column/orders/id/ | expression\_reference | PARSED |
| edge:da05ef9838f3b40e481aa89b | postgresql:local/public/column/products/price/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:da43cc551d6ebd2502680372 | postgresql:local/public/column/products/id/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:dbfeb24560e06d8750f73f55 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Fcustomers.sql%3Aev%3Ae4dc7c3f3bcbc60c845f14b5/ | postgresql:local/public/table//customers/ | query\_reference | PARSED |
| edge:e1747cefd339bbab7c6a304a | postgresql:local/public/table//orders/ | postgresql:local/public/table//customers/ | foreign\_key | PARSED |
| edge:e247fcd60cd703bd273870d3 | postgresql:local/public/column/products/sku/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:e40e0e88abbd113de3a5fcd8 | postgresql:local/public/table//addresses/ | postgresql:local/public/table//customers/ | foreign\_key | PARSED |
| edge:e4b95d06d0a70b8f382dfa23 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | postgresql:local/public/column/customers/email/ | query\_reference | PARSED |
| edge:e74e28ce9dd6823209b2030c | postgresql:local/public/constraint/products/products\_pkey/62676e56159a610040517422 | postgresql:local/public/column/products/id/ | expression\_reference | PARSED |
| edge:ebd6536c72c75c6b3b067c27 | postgresql:local/public/constraint/payments/payments\_pkey/62676e56159a610040517422 | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:eccc92a583473fdc12ea81af | postgresql:local/public/constraint/order\_items/order\_items\_order\_id\_fkey/1ef74bdedf741fe887a86e14 | postgresql:local/public/column/orders/id/ | foreign\_key | PARSED |
| edge:f23585bc075e6bd84fb1a091 | postgresql:local/public/view//customer\_summary/ | postgresql:local/public/table//orders/ | query\_reference | PARSED |
| edge:f42877ab42b51eee114c1133 | postgresql:local/public/constraint/customers/customers\_email\_key/30ba9a81fb7ea6ec9ff167f7 | postgresql:local/public/column/customers/email/ | expression\_reference | PARSED |
| edge:f4ce6b8bb9138d13271b58f2 | postgresql:local/public/constraint/orders/orders\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/column/customers/id/ | foreign\_key | PARSED |
| edge:f5f65ed52b52a130866ae814 | postgresql:local/application/query//examples%2Fecommerce%2Fapp%2Forders.sql%3Aev%3Af8c7e18154ef774049bc8694/ | postgresql:local/public/table//customers/ | query\_reference | PARSED |
| edge:fbc21659908e0ae2a5cd46ea | postgresql:local/public/column/orders/customer\_id/ | postgresql:local/public/column/customers/id/ | foreign\_key | PARSED |
| edge:fdfb9eb03a5388bd20d49588 | postgresql:local/public/constraint/orders/orders\_customer\_id\_fkey/884466556956c633a5c8fcd4 | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:ffb83430132bc8b5e521cc1e | postgresql:local/public/view//customer\_summary/ | postgresql:local/public/table//customers/ | query\_reference | PARSED |

## Evidence inventory

| ID | Origin | Location | Hash |
|---|---|---|---|
| ev:1300e87731793115ceb87783 | migration\_diff | examples/high-traffic/migrations/007.sql:5-5 | sha256:b258f46847ce8c427e965530b42a2a3289baaa972e08a50e662ef5bd0180db5b |
| ev:3eff11898bac02d99ee08daf | sql\_file | examples/ecommerce/schema.sql:34-34 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:40680f826d95f1ec183340ed | sql\_file | examples/ecommerce/schema.sql:1-6 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:4f849d665202a664e7893d4a | sql\_file | examples/ecommerce/schema.sql:7-11 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:551306041c228ae54da88290 | migration\_diff | examples/high-traffic/migrations/007.sql:2-2 | sha256:b258f46847ce8c427e965530b42a2a3289baaa972e08a50e662ef5bd0180db5b |
| ev:5fb078138cefc22bce2fcef9 | user\_supplied | user-metadata:1-1 | sha256:438abb43ce671eaa2d4fc0e8d95e4c2931b3194707d7ff9c14edac4d5032c914 |
| ev:776d7da11045ee31e44912e0 | sql\_file | examples/ecommerce/schema.sql:45-46 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:7de9792a75dda688bf1f738f | sql\_file | examples/ecommerce/schema.sql:17-22 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:8dadc8fc9c511aafd4803a87 | sql\_file | examples/ecommerce/schema.sql:12-16 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:91db41ab80f56bfbfc4da0f0 | migration\_diff | examples/high-traffic/migrations/007.sql:3-3 | sha256:b258f46847ce8c427e965530b42a2a3289baaa972e08a50e662ef5bd0180db5b |
| ev:b306c585df0ee00d863316dd | sql\_file | examples/ecommerce/schema.sql:23-28 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:c81447f17e11c2d5b6c401da | sql\_file | examples/ecommerce/schema.sql:35-38 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:dcedb83e305f10addb8f3fe7 | migration\_diff | examples/high-traffic/migrations/007.sql:1-1 | sha256:b258f46847ce8c427e965530b42a2a3289baaa972e08a50e662ef5bd0180db5b |
| ev:e3fa1e6bfbfed48ae579bc40 | sql\_file | examples/ecommerce/schema.sql:29-33 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:e4dc7c3f3bcbc60c845f14b5 | application\_source | examples/ecommerce/app/customers.sql:1-1 | sha256:a415aaea7a68344c4f8c3e93fc4233772176a54a53c14c74541c2e512be81470 |
| ev:e9af3cfadad5d8900305d336 | sql\_file | examples/ecommerce/schema.sql:39-44 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:f5f5e93f642715781126c9c2 | migration\_diff | examples/high-traffic/migrations/007.sql:4-4 | sha256:b258f46847ce8c427e965530b42a2a3289baaa972e08a50e662ef5bd0180db5b |
| ev:f8c7e18154ef774049bc8694 | application\_source | examples/ecommerce/app/orders.sql:1-2 | sha256:07ed8c193824ea5e25844e2be152acec7d04492c5b3d5ca9fbc55d2ee4e1421e |
