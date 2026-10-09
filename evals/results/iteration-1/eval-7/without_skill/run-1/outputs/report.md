# Ecommerce canonical artifacts and integrity

Created model.json, report.md and self-contained review.html from ecommerce/schema.sql. App SQL is deliberately outside this task's schema-only model.

Counts: 64 nodes and 134 edges. By kind: {"column": 23, "constraint": 17, "function": 1, "identity_generator": 5, "index": 9, "schema": 1, "table": 6, "trigger": 1, "view": 1}.

The model includes six tables, their columns and source constraints, supporting indexes, five identity generators, one explicit index, customer_summary and derived outputs, touch_customer and its trigger. Supporting indexes and identity generators are inferred semantics with unknown physical sequence names. Source evidence is attached to relationships.

validation.json checks unique IDs, deterministic kind/identity hashes, existing endpoints, evidence presence and count integrity. A second parse of the same source is exactly equal. The HTML embeds the same JSON model and counts. The browser controls support name search, kind filtering, selecting nodes, keyboard activation and inspecting consumers/providers. The shared verification command checks the HTML JSON and JavaScript syntax.

Coverage is offline source only. PL/pgSQL body analysis is lexical for NEW.updated_at and does not claim full procedural semantics. Built-in types/functions are not inventoried as database objects; external callers and live operational evidence are absent. No SQL was executed.
