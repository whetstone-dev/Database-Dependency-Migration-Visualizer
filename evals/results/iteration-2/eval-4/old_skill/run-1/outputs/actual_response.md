The grounded static consumer of `public.customers.email` is `examples/dynamic-sql-unknown/app/static.sql:1`, which selects `email` from `public.customers`. Its PARSED evidence is `ev:b314c12d876f9a28d6620da1`, source hash `sha256:74a6e9b68586f7dbe8b68224ca852c37233cdcee49831ed6dff930e393446526`. The query points to `postgresql:local/public/column/customers/email/` through `edge:e06bff90a111da017be97a3a`.

Every consumer cannot be established from these files. The toolkit records two UNKNOWN coverage gaps:

- `examples/dynamic-sql-unknown/app/query.ts:1-3`, evidence `ev:2c2fb2d23ea17b894ac7fc0a`, has a host-language SQL template with a runtime column parameter. Host-language SQL and ORM extraction are unsupported. No email target was guessed or added as a dependency.
- `examples/dynamic-sql-unknown/schema.sql:2-8`, evidence `ev:f841ef7712234461327d5c9e`, defines `public.lookup_customer(text)`. Routine body/runtime references, including dynamic SQL, remain UNKNOWN. The model preserves the function identity `postgresql:local/public/function//lookup_customer/text` without inventing an email-reference edge.

The email declaration itself has PARSED evidence at `examples/dynamic-sql-unknown/schema.sql:1`. There are no OBSERVED catalog facts in this offline model. The one known static consumer is not an exhaustive consumer inventory, and absence of other edges is not a safety approval. Resolve runtime targets with owner-provided call-site evidence or an authorized supported catalog capture.

Artifacts are [schema.dbdep.json](schema.dbdep.json), [impact.json](impact.json), [report.md](report.md), and the standalone [impact.html](impact.html). Strict validation passed with no errors. The model has 6 nodes, 7 edges, 4 evidence records and 2 unknowns. All CLI commands exited 0. Browser interaction and visual appearance were not tested. No SQL was executed and no database connection was made.
