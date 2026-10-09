# Reproducible PostgreSQL examples

`python scripts/dbdep.py demo out/demo` generates ecommerce, analytics and high-traffic bundles. `python scripts/verify_examples.py` compares checked-in canonical artifacts with fresh analysis; screenshots are verified separately by browser capture. Inputs contain fixture values only, never real connection details.

- `ecommerce/` includes six tables, FK constraints, view, function/trigger and application SQL. Three proposed phases illustrate expansion/backfill/destructive contract. Backfill SQL is a whole-table sketch; batching, writer coordination and recovery are operator responsibilities. The analyzer does not execute it.
- `analytics/` has a table and two chained views. Its actual catalog capture records pg_rewrite ownership and provenance; default expressions are hashed and no user rows are captured.
- `high-traffic/` has regular index, type change and transaction-wrapped concurrent index. Metadata is an explicit user scenario, not discovered traffic/size.
- `dynamic-sql-unknown/` retains a grounded SQL query while PL/pgSQL and TypeScript consumers remain UNKNOWN.
- `multi-schema/` tests ambiguous unqualified names and schema isolation.
- `tricky-identifiers/` includes quoted identifiers, enum, composite keys, overloads and partitioning. Offline inherited columns remain partial.
- `diff/` tests add/drop with an unconfirmed possible rename.

The three `rendered/` bundles were generated from these fixtures. HTML inspection/search works from local files. Screenshots show presentation only. Node/edge/finding/evidence consistency comes from automated tests and graph/catalog correctness comes from explicit assertions.
