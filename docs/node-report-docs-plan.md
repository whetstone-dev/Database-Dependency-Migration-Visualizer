# Node toolkit, reports, and documentation plan

Goal: replace the full Python toolkit with an independent Node.js implementation, use a single pnpm workspace, and give documentation and standalone reports the website's design and preferences.

Architecture: ES modules in src/dbdep use PostgreSQL 18's real WASM parser, Ajv 2020 schema validation, and pg for allowlisted read-only catalog snapshots. Canonical schema 1.0.0 and CLI flags remain stable. No Python subprocesses occur in the shipped engine, CLI, tests, or packaging toolkit. Creator-owned evaluation scripts may still use the creator's own Python runtime, with that distinction documented.

## Work boundaries and contracts

- Engine implementation owns model.mjs, sql.mjs, graph.mjs, rules.mjs, planning.mjs, engine.mjs, and tests/node/engine*.test.mjs. Export the Python public names as synchronous functions. Initialize libpg-query with top-level await loadModule(), then parseSync. Builder constructor(version='18', source_mode='offline_ddl'); evidence(source, Buffer, start, length, status, origin, extraObject), node(kind,schema,name,evidence,parent,signature,properties,status,origin), edge(source,target,kind,evidence,status,origin,properties), unknown(explanation,evidence,object_id), finish(). Builder.nodes/edges are Map; model is a plain JSON object. inspect_ddl(path,repo=null,version='18'), review(baseline,path,version='18',metadata=null,transaction_mode='statements'), impact(model,object,operation=null,to=null), diff(before,after), select(model,object), canonical(value), digest(value), validate(model,strict=false), resources() return root directory string. Preserve confidence, provenance, secret-safe validation, DDM001-015, cycle safety, quoted identities, and explicit coverage gaps. Compare checked-in fixture outputs and port regression cases before retiring Python sources.
- Website implementation owns site sources, site/package.json, site/scripts, and tests/browser/site*.spec.mjs. Build a /#/docs documentation index and topic navigation with sidebar/cards, bilingual content, shared preferences, real Node commands, mobile navigation, native keyboard behavior, and reduced motion. No Claude design skill. Follow installed Emil and Apple skills. Do not edit root workspace files or report assets.
- Report implementation owns assets/viewer and tests/browser/report*.spec.mjs. Preserve all graph IDs and model semantics while adding matching palette/type, inline fonts with licenses, theme and locale controls, accessibility, and state-preserving translations. Communicate new renderer placeholders to root. Font data stays offline and CSP hashes are calculated after substitution. Display original source/evidence text without modifying canonical data. SVG export retains active colors; JSON export remains the canonical model.
- Root owns catalog.mjs, reports.mjs, cli.mjs, Node scripts, pnpm workspace/lockfile, documentation, CI, release artifacts, integration tests, and integration review. Preserve SELECT allowlist hashes so authentic captures stay valid. Separate read-only discovery from isolated fixture creation.

## Verification and delivery

- [x] Install exact Node dependencies and frozen pnpm lockfile.
- [x] Write and pass semantic, security, migration, graph, schema, and CLI regression tests.
- [x] Compare fixture behavior with the previous engine and investigate differences before regenerating artifacts.
- [x] Run isolated PostgreSQL tests against a newly initialized temporary cluster with a read-only role.
- [x] Run browser tests for reports and docs: light/dark, ENG/ESP persistence, keyboard/touch/reduced motion, original model export, graph focus/filters, and offline CSP.
- [x] Regenerate demos from the Node CLI and verify byte-for-byte reproducibility.
- [x] Run the installed creator's evaluation workflow for the new runtime and report limitations honestly, retaining old evaluation evidence.
- [x] Build reproducible .skill, npm tarball, and website archive; smoke-test outside the checkout using Node only.
- [x] Record design review, screenshots, test evidence, supported behavior and limitations.
- [x] Remove superseded Python application/toolkit sources and Python-only metadata after parity succeeds; retain historical evaluation evidence.
- [x] Commit using the user's Gitmoji convention and create a new annotated release tag on main, preserving old tags. No remote push or deployment.
