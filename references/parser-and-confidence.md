# Parser and confidence

pglast 8.5 uses PostgreSQL 18 grammar. It parses syntax; it does not run PostgreSQL name/type binding. CLI version context accepts PostgreSQL 14-18, but grammar acceptance does not prove syntax exists on every release. Actual fixture execution is recorded separately. Use release-specific documentation and a disposable database before making execution claims.

Implemented offline objects include schemas, regular/partitioned tables, columns, named/unnamed common constraints, views, materialized views, sequences, enum/domain/composite types, overloaded functions/procedures, indexes and triggers. Composite FK column order is preserved. Identity/default/generated definitions are hashed. Column type relationships resolve to declared custom types.

Unqualified custom type collisions remain UNKNOWN and produce no direct type edge. Unnamed constraints use content-based synthetic identities; duplicate CHECK declarations receive deterministic occurrence suffixes. Displayed inferred names do not establish PostgreSQL's actual generated names. Catalog comparison requires matching capture modes and explicit name reconciliation.

Simple SELECT/INSERT/UPDATE/DELETE SQL files produce query nodes and grounded relations/column references. Quoted identifiers preserve case. Unqualified names with collisions are UNKNOWN; the tool does not invent search_path. Nested queries, CTEs and set operations retain grounded relation references while column scope is UNKNOWN. Join USING/NATURAL column expansion, implicit generated view-column names, function overload calls, inheritance expansion and routine bodies need catalog or manual follow-up. Unsupported AST statements remain explicit unknowns. A directory schema input represents declarations; it does not replay a chronological migration history.

SQL in TypeScript/JavaScript/Python/C#/Java/Prisma files is not parsed as PostgreSQL. Such files contribute host-language coverage gaps with hashes. No ORM adapter is claimed. All PL/pgSQL/SQL routine body/runtime references are flagged UNKNOWN offline, including dynamic SQL, instead of scanning string fragments and claiming facts. Syntax failure exits 2 with a secret-safe diagnostic, without partial model output.

OBSERVED means extracted supplied catalog metadata; PARSED means syntax-aware static evidence; INFERRED means plausible but unproven; UNKNOWN means unsupported/ambiguous/unavailable. Confidence values `direct`, `conditional`, `unknown` describe evidence interpretation, not probabilities.
