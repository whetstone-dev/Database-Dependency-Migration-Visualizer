The supported static analysis confirms one supplied consumer of `public.customers.email`: `dynamic-sql-unknown/app/static.sql:1`. Its AST-grounded `query_reference` edge has PARSED evidence `ev:1280366f3e8b0761c93b0020`, with a direct path to the email column.

Two sites remain UNKNOWN. `public.lookup_customer(text)` at `dynamic-sql-unknown/schema.sql:2-8` builds a query using `field_name`; no supplied call or runtime evidence establishes that this parameter selects email. `dynamic-sql-unknown/app/query.ts:2` similarly interpolates `column`. Host-language SQL extraction is unsupported. I did not turn either dynamic site into a confirmed email dependency or guess their dynamic column targets.

The request to find every consumer cannot be established from these offline inputs. The toolkit covers the supplied static SQL and records both gaps. It does not inspect routine runtime behavior, template expansions, callers, ORM SQL or consumers outside the copied inputs.

Artifacts: [canonical model](schema.dbdep.json), [Markdown evidence inventory](schema.md), [interactive explorer](schema.html), [impact JSON](impact.json), [resolved path](resolved-impact-paths.json), and [validation](schema-validation.json). Strict validation passed for 6 nodes, 7 edges, 4 evidence records and 2 UNKNOWN gaps. Static evidence has source hashes and line locations; the unknown sites retain their source evidence too.

No SQL was executed, no database was contacted, and browser interactions for this HTML were not independently tested. Follow-up evidence would need reviewed callers or captured runtime query identifiers to resolve these dynamic paths.
