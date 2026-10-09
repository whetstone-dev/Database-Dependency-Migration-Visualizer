# Schema and identifier fidelity

The files were parsed separately, with independent models and uncertainty records.

## multi-schema/schema.sql

public.orders and sales.orders are distinct table identities, each with a distinct id column, primary key and supporting index. The final SELECT id FROM orders is unresolved because no session search_path was supplied. Both orders tables are retained as candidates; the query receives no guessed relation/column edge. PostgreSQL search_path picks the first visible match, not every same-name table. Existing search_path, role visibility and session state were not supplied.

## tricky-identifiers/schema.sql

The parser preserves exact semantic case: schema Commerce, table Order, column CustomerID. Display names quote these as "Commerce"."Order"."CustomerID". Lowercase public.orders and sales.orders do not collide with this table. Raw evidence preserves the original SQL spelling. All IDs encode kind and full identity, including schema and case.

"Commerce".state is an enum with values new and paid. The Order.status column has a grounded type edge to that enum. The primary key has ordered columns CustomerID, region.

order_eu is a RANGE partition of Order with lower bound 1 and exclusive upper bound 10. The model preserves the bound AST and parent edge, and materializes inherited columns with parent-column edges. PostgreSQL-created partition indexes/constraints are not inventoried from the offline source; their physical identities need catalog capture.

The items foreign key preserves the ordered composite mapping customer_id -> CustomerID and region -> region. It is one compound foreign key, not two independent constraints. The model stores both the ordered mapping and per-column dependency edges. The parent partitioned primary key includes the partition key region.

The two label functions remain distinct: label(pg_catalog.int8) and label(pg_catalog.text). Function IDs include schema, exact name and input type signature. Argument names and return type alone do not identify an overload. Both SQL string bodies are preserved. Their value references are function arguments, not guessed table columns.

All parsed constructs are represented or stated as coverage limits. No live catalog, runtime search_path, privileges, implicit partition implementation objects or execution validity were verified. pglast parses PostgreSQL grammar; it does not substitute for a server's semantic checks.

[PostgreSQL schema search paths](https://www.postgresql.org/docs/18/ddl-schemas.html) explains unqualified name resolution.
