# Webpage redesign

The user's requested revision adds dark mode, ENG/ESP with English as default, an explanatory flow inspired by network-engineering, per-column highlighted traces, and a simpler examples section. The user explicitly requested Emil's skills and then `apple-design`. Implementation is authorized by those requests; the concrete design follows their constraints without an additional approval gate.

Use a restrained light/dark palette, a translucent header, clear type hierarchy and immediate controls. The existing validated PostgreSQL models remain the source of the specimen and separate report files. Presentation changes do not reclassify evidence or change migration safety semantics.

- [x] Inspect network-engineering's actual `web/src/components/Flow.tsx` and official Emil skill page.
- [x] Read installed `emil-design-eng`, `animate`, `apple-design` and animation review guidance.
- [x] Establish failing checks for missing preferences, missing trace selection and embedded reports.
- [x] Implement persistent preferences and typed page translations, with English default and system theme fallback.
- [x] Implement compact evidence-backed study with hover, keyboard focus and touch selection.
- [x] Explain sources, canonical model, trace/review and generated artifacts in a replayable flow.
- [x] Replace report embeds with explanatory cards and separate HTML/source links.

| Before | After | Why |
| --- | --- | --- |
| Fixed pale palette and English-only page | Both themes and ENG/ESP controls with storage fallback | The user can choose an appropriate reading context |
| Flat header and dense visual grouping | Translucent header, distinct text hierarchy and consistent surfaces | Apple's material and grouping guidance makes navigation and content easier to distinguish |
| Static workflow cards | Short, sequential flow with replay and a complete reduced-motion view | The signal explains the order in which the toolkit produces its artifacts |
| All study traces have the same emphasis | Immediate highlight of the focused, hovered or tapped path | Selection maps a concrete dependent to its source-backed edge |
| A full graph viewer competes with the examples' explanations | Three simple scenario cards open full reports separately | Common reading stays concise; inspection gets a dedicated page |
| Locale changes would recreate scroll effects | Translation refreshes bounds without replaying effects | Keyboard controls respond immediately and keep the layout steady |
| Native PageDown started decorative section lifts | All key presses finish existing reveals; later keyboard entries finish immediately | Independent browser review observed zero moving reveals after the fix |
| Decorative canvas redrew continuously | Draw only on resize, pointer changes and active inertia; suspend offscreen and use CSS on touch | Independent browser review observed zero idle, offscreen and coarse-pointer redraws |
| Enlarged graph text overflowed nodes; a minimum height could expand the graph width | Explicit full-width graph, text-relative minimum height and scaled SVG connections | English and Spanish text stays inside its nodes at 200%, with nodes inside the visible card |

No CLI artifacts or Markdown documentation have been translated. The examples explain that their standalone reports remain in English. Theme and language preferences apply to the landing page. Production-browser evidence and remaining limits are recorded separately from the v0.1.0 creator evaluation.

Independent code and motion reviews approved the corrected revision. The motion review verified pointer replay, immediate keyboard behavior and on-demand drawing in the actual built page. Text-resize tests also assert that complete nodes remain inside the visible card; checking text containment alone missed CSS aspect-ratio width growth, which the final screenshot review caught and corrected.

Reproduce visual captures with `python scripts/capture_site_screenshots.py` after building the site. The capture uses a temporary loopback server, self-hosted fonts and reduced motion to make static comparisons stable. Browser interaction tests exercise the actual animation separately. Physical touch devices, Safari and Firefox have not been tested.
