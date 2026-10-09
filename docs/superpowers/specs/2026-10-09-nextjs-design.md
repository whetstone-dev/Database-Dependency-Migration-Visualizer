# Next.js webpage migration

The maintainer requested a Next.js port of the existing webpage, disabled automated Dependabot PRs, and required one PR for this work. Preserve the current interface and its evidence claims. GitHub Pages remains the deployment target.

Use Next.js 16.4.0 App Router with `output: "export"` and directory-style routes. Generate the home page, the documentation overview, and every existing documentation topic at build time. Retain compatibility redirects for old `#/docs` bookmarks in the client. An explicitly configured build-time base path supports the GitHub repository URL; development and ordinary local exports use the domain root.

Retain the current styles, licensed fonts, animations, pointer traces, accessibility behavior, and ENG/ESP and theme preferences. Keep browser APIs in effects or guarded client code, with deterministic server markup and a pre-paint theme bootstrap. Separate the shared client shell from home and documentation entry points. Serve generated report HTML as independent files with their existing controls and canonical JSON.

Export to `site/out`. Preview the actual static export with a localhost-only file server that supports the configured base path, directory indexes, HTTP 404 responses and safe path containment. Update the publication validator to recognize bounded Next.js route/runtime files and preserve byte comparisons for copied reports, documents and notices. Continue rejecting unexpected private files, source maps and symlinks.

Keep SHA-pinned Actions, manual deployment, maintainer approval and existing database tests. The Pages workflow obtains its base path before building. Validate root and repository-prefix exports in automation. Remove `.github/dependabot.yml`; automatic security-update PRs are already disabled remotely. Retain vulnerability visibility and the dependency audit. Do not rewrite previous bot commits or immutable release evidence.

Completion requires a working export, browser checks for direct documentation navigation/reload and legacy bookmarks, persistence and reduced motion, publication rejection tests, a dependency audit, unchanged curated examples, retained licenses, and one reviewable PR. Publishing the page or creating a release is outside this change.
