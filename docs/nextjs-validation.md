# Next.js migration validation

Validated locally on 2026-10-09 with Windows, Node.js 24.15.0, pnpm 12.10.1, Next.js 16.4.0 and Playwright 1.63.0. This records the webpage migration on `feat/nextjs-static-site`. It does not replace frozen creator evaluations or earlier release receipts.

## Completed changes

The App Router exports the home page, documentation overview and seven topic pages as HTML. Direct topic links and reloads work without a server rewrite. English documentation is readable with JavaScript disabled. Old `#/docs` bookmarks redirect to the new routes when JavaScript runs.

The shared shell retains the existing styles, fonts, ENG/ESP and theme preferences, motion, keyboard behavior and evidence traces. Standalone reports remain generated from the toolkit and open separately. Browser APIs run after mounting; the theme bootstrap restores preferences before paint. Navigation focuses the destination after its content mounts.

Pages builds with its configured base path and uploads only `site/out`. CI validates both a root build and the repository path. The loopback preview serves actual files and HTTP 404 responses, rejects writes and prevents reads through paths or symlinks outside the export. Publication validation rejects unexpected public files, source maps and symlinks, and compares copied inputs and compiled runtime files byte-for-byte.

The finalizer corrects Next.js's [Windows segment filename issue](https://github.com/vercel/next.js/issues/92339). It converts nested filenames to the names requested by the router, preserves bytes, rejects collisions before moving files and leaves Linux filenames unchanged. An explicit browser regression navigates all seven topics and fails on HTTP errors, console errors or hydration errors.

The PR removes `.github/dependabot.yml`. Automatic security-fix PRs were already disabled in repository settings. Dependency auditing and the frozen lockfile remain active. Previous bot commits are preserved. All changes are submitted together in one PR.

## Verification

| Check                                                         | Result                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Frozen installation with scripts disabled                     | Passed; lockfile supply-chain policy accepted                                                                      |
| Node test suite                                               | 144 passed, 2 live cases skipped without a fixture DSN                                                             |
| Curated artifact regeneration                                 | All 18 outputs matched byte-for-byte                                                                               |
| Dependency audit                                              | No known advisories reported across 131 dependencies                                                               |
| Root production build and publication validation              | Passed; 9 content routes, 12 demo files and both copied source documents verified                                  |
| Root browser suite                                            | 73 passed                                                                                                          |
| Repository-prefix production build and publication validation | Passed at `/Database-Dependency-Migration-Visualizer`                                                              |
| Repository-prefix browser suite                               | 73 passed                                                                                                          |
| Desktop/mobile visual review                                  | Light/dark and English/Spanish captures retained the existing layout; no horizontal overflow in captures           |
| Distribution smoke in an isolated snapshot                    | npm package and unpacked skill installed outside the checkout; doctor and all three strict demo validations passed |
| Website archive                                               | Publication inputs and retained licenses verified before packaging                                                 |

Local logs, publication inventories, audit results and captures are under the ignored `out/nextjs-*` paths. Package checks used an isolated snapshot rather than replacing existing `dist/v0.3.2` release artifacts. The normalizer has regressions for byte preservation, idempotence, collisions, Linux output and directory cleanup. Publication tests cover tampered bundles, unexpected payloads, mismatched base paths, source maps and directory links.

## Limits and publication

Remote CI must pass for the final PR revision, including the existing PostgreSQL 14-18 matrix. Local skipped live cases are not proof of that matrix. Main still requires an approval from `JoseDFlorez` or `Juanfrxz`, with a different maintainer approving the author's latest push.

No Pages deployment, new release tag or release asset publication is part of this migration. Verify the deployed URL, direct topic reloads and 404 behavior after manually running Pages on reviewed `main`. Removing the version-update configuration takes effect when this PR merges.

English is the exported default. Spanish translation, saved preferences, bookmark redirects and interactive controls require JavaScript. A base-path change requires rebuilding. The filename correction depends on the pinned Next.js export layout and must be reviewed when upgrading Next.js.

Next.js generates runtime build identifiers, so website exports are not claimed to be byte-identical across independent builds. Toolkit/model/report reproducibility remains covered by deterministic checks. Packaging verification proves the contents of the tested snapshot and preserves earlier release evidence; it does not create a new release.
