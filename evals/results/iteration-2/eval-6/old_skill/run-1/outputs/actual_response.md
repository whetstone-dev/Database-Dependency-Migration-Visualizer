The two schemas were analyzed separately. Object identities preserve schema names, quoted case, parent ownership and routine signatures.

| Preserved declaration | Model identity or relationship | PARSED evidence |
|---|---|---|
| `public.orders` | `postgresql:local/public/table//orders/` | `examples/multi-schema/schema.sql:2` |
| `sales.orders` | `postgresql:local/sales/table//orders/` | `examples/multi-schema/schema.sql:3` |
| Quoted `"Commerce"."Order"."CustomerID"` | `postgresql:local/Commerce/column/Order/CustomerID/` | `examples/tricky-identifiers/schema.sql:3-6` |
| Partitioned `"Commerce"."Order"` | `postgresql:local/Commerce/partitioned_table//Order/` | `examples/tricky-identifiers/schema.sql:3-6` |
| `"Commerce".order_eu` partition | `edge:3bd9b12e79b1ed42379a3de5` points from the child table to its partitioned parent | `examples/tricky-identifiers/schema.sql:7` |
| Composite FK | Ordered local columns `customer_id, region` map to `CustomerID, region` on the parent; both column edges and the constraint remain distinct | `examples/tricky-identifiers/schema.sql:8-11` |
| `"Commerce".label(bigint)` | `postgresql:local/Commerce/function//label/int8` | `examples/tricky-identifiers/schema.sql:12` |
| `"Commerce".label(text)` | `postgresql:local/Commerce/function//label/text` | `examples/tricky-identifiers/schema.sql:13` |

`SELECT id FROM orders` at `examples/multi-schema/schema.sql:4` is ambiguous between the two tables. The toolkit records UNKNOWN relation resolution and an unresolved query column, with evidence `ev:e76da804f85b10ec65dea5ee`. It assumes no search_path and invents no query-reference edge to either table.

The quoted CustomerID spelling is preserved. Function argument types are parser-normalized, so bigint appears as int8 in its stable signature. A name-only selector for `"Commerce".label` was rejected as ambiguous with exit code 2. Both stable-ID impact selectors then completed with exit code 0, preserving the overloads. Their empty recorded consumer sets do not establish absence of runtime callers.

Both routine bodies remain UNKNOWN offline. The partition child also records UNKNOWN inherited column definitions and partition-bound expansion. Unnamed constraint names are inferred display names, not proof of PostgreSQL's actual generated names. Resolve those facts from an authorized catalog capture before an execution decision.

Artifacts are [multi-schema.dbdep.json](multi-schema.dbdep.json), [multi-schema Markdown](multi-schema.md), [multi-schema HTML](multi-schema.html), [tricky-identifiers.dbdep.json](tricky-identifiers.dbdep.json), [tricky-identifiers Markdown](tricky-identifiers.md), [tricky-identifiers HTML](tricky-identifiers.html), and separate [bigint overload impact](label-bigint-impact.json) and [text overload impact](label-text-impact.json). Both models passed strict validation with no errors. The first has 8 nodes, 6 edges, 4 evidence records and 2 unknowns; the second has 14 nodes, 19 edges, 7 evidence records and 3 unknowns. Browser behavior and visual appearance were not tested. No SQL was executed and no database connection was made.
