Generated the canonical dependency model, full Markdown inventory and standalone HTML for `examples/ecommerce/schema.sql`. Strict model validation passed with no errors.

The separate artifact consistency check also passed:

- The HTML's embedded model is exactly equal to the canonical JSON object.
- JSON, HTML summary and Markdown all report 50 nodes, 88 edges, 10 evidence records, 0 findings and 8 unknowns.
- Markdown contains every full node, edge and evidence identifier, and the same snapshot ID.
- There are no dangling edge endpoints, missing evidence references or duplicate IDs.
- The HTML declares no external script, stylesheet or image resources.

For example, the customer key remains `postgresql:local/public/column/customers/id/` across all outputs. IDs include schemas and object kinds; the Markdown inventory retains each full ID rather than abbreviating it. Source evidence links back to the supplied SQL file and its hashes.

Artifacts are [schema.dbdep.json](schema.dbdep.json), [report.md](report.md), [dependencies.html](dependencies.html), [validation.json](validation.json), and [consistency-check.json](consistency-check.json). The reproducible artifact checker is [verify_consistency.py](verify_consistency.py). The five recorded commands exited 0.

The eight UNKNOWN records concern runtime routine references, sequence identities and default/generated expression resolution. Internal validation does not establish exhaustive consumers or source freshness. Browser interaction and visual appearance were not tested. No SQL was executed and no database connection was made.
