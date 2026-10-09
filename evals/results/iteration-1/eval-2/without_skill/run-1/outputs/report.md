# sales.orders.total_amount dependents

The direct consumer is analytics.order_summary. analytics.monthly_revenue is transitive through order_summary.total_amount. Both are visible in SQL source and in the supplied catalog snapshot.

Paths from the changed column:

- sales.orders.total_amount -> analytics.order_summary.total_amount -> analytics.monthly_revenue.revenue.
- sales.orders.total_amount -> analytics.order_summary view -> analytics.monthly_revenue view. The catalog evidence binds each view's _RETURN rewrite rule to its owning view.

Catalog evidence is retained as raw rows in analysis.json. sales.orders is pg_class OID 16545; total_amount is pg_attribute attnum 2. pg_rewrite 16555 belongs to order_summary OID 16552. Its normal pg_depend row references pg_class 16545, refobjsubid 2. pg_rewrite 16559 belongs to monthly_revenue OID 16556 and normally references pg_class 16552, refobjsubid 2. The internal dependency rows bind rewrite rules to their owning view. This ownership translation is necessary; rule OIDs are not separate views.

The catalog additionally shows the column-local NOT NULL constraint orders_total_amount_not_null, pg_constraint OID 16549, with an automatic dependency on 16545/2. It is an auto-removed constraint, not a RESTRICT blocker. The primary key and its supporting index reference id, so they are unaffected by dropping total_amount.

For a DROP COLUMN proposal, RESTRICT is the default and refuses the change because order_summary's normal dependency exists. CASCADE removes order_summary and monthly_revenue recursively as well as automatic column-local objects; it does not remove the entire orders table. Dropping total_amount deletes its stored data. The behavior differs from ALTER COLUMN TYPE, which needs a separate dependency-compatible plan.

No DROP command was issued. This is source analysis reconciled to an offline catalog.json snapshot. Runtime application SQL, dynamic SQL and objects absent from the captured catalog query results remain outside coverage.

[PostgreSQL dependency tracking](https://www.postgresql.org/docs/18/ddl-depend.html) and [pg_depend semantics](https://www.postgresql.org/docs/18/catalog-pg-depend.html) document normal, automatic and internal dependencies.
