# PostgreSQL dependency review

Analysis only. No SQL was executed by the analyzer.

Snapshot `snapshot:3a694f2f735071a096a7fd57`. PostgreSQL 18, offline_ddl.
Nodes: 50. Edges: 88. Evidence: 10. Findings: 0. Unknowns: 8.

Arrows mean source depends on/references target. Impact walks reverse edges. Paths describe potential impact; they do not prove runtime failure or complete consumer coverage.

## Findings

## Coverage and unknowns

OBSERVED means supplied catalog metadata. PARSED means syntax-aware source evidence. INFERRED means unproven. UNKNOWN means unavailable or unsupported. Static analysis is not exhaustive.

- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:df833391c79cdcc28673e697.
- UNKNOWN: Routine body/runtime references are not exhaustively analyzed offline, including dynamic SQL. Evidence: ev:4f69437ac7f5c8cbda748786.
- UNKNOWN: Default/generated function and sequence expression targets need catalog resolution. Evidence: ev:9892ccf180b3b170b70ac607.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:9892ccf180b3b170b70ac607.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:3949734689a3e42779b3e74a.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:7e155552e9cab38a926a994c.
- UNKNOWN: Identity sequence exists but its actual name/OID needs catalog metadata. Evidence: ev:a6badb49294176a6dce11d6c.
- UNKNOWN: Default/generated function and sequence expression targets need catalog resolution. Evidence: ev:df833391c79cdcc28673e697.

## Object inventory

| ID | Object | Kind | Status | Evidence |
|---|---|---|---|---|
| postgresql:local/public/column/addresses/city/ | public.addresses.city | column | PARSED | ev:7e155552e9cab38a926a994c |
| postgresql:local/public/column/addresses/customer_id/ | public.addresses.customer_id | column | PARSED | ev:7e155552e9cab38a926a994c |
| postgresql:local/public/column/addresses/id/ | public.addresses.id | column | PARSED | ev:7e155552e9cab38a926a994c |
| postgresql:local/public/column/customer_summary/email/ | public.customer_summary.email | column | PARSED | ev:4bbbbb8d872ccb4247160475 |
| postgresql:local/public/column/customer_summary/id/ | public.customer_summary.id | column | PARSED | ev:4bbbbb8d872ccb4247160475 |
| postgresql:local/public/column/customer_summary/order_count/ | public.customer_summary.order_count | column | PARSED | ev:4bbbbb8d872ccb4247160475 |
| postgresql:local/public/column/customers/email/ | public.customers.email | column | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/column/customers/id/ | public.customers.id | column | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/column/customers/name/ | public.customers.name | column | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/column/customers/updated_at/ | public.customers.updated_at | column | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/column/order_items/order_id/ | public.order_items.order_id | column | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/column/order_items/product_id/ | public.order_items.product_id | column | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/column/order_items/quantity/ | public.order_items.quantity | column | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/column/orders/created_at/ | public.orders.created_at | column | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/column/orders/customer_id/ | public.orders.customer_id | column | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/column/orders/id/ | public.orders.id | column | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/column/orders/total_amount/ | public.orders.total_amount | column | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/column/payments/amount/ | public.payments.amount | column | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/column/payments/id/ | public.payments.id | column | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/column/payments/order_id/ | public.payments.order_id | column | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/column/products/id/ | public.products.id | column | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/column/products/price/ | public.products.price | column | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/column/products/sku/ | public.products.sku | column | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/constraint/addresses/addresses_customer_id_fkey/ | public.addresses.addresses_customer_id_fkey | constraint | PARSED | ev:7e155552e9cab38a926a994c |
| postgresql:local/public/constraint/addresses/addresses_pkey/ | public.addresses.addresses_pkey | constraint | PARSED | ev:7e155552e9cab38a926a994c |
| postgresql:local/public/constraint/customers/customers_email_key/ | public.customers.customers_email_key | constraint | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/constraint/customers/customers_pkey/ | public.customers.customers_pkey | constraint | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/constraint/order_items/order_items_order_id_fkey/ | public.order_items.order_items_order_id_fkey | constraint | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/constraint/order_items/order_items_pkey/ | public.order_items.order_items_pkey | constraint | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/constraint/order_items/order_items_product_id_fkey/ | public.order_items.order_items_product_id_fkey | constraint | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/constraint/order_items/order_items_quantity_check/ | public.order_items.order_items_quantity_check | constraint | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/constraint/orders/orders_customer_id_fkey/ | public.orders.orders_customer_id_fkey | constraint | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/constraint/orders/orders_pkey/ | public.orders.orders_pkey | constraint | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/constraint/orders/orders_total_amount_check/ | public.orders.orders_total_amount_check | constraint | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/constraint/payments/payments_amount_check/ | public.payments.payments_amount_check | constraint | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/constraint/payments/payments_order_id_fkey/ | public.payments.payments_order_id_fkey | constraint | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/constraint/payments/payments_pkey/ | public.payments.payments_pkey | constraint | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/constraint/products/products_pkey/ | public.products.products_pkey | constraint | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/constraint/products/products_price_check/ | public.products.products_price_check | constraint | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/constraint/products/products_sku_key/ | public.products.products_sku_key | constraint | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/function//touch_customer/ | public.touch_customer | function | PARSED | ev:4f69437ac7f5c8cbda748786 |
| postgresql:local/public/index//orders_customer_idx/ | public.orders_customer_idx | index | PARSED | ev:7bb702d26adaca873647463c |
| postgresql:local/public/table//addresses/ | public.addresses | table | PARSED | ev:7e155552e9cab38a926a994c |
| postgresql:local/public/table//customers/ | public.customers | table | PARSED | ev:9892ccf180b3b170b70ac607 |
| postgresql:local/public/table//order_items/ | public.order_items | table | PARSED | ev:951337081d567c90d0f07f91 |
| postgresql:local/public/table//orders/ | public.orders | table | PARSED | ev:df833391c79cdcc28673e697 |
| postgresql:local/public/table//payments/ | public.payments | table | PARSED | ev:3949734689a3e42779b3e74a |
| postgresql:local/public/table//products/ | public.products | table | PARSED | ev:a6badb49294176a6dce11d6c |
| postgresql:local/public/trigger/customers/customers_touch/ | public.customers.customers_touch | trigger | PARSED | ev:7a1ea50bf852541dd6d15641 |
| postgresql:local/public/view//customer_summary/ | public.customer_summary | view | PARSED | ev:4bbbbb8d872ccb4247160475 |

## Edge inventory

| ID | Source | Target | Kind | Status |
|---|---|---|---|---|
| edge:014fb6369ba96ca9ec2ffb6e | postgresql:local/public/index//orders_customer_idx/ | postgresql:local/public/column/orders/customer_id/ | expression_reference | PARSED |
| edge:039c1476ad83adcfbec11173 | postgresql:local/public/constraint/addresses/addresses_customer_id_fkey/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:045ea7837245d780f6bd9784 | postgresql:local/public/constraint/payments/payments_pkey/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:0fb0d5ae6ad1a8a9b4656dd8 | postgresql:local/public/constraint/products/products_sku_key/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:122fa6ad729c390103dc691f | postgresql:local/public/index//orders_customer_idx/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:161c9f0a16b2a00134172398 | postgresql:local/public/constraint/customers/customers_email_key/ | postgresql:local/public/column/customers/email/ | expression_reference | PARSED |
| edge:18a94627aae399dfc7524ec3 | postgresql:local/public/column/orders/id/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:1a413343114cc7a6e07d44c2 | postgresql:local/public/column/customers/updated_at/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:1aa24304fac7db22fadbc3a2 | postgresql:local/public/column/addresses/customer_id/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:1bcd6e24900e51e656e6f21b | postgresql:local/public/table//order_items/ | postgresql:local/public/table//orders/ | foreign_key | PARSED |
| edge:232653f444b6a70b4d96a2df | postgresql:local/public/constraint/addresses/addresses_pkey/ | postgresql:local/public/column/addresses/id/ | expression_reference | PARSED |
| edge:24a25eea6c256af13096b2d4 | postgresql:local/public/view//customer_summary/ | postgresql:local/public/column/customers/email/ | query_reference | PARSED |
| edge:2b4a327b2a480706c0fa842d | postgresql:local/public/column/addresses/id/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:2eddcbe6246a409f53fb05a8 | postgresql:local/public/column/addresses/city/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:2fc82a466cea94afdf966e07 | postgresql:local/public/trigger/customers/customers_touch/ | postgresql:local/public/table//customers/ | trigger_association | PARSED |
| edge:31b516307eef6dd0a3d257d6 | postgresql:local/public/column/order_items/order_id/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:3634c280e7bd58ba878b4bd5 | postgresql:local/public/table//order_items/ | postgresql:local/public/table//products/ | foreign_key | PARSED |
| edge:3b289f427a95423bbd406239 | postgresql:local/public/constraint/order_items/order_items_product_id_fkey/ | postgresql:local/public/table//products/ | foreign_key | PARSED |
| edge:3dbcb28a598d1287c610d195 | postgresql:local/public/column/order_items/product_id/ | postgresql:local/public/column/products/id/ | foreign_key | PARSED |
| edge:401ee37fdb3bbf4a5528011c | postgresql:local/public/constraint/order_items/order_items_order_id_fkey/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:40d02f1c57f8f8758fd3a0ad | postgresql:local/public/column/payments/order_id/ | postgresql:local/public/column/orders/id/ | foreign_key | PARSED |
| edge:410170d0fd582dcf85677e5e | postgresql:local/public/constraint/customers/customers_pkey/ | postgresql:local/public/column/customers/id/ | expression_reference | PARSED |
| edge:42b516772ae0c490fc62e11c | postgresql:local/public/column/payments/amount/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:44748c81a94abde3f9f756c1 | postgresql:local/public/column/customers/email/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:449d080bde5028b829fd281a | postgresql:local/public/column/customers/name/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:44d66a7aff316bf5ae5422bb | postgresql:local/public/column/orders/customer_id/ | postgresql:local/public/column/customers/id/ | foreign_key | PARSED |
| edge:48a79b124fd8f5501294bd59 | postgresql:local/public/table//addresses/ | postgresql:local/public/table//customers/ | foreign_key | PARSED |
| edge:4a7033277226f1e9e08179aa | postgresql:local/public/constraint/order_items/order_items_pkey/ | postgresql:local/public/column/order_items/product_id/ | expression_reference | PARSED |
| edge:4ce9f3570cb6485f20a2dbcd | postgresql:local/public/constraint/order_items/order_items_quantity_check/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:4e1fa2807febdcd4d9200ce4 | postgresql:local/public/constraint/customers/customers_pkey/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:5402d78cd2ee1aefae55d740 | postgresql:local/public/column/orders/created_at/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:5854677188c6ab1c841f33ed | postgresql:local/public/view//customer_summary/ | postgresql:local/public/column/orders/customer_id/ | query_reference | PARSED |
| edge:60ad7cd6bb923381214b28e2 | postgresql:local/public/constraint/orders/orders_customer_id_fkey/ | postgresql:local/public/column/customers/id/ | foreign_key | PARSED |
| edge:62a5bb71cf88a0ebc61e744d | postgresql:local/public/column/payments/order_id/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:6645cd6495ff6c86c67b7735 | postgresql:local/public/column/order_items/order_id/ | postgresql:local/public/column/orders/id/ | foreign_key | PARSED |
| edge:677ae00d0c7a9c0da989d521 | postgresql:local/public/constraint/order_items/order_items_product_id_fkey/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:6b2841bdbb86b76035041220 | postgresql:local/public/constraint/products/products_sku_key/ | postgresql:local/public/column/products/sku/ | expression_reference | PARSED |
| edge:6e209e98877452de8f04385b | postgresql:local/public/column/customer_summary/email/ | postgresql:local/public/view//customer_summary/ | contains | PARSED |
| edge:70b99d9fe922a3c18f4c8af6 | postgresql:local/public/constraint/payments/payments_pkey/ | postgresql:local/public/column/payments/id/ | expression_reference | PARSED |
| edge:736cfb70616ad64e5fea8a64 | postgresql:local/public/constraint/payments/payments_order_id_fkey/ | postgresql:local/public/table//orders/ | foreign_key | PARSED |
| edge:7837858bd3df10a567f8cbaf | postgresql:local/public/constraint/order_items/order_items_order_id_fkey/ | postgresql:local/public/table//orders/ | foreign_key | PARSED |
| edge:798bf1495a9616dfc44da35f | postgresql:local/public/constraint/orders/orders_customer_id_fkey/ | postgresql:local/public/table//customers/ | foreign_key | PARSED |
| edge:7caee1f2d00ec61a20734f19 | postgresql:local/public/constraint/orders/orders_customer_id_fkey/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:80ea424e44ca67d3c85bc3c5 | postgresql:local/public/column/customers/id/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:874d99945657054a80df9f02 | postgresql:local/public/column/payments/id/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:888273ce7767cc3e55291871 | postgresql:local/public/column/orders/total_amount/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:8d3c400eda2590da824c965e | postgresql:local/public/column/customer_summary/id/ | postgresql:local/public/view//customer_summary/ | contains | PARSED |
| edge:9001b115d6c5c48b4b5718ff | postgresql:local/public/column/order_items/quantity/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:915dbd09bf68bffded0ae047 | postgresql:local/public/constraint/addresses/addresses_customer_id_fkey/ | postgresql:local/public/column/customers/id/ | foreign_key | PARSED |
| edge:92770579ce3614224de617f8 | postgresql:local/public/constraint/orders/orders_total_amount_check/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:934317bef6bd0d8b64b07de8 | postgresql:local/public/constraint/orders/orders_pkey/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:9d307aea5e208abba7504fb0 | postgresql:local/public/trigger/customers/customers_touch/ | postgresql:local/public/function//touch_customer/ | trigger_association | PARSED |
| edge:a015479748dd21cd60fd8a0a | postgresql:local/public/constraint/order_items/order_items_product_id_fkey/ | postgresql:local/public/column/products/id/ | foreign_key | PARSED |
| edge:a1124830e48944670a024eb4 | postgresql:local/public/constraint/addresses/addresses_pkey/ | postgresql:local/public/table//addresses/ | contains | PARSED |
| edge:a8578a71397a160629502a5d | postgresql:local/public/column/orders/customer_id/ | postgresql:local/public/table//orders/ | contains | PARSED |
| edge:a8bea9311b58d34372ee5943 | postgresql:local/public/view//customer_summary/ | postgresql:local/public/column/orders/id/ | query_reference | PARSED |
| edge:aa1d9857feb03fc467ed1835 | postgresql:local/public/column/customer_summary/order_count/ | postgresql:local/public/view//customer_summary/ | contains | PARSED |
| edge:aa9343ef5c72a1e514641dc7 | postgresql:local/public/view//customer_summary/ | postgresql:local/public/column/customers/id/ | query_reference | PARSED |
| edge:ab57c32d1ca5e49471c0e69f | postgresql:local/public/constraint/products/products_pkey/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:b46c6771af0c7cce8c703439 | postgresql:local/public/constraint/payments/payments_amount_check/ | postgresql:local/public/column/payments/amount/ | expression_reference | PARSED |
| edge:b56c1afd0a396b95aa250d46 | postgresql:local/public/constraint/order_items/order_items_pkey/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:b5a2dd9e0a0aee2e73b67645 | postgresql:local/public/constraint/orders/orders_pkey/ | postgresql:local/public/column/orders/id/ | expression_reference | PARSED |
| edge:b9350e018d2b83935b43f8e5 | postgresql:local/public/constraint/customers/customers_email_key/ | postgresql:local/public/table//customers/ | contains | PARSED |
| edge:bd76b231209c7ac5dfb5d135 | postgresql:local/public/constraint/orders/orders_customer_id_fkey/ | postgresql:local/public/column/orders/customer_id/ | expression_reference | PARSED |
| edge:bd8703a71aa20f06a188f31a | postgresql:local/public/column/order_items/product_id/ | postgresql:local/public/table//order_items/ | contains | PARSED |
| edge:bfbd70b18088be5067d31392 | postgresql:local/public/constraint/order_items/order_items_pkey/ | postgresql:local/public/column/order_items/order_id/ | expression_reference | PARSED |
| edge:c16f4cfd54106b6c8e8dc4c4 | postgresql:local/public/constraint/payments/payments_order_id_fkey/ | postgresql:local/public/column/payments/order_id/ | expression_reference | PARSED |
| edge:c2786e69f27a2cd6be074dd2 | postgresql:local/public/column/addresses/customer_id/ | postgresql:local/public/column/customers/id/ | foreign_key | PARSED |
| edge:c304e3f1ec10a8522807ed02 | postgresql:local/public/constraint/addresses/addresses_customer_id_fkey/ | postgresql:local/public/table//customers/ | foreign_key | PARSED |
| edge:c6db438473e1dc0ad23a61c5 | postgresql:local/public/constraint/products/products_price_check/ | postgresql:local/public/column/products/price/ | expression_reference | PARSED |
| edge:cc78273a87fe1c6a12f06cc1 | postgresql:local/public/table//payments/ | postgresql:local/public/table//orders/ | foreign_key | PARSED |
| edge:cca075e9467576ace56005b6 | postgresql:local/public/constraint/orders/orders_total_amount_check/ | postgresql:local/public/column/orders/total_amount/ | expression_reference | PARSED |
| edge:d2eaa63d8161d39cbc653547 | postgresql:local/public/constraint/order_items/order_items_product_id_fkey/ | postgresql:local/public/column/order_items/product_id/ | expression_reference | PARSED |
| edge:d6d65fcf67cce94975a45ea3 | postgresql:local/public/constraint/payments/payments_order_id_fkey/ | postgresql:local/public/column/orders/id/ | foreign_key | PARSED |
| edge:da05ef9838f3b40e481aa89b | postgresql:local/public/column/products/price/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:da43cc551d6ebd2502680372 | postgresql:local/public/column/products/id/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:db4d1de881c14419de3a5da1 | postgresql:local/public/constraint/order_items/order_items_order_id_fkey/ | postgresql:local/public/column/order_items/order_id/ | expression_reference | PARSED |
| edge:dd41ab75e8f6f830dc31f0a4 | postgresql:local/public/constraint/order_items/order_items_quantity_check/ | postgresql:local/public/column/order_items/quantity/ | expression_reference | PARSED |
| edge:e247fcd60cd703bd273870d3 | postgresql:local/public/column/products/sku/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:e3c80c6f9a40402c0639859b | postgresql:local/public/table//orders/ | postgresql:local/public/table//customers/ | foreign_key | PARSED |
| edge:e521ca969a90e606c97ee566 | postgresql:local/public/constraint/products/products_price_check/ | postgresql:local/public/table//products/ | contains | PARSED |
| edge:e7c5867b3ce8bcd2b069bdf6 | postgresql:local/public/constraint/addresses/addresses_customer_id_fkey/ | postgresql:local/public/column/addresses/customer_id/ | expression_reference | PARSED |
| edge:e9d97ad7f9c6fc87b4876e0d | postgresql:local/public/constraint/order_items/order_items_order_id_fkey/ | postgresql:local/public/column/orders/id/ | foreign_key | PARSED |
| edge:f11cb6fd65b5939a87c57062 | postgresql:local/public/constraint/payments/payments_amount_check/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:f23585bc075e6bd84fb1a091 | postgresql:local/public/view//customer_summary/ | postgresql:local/public/table//orders/ | query_reference | PARSED |
| edge:f2c7e8b20cdac58ce5452310 | postgresql:local/public/constraint/products/products_pkey/ | postgresql:local/public/column/products/id/ | expression_reference | PARSED |
| edge:f7c786367780958842099671 | postgresql:local/public/constraint/payments/payments_order_id_fkey/ | postgresql:local/public/table//payments/ | contains | PARSED |
| edge:ffb83430132bc8b5e521cc1e | postgresql:local/public/view//customer_summary/ | postgresql:local/public/table//customers/ | query_reference | PARSED |

## Evidence inventory

| ID | Origin | Location | Hash |
|---|---|---|---|
| ev:3949734689a3e42779b3e74a | sql_file | ecommerce/schema.sql:29-33 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:4bbbbb8d872ccb4247160475 | sql_file | ecommerce/schema.sql:35-38 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:4f69437ac7f5c8cbda748786 | sql_file | ecommerce/schema.sql:39-44 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:7a1ea50bf852541dd6d15641 | sql_file | ecommerce/schema.sql:45-46 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:7bb702d26adaca873647463c | sql_file | ecommerce/schema.sql:34-34 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:7e155552e9cab38a926a994c | sql_file | ecommerce/schema.sql:7-11 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:951337081d567c90d0f07f91 | sql_file | ecommerce/schema.sql:23-28 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:9892ccf180b3b170b70ac607 | sql_file | ecommerce/schema.sql:1-6 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:a6badb49294176a6dce11d6c | sql_file | ecommerce/schema.sql:12-16 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
| ev:df833391c79cdcc28673e697 | sql_file | ecommerce/schema.sql:17-22 | sha256:613c7315ca18c17eace15b1baab2cb6c2a3fc1a6b355702acda1fa3ff181922d |
