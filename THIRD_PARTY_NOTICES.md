# Third-party notices

This repository's original code uses the MIT license in LICENSE. Archify and network-engineering informed architecture; their dependency engines were not imported. Installed Emil and Apple skills informed interface and motion decisions.

Runtime dependencies install separately using the exact workspace lockfile:

| Component | Version | License |
|---|---|---|
| libpg-query JavaScript wrapper | 18.1.5 | MIT; embedded PostgreSQL/libpg_query code retains its upstream notices |
| Ajv | 8.20.0 | MIT |
| ajv-formats | 3.0.1 | MIT |
| pg | 8.23.1 | MIT |
| pg-connection-string | 2.14.1 | MIT |
| Commander | 15.0.0 | MIT |
| Playwright, development | 1.56.0 | Apache-2.0; browser binaries retain their own notices |
| fflate, packaging | 0.8.3 | MIT |
| Prettier, development | 3.9.9 | MIT |
| Archivo and IBM Plex Mono embedded fonts | retained font files | SIL Open Font License 1.1 |

Complete font licenses are in assets/viewer and embedded in each standalone report's HTML comment. Consult installed package licenses when distributing dependencies together. The npm tarball and Agent Skill package include original source/resources and licensed font files; runtime dependencies and browser binaries install separately.

The separate site application uses pinned GSAP, Lenis, React and Motion dependencies. It includes application-specific React Bits adaptations at a recorded upstream commit under MIT + Commons Clause. Complete retained licenses, source hashes and adaptation notes are in [site/THIRD_PARTY_NOTICES.md](site/THIRD_PARTY_NOTICES.md). Those webpage components are excluded from the Agent Skill package.

Historical v0.1.0 and v0.2.0 releases used Python, pglast and psycopg. Their licenses and validation records remain part of those tagged releases; they are not dependencies of v0.3.0.
