# Node migration validation

Version 0.3.0 replaces the Python engine, CLI, support scripts, automated tests and package metadata with Node.js ES modules and a single pnpm workspace. The canonical model stays at schema version 1.0.0. Historical v0.1.0/v0.2.0 records remain in their existing receipts and Git tags.

The local environment is Windows, Node.js 24.15.0, pnpm 12.10.1, Chromium from Playwright 1.56.0, and native PostgreSQL 18.3. Node.js 22.18 is the declared minimum but was not tested locally. CI is configured for PostgreSQL 14.20, 15.15, 16.11, 17.7 and 18.1; remote CI has not run for this change.

Observed verification:

| Check | Result |
|---|---|
| Frozen pnpm workspace installation | Passed |
| Native engine and CLI suite | 99 passed; 2 isolated live tests skipped without a fixture DSN |
| Isolated PostgreSQL cluster | 2 live tests passed; seven shipped schema/diff fixture files execute; proposals never execute; cluster stopped and removed |
| TypeScript and production webpage build | Passed |
| Report, documentation and creator viewer browser suite | 51 passed in 59.1 seconds |
| Curated fixture regeneration | 18 artifacts reproduce byte-for-byte |
| Synthetic scale checks | 100, 1,000 and 5,000 objects remain complete; viewer renders at most 350 |
| Skill creator frontmatter validators | System and installed creator both report valid |
| Installed creator packager | Validates the clean Node skill stage; packaged member hashes match the Node release archive |
| npm package and unpacked Agent Skill | Node-only installations outside the checkout generate and strictly validate all three demo models; skill installation uses the frozen production pnpm lockfile |
| npm, skill and website reproducibility | All three archives reproduce byte-for-byte on a second local build |

The engine implementer compared the full native output to the legacy Python output for five DDL fixtures and three ecommerce reviews before removing the old sources. Existing saved canonical models still validate. The analytics catalog's generated evidence changes because JavaScript serializes integer-valued estimates without Python's `.0`; the original authentic capture is unchanged. This is a reproducible representation change, not a newly observed database fact.

Independent review found and reproduced unsupported alias-column and implicit-join scopes, a routine signature collision, incorrect BOM hashes/ranges, and prepared transaction context. Regressions now cover these. Alias lists and USING/NATURAL joins explicitly remain UNKNOWN instead of producing incorrect column edges. Domain declarations, qualified stars and chained transactions also have regressions. Source hashes use original bytes, including a BOM.

The report and docs review initially blocked approval for header overflow at enlarged intermediate widths and an unreachable sticky-sidebar link. New regressions and independent probes verify 200% Spanish text at 601, 700, 820, 1000, 1101 and 1440 px. Sidebar focus now remains inside the viewport. Frequent report tab actions are immediate. Final UI review approved the changes.

| Before | After | Why |
|---|---|---|
| Separate report palette and serif type | Same webpage colors, Archivo and IBM Plex Mono | Consistent presentation and embedded offline fonts |
| English-only report interface | Persistent ENG/ESP and light/dark controls | Shared preferences, localized accessible labels and controls |
| Raw documentation links | Topic index, grouped sidebar and seven bilingual guides | Readers can navigate installation, commands and evidence boundaries |
| Header/sidebar failed with enlarged text | Adaptive wrapping and bounded native scrolling | Keyboard controls and links stay reachable |
| Repeated report tabs restarted fades | Immediate view switching | Frequent analysis controls do not replay decoration |

Theme and locale changes preserve model JSON, graph selection, filters, pan/zoom and active tab. Exported SVGs retain the chosen palette and embedded fonts. Report UI translates; original analytical text, evidence and identifiers retain their original language. This protects evidence provenance rather than silently translating claims. Markdown and CLI output remain English.

Browser verification covers Chromium only. It does not prove performance on physical devices or other browsers. SVG labels and path previews have display limits; exported model and CLI paths retain all objects. Catalog definitions, runtime consumers, routine bodies, dynamic SQL, ORM bindings, nested column scopes, data transformation semantics, exact CASCADE closure, target-schema replay, measured lock duration and production downtime remain partial or unavailable.

The creator comparison uses a frozen Node prerelease and the previous v0.2.0 skill, with real source/input manifests. Both configurations pass 25/25 original assertions; the independent grader's 103 artifact checks pass. The external creator and historical baseline use their own Python tooling; the new application, test and packaging workflow requires Node only. One executor per configuration completes eight cases, rather than independent repeated per-case sessions. Final report motion and documentation accessibility polishing happened after the evaluation snapshot and are covered by the final browser tests. The comparison also identified UUID-specific wording in the generic review checklist for unrelated changes. Final wording is conditional and two separate regressions verify numeric changes and identifier mapping/recovery guidance. Instructions now distinguish catalog payload fingerprints from SQL-query hashes. Frozen evaluation outputs remain unchanged. Creator results, missing metrics and human-review limitations are recorded separately in the evaluation documentation.

The creator viewer uses a byte-verified stage, UTF-8 mode on Windows and JSON delimiter escaping. An independent final review confirms all 16 displayed grades and 189 embedded text outputs match their originals, with creator newline normalization. Both review tabs work, the embedded benchmark matches the corrected file, and raw creator attempts remain available. Nested report/comparison bundles are not displayed by that upstream viewer. LF/CRLF hostile closing-script tests cover the encoding fix. Fresh baseline preparation honors explicit workspace/ref and rejects replacement of a frozen snapshot.
