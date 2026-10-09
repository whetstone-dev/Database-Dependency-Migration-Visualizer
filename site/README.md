# Database dependency migration webpage

A local React/Vite webpage for the Agent Skill and Python toolkit in this repository. It contains a source-backed dependency specimen, installation instructions, coverage boundaries, and three interactive generated reports.

Requires Node.js 22.12+ or 24+ and npm. From `site/`:

```sh
npm ci
npm run build
npm run preview
```

Open the localhost address printed by Vite. For development:

```sh
npm run dev
```

`prepare:demos` runs before development and builds. It copies reports, models, reviews and Markdown from `../examples/rendered/` into `public/demos/`, copies the repository README and skill definition, and derives the webpage's counts and graph specimen from the actual models. It fails if its selected dependency paths are missing. Generated copies, `dist/`, and `node_modules/` are ignored. Regenerate the root examples with `python scripts/dbdep.py demo examples/rendered` before building when the engine changes.

The page has no backend, upload flow, credentials, live database connection, or migration execution. It does not register hosting or publish the repository. Its repository links point to the existing GitHub repository; local setup uses the checkout instead of claiming a separately published package.

GSAP supplies brief section lifts, dependency trace drawing and scroll progress. Lenis uses GSAP's ticker, and iframe scrolling stays inside the report. Keyboard fragment links jump immediately and focus their destination; pointer links scroll smoothly. Keyboard focus resets magnetic buttons without a transition. Reduced motion disables smooth scrolling, section motion, animated text and pointer effects. React Bits BlurText, DotGrid and Magnet are adapted from pinned official sources. Their full license and source hashes are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The build copies that notice and every retained license into `dist/`, linked from the footer.

The embedded reports use `sandbox="allow-scripts allow-downloads"`. They have an opaque origin and cannot access the parent page or storage. Scripts and downloads are needed for the report's graph controls and SVG/JSON exports. `allow-same-origin` is intentionally absent. The full-report link opens the same generated report in its own tab.

After building, run the webpage browser checks from the repository root:

```sh
python -m pytest tests/test_site_browser.py -q
```

They launch a temporary localhost HTTP server and installed Playwright Chromium. Tests skip if `site/dist/index.html` is absent. They check desktop and mobile layouts, keyboard tabs, all real iframe reports, sandboxed JSON export, clipboard feedback, reduced motion, immediate keyboard fragment navigation and focus, pointer smooth scrolling, magnetic focus reset, retained license bytes, and browser errors. Root CLI/parser checks remain separate.

The reviewed desktop and mobile captures are in `screenshots/`.
