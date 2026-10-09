# Third-party notices

This repository's original code is MIT licensed under LICENSE. No code or assets from Archify, network-engineering or Emil Kowalski's skill repository are bundled; those projects informed architecture and interaction decisions.

Runtime dependencies are installed separately:

| Component | Version | License |
|---|---|---|
| pglast | 8.5 | GPL-3.0-or-later; embedded libpg_query has its own upstream notices |
| jsonschema | 4.26.0 | MIT |
| psycopg, optional | 3.3.2 | LGPL-3.0; binary distribution retains bundled library notices |
| Playwright, development | 1.56.0 | Apache-2.0; browser binaries retain their own notices |
| pytest, development | 8.4.2 | MIT |
| Ruff, development | 0.14.0 | MIT |
| PyYAML, development | 6.0.3 | MIT |

Consult installed package metadata and upstream licenses when distributing a combined environment. A wheel/.skill of this repository includes original source/resources, not third-party runtime dependencies or browser binaries.

The separate `site/` application uses pinned GSAP, Lenis, React and Motion dependencies and self-hosted fonts. It integrates application-specific React Bits adaptations at a recorded upstream commit under MIT + Commons Clause. Their complete retained license, source hashes, adaptations and other notices are in [site/THIRD_PARTY_NOTICES.md](site/THIRD_PARTY_NOTICES.md). The website's dependencies/components are excluded from the Python wheel and Agent Skill package.
