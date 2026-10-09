# Database dependency migration implementation plan

The supplied 2026-10-09 brief is the implementation contract. The existing MIT license and repository name are retained. Implementation is authorized by the user's request; no extra design approval is needed.

Use Python 3.11+ with pinned pglast 8.5, PostgreSQL 18 grammar, JSON Schema, optional psycopg and Playwright. A stable canonical graph feeds every output. Never execute migration SQL. Native PostgreSQL binaries can create an isolated fixture cluster if Docker is unavailable.

- [x] Establish executable fixtures and failing contract tests.
- [x] Implement model normalization, schema and referential validation, parser, grounded SQL reference resolution, unknown coverage.
- [x] Implement reverse graph traversal, stable diff, DDM001-DDM015, phased review plans.
- [x] Implement CLI, standalone SVG explorer, Markdown and deterministic exports.
- [x] Implement fixed read-only catalog queries, raw capture normalization, pg_rewrite ownership and authentic fixtures.
- [x] Generate three demos, browser checks, screenshots and cross-artifact checks.
- [x] Run creator validation, paired independent evaluations, objective grading, benchmark aggregation and creator review viewer. Record unavailable steps without fabricated metrics.
- [x] Document tested coverage, limitations, setup, reproducibility, provenance and release procedure.
- [x] Implement and review the additional React skill webpage using GSAP, Lenis, React Bits and globally installed Emil design guidance.
- [x] Verify packaging, formatting, all tests, git hygiene; make focused Conventional Commits with Gitmoji and required bodies. Use an annotated v0.1.0 tag on validated main. Do not publish without an explicit publication request.

Tests cover graph direction and cycles, source hashing, identifiers and ambiguity, each hazard rule, transaction context, SQL literals and credentials, catalog ownership, offline network isolation, deterministic outputs, CLI errors, HTML injection and interactions, and 100/1,000/5,000-node performance.
