# Consumers of public.customers.email

The only grounded column consumer in the supplied files is app/static.sql line 1: `SELECT email FROM public.customers WHERE id = $1`. Its unqualified email resolves within the explicitly qualified, single source table.

Two additional dynamic sites remain unresolved:

- schema.sql defines public.lookup_customer(field_name text). The PL/pgSQL EXECUTE concatenates quote_ident(field_name) into a SELECT. Its literal FROM public.customers is a table hint. email is possible only if the runtime argument selects that name; no argument values or callers were supplied.
- app/query.ts line 2 interpolates `${column}` in a TypeScript SQL template. public.customers is literal text; the selected expression is unknown. The fixture explicitly describes host-language SQL as unresolved. This template is recorded as a dynamic site without an edge to email.

The generated graph asserts the static email edge and records table hints for the dynamic sites. It does not invent dynamic column targets. quote_ident protects the PL/pgSQL identifier syntax; it does not reveal which identifier will be chosen. The TypeScript template has no shown identifier quoting or whitelist; its runtime validity and input control cannot be established from the file.

Coverage is complete for the three supplied files and the grounded static consumer, not for all runtime consumers. Runtime argument evidence, constrained callsites or captured query logs would be needed to resolve dynamic targets. External jobs, other application files, live dependencies and generated SQL are uninspected. No live catalog or query execution was used.
