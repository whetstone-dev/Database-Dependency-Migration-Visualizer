# Database dependency migration webpage

A local React/Vite webpage for the Agent Skill and Python toolkit. It explains the analysis workflow, demonstrates selected dependency traces, and links to three generated HTML reports that open separately.

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

The ENG/ESP control translates page text, navigation, accessible labels, feedback, document language, title and description. English is the default. The light/dark control starts from the system preference; explicit choices persist in local browser storage. Controls still work when storage is blocked. CLI artifacts, generated reports and linked documentation remain in English, as stated beside the examples.

The redesign applies the globally installed `emil-design-eng`, `animate` and `apple-design` skills. The header uses a translucent material, solid under reduced transparency or increased contrast. Colors adapt to both themes; buttons respond immediately and retain visible keyboard focus. No Claude `/design` skill was used for this revision.

The impact study highlights the selected source-backed edge on hover, focus or touch. Arrows point from dependents toward their dependency. Its eight direct and twelve potentially affected counts come from the shipped model. These are selected paths, not the entire dependency graph.

GSAP sequences the explanatory sources/model/review/artifacts flow once on entry, with replay. It finishes in about two seconds and stops when hidden or offscreen. Keyboard entry/replay shows the complete static flow. Lenis uses GSAP's ticker for pointer scrolling; keyboard fragment links jump immediately and focus their destination. Translation refreshes scroll bounds without replaying entry effects. Reduced motion disables smooth scrolling, section lifts and pointer effects. The graph remains readable without motion.

React Bits DotGrid and Magnet are adapted from pinned official sources. The retained BlurText adaptation is no longer used by the page. Full licenses and original source hashes are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the build copies every retained notice into `dist/`, linked from the footer. The new flow was independently implemented after inspecting [network-engineering's flow](https://github.com/whetstone-dev/network-engineering/blob/main/web/src/components/Flow.tsx).

The landing page contains no iframes. Each example explains a concrete question and opens the unchanged self-contained HTML report in its own tab. The same reports live in `../examples/rendered/<scenario>/report.html`. Repository links point to the corresponding example sources on GitHub; new committed files become available there after a push. The HTML reports are also shipped in the static site, without relying on GitHub to serve them.

After building, run the webpage browser checks from the repository root:

```sh
python -m pytest tests/test_site_browser.py -q
```

They launch a temporary localhost HTTP server and Playwright Chromium. Tests skip if `site/dist/index.html` is absent. Checks cover actual separate reports and their JSON export, theme/language persistence, storage failure, system theme, translated mobile layouts, touch/focus/hover traces, explanatory flow, clipboard feedback, reduced motion, immediate keyboard fragments, pointer scrolling, magnetic focus reset, retained license bytes and browser errors. Root CLI/parser checks remain separate.

The reviewed desktop and mobile captures are in `screenshots/`.

Regenerate them from the repository root with `python scripts/capture_site_screenshots.py`. Captures use reduced motion for stable static inspection; browser tests verify animated behavior.
