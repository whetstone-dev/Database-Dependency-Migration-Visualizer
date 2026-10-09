# Changelog

## 0.2.0 - 2026-10-09

Redesigned the skill webpage using Emil's design-engineering, animation and Apple design skills. Added persistent light/dark and ENG/ESP controls, English by default, a replayable analysis flow, and evidence-backed dependency traces that highlight on hover, focus or touch.

Replaced embedded graph viewers with simple explanatory scenario cards linking to separate, self-contained HTML reports and example sources. Added text-resize, touch, preference-storage and keyboard/motion regression checks. Decorative dots draw on demand, pause offscreen and use a static grid on touch devices. PageDown and keyboard controls complete decorative movement immediately.

The PostgreSQL analysis engine and report semantics are unchanged. Reports, CLI artifacts and Markdown documentation remain in English. The v0.1.0 creator evaluation is retained as historical evidence; website tests and review evidence for this revision are recorded separately in `docs/webpage-validation.json`.

## 0.1.0 - 2026-10-09

Initial analysis-only PostgreSQL skill/toolkit: canonical model and validators, offline AST inspection, reverse impact, fifteen deterministic risk rules, phased plans, snapshot diff, fixed catalog capture, standalone interactive SVG reports, reproducible examples and evaluation tooling.

Added a separate React skill webpage with GSAP, Lenis, application-specific React Bits adaptations, model-derived specimens and three interactive reports. Applied the globally installed Emil design-engineering skill to viewer and webpage interactions. Dependency notices and reduced-motion/browser checks are included.

Limitations include routine/dynamic/ORM runtime coverage, nested column scopes, DML transformation analysis, target-schema replay, exact CASCADE closure and operational timing. Evaluation/validation receipts are in `docs/validation.md` and `evals/README.md`. Local version/tag does not imply a published GitHub/PyPI release.
