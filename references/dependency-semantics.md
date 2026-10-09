# Dependency semantics

Every edge points from dependent/reference source to its target. Impact uses a cycle-safe breadth-first traversal of reverse edges and returns deterministic shortest edge paths. It excludes the root from its own dependents. It separates paths containing PARSED/INFERRED/UNKNOWN evidence from all-OBSERVED paths.

`foreign_key` represents a relational constraint/relationship. Constraint nodes link to local and referenced key columns; a distinct local-column relationship to referenced columns allows column impact traversal. This does not mean a referencing row always exists or a foreign key carries an ERD cardinality guarantee.

`catalog_dependency` preserves pg_depend.deptype and both catalog addresses. Types n/a/i/e/x/P/S retain PostgreSQL's recorded meaning; the engine does not turn every type into a user-removable object. Internal triggers, row/array types, rewrite rules and extension membership need special deletion semantics. `pg_rewrite` owners become user-facing view nodes, with the rule address retained as evidence. This is graph normalization, not deletion simulation.

`query_reference` is grounded AST table/column source evidence. `trigger_association` links a trigger to its relation and routine; association alone does not establish references to every relation column. `expression_reference` represents indexes and constraint expressions. `contains` has a child as source and owner as target, so dropping a table can affect its columns. `partition`/`inheritance` preserve structural relationships. `sequence_ownership` describes catalog-recorded sequence/column ownership. Runtime call targets and dynamic identifiers remain UNKNOWN.

A rename preserves recorded object identities in PostgreSQL; application SQL strings can break. A reverse path is potential impact. RESTRICT and CASCADE behavior depends on catalog dependency types, internal ownership and the exact operation. The engine intentionally does not compute an exact deletion closure or suggest CASCADE as automatically acceptable.
