# Database dependency migration webpage

A local React/Vite webpage for the Agent Skill and Node.js toolkit. It explains the analysis workflow, includes English and Spanish documentation, demonstrates selected dependency traces, and opens three generated HTML reports separately.

Requires Node.js 22.18.0+ and pnpm 12.10.1. Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

Open the localhost address printed by Vite. For development:

```sh
pnpm dev
```

`prepare:demos` runs before development and builds. It copies reports, models, reviews and Markdown from `examples/rendered/` into `site/public/demos/`, copies the repository README and skill definition, and derives the webpage's counts and graph specimen from the actual models. It fails if its selected dependency paths are missing. Generated copies, `dist/`, and `node_modules/` are ignored. Regenerate the root examples with `pnpm dbdep demo examples/rendered` before building when the engine changes. Every CLI command also supports the direct entry point `node scripts/dbdep.mjs`.

The page has no backend, upload flow, credentials, live database connection, or migration execution. It does not register hosting or publish the repository. Its repository links point to the existing GitHub repository; local setup uses the checkout instead of claiming a separately published package.

The ENG/ESP control translates page text, documentation, navigation, accessible labels, feedback, document language, title and description. English is the default. The light/dark control starts from the system preference; explicit choices persist in local browser storage. Controls still work when storage is blocked. Generated report interfaces also support both languages. Source evidence, object identifiers, and analytical text retain their original language.

Documentation starts at `/#/docs`, with individual routes for introduction, installation, quickstart, good requests, command reference, evidence and confidence, and safety and limits. Topic cards and a grouped sidebar provide navigation. Hash routes support direct links, reloads, and browser history on a static server, including deployments under a subdirectory. The mobile contents button exposes its expanded state and supports Escape to close. Topic navigation focuses the new heading immediately. Documentation browsing has no entry animation or smooth scrolling.

The redesign applies the globally installed `emil-design-eng`, `animate` and `apple-design` skills. The header uses a translucent material, solid under reduced transparency or increased contrast. Colors adapt to both themes; buttons respond immediately and retain visible keyboard focus. No Claude `/design` skill was used for this revision.

The impact study highlights the selected source-backed edge on hover, focus or touch. Arrows point from dependents toward their dependency. Its eight direct and twelve potentially affected counts come from the shipped model. These are selected paths, not the entire dependency graph.

GSAP sequences the explanatory sources/model/review/artifacts flow once on entry, with replay. It finishes in about two seconds and stops when hidden or offscreen. Keyboard entry/replay shows the complete static flow. Lenis uses GSAP's ticker for pointer scrolling; keyboard fragment links jump immediately and focus their destination. Translation refreshes scroll bounds without replaying entry effects. Reduced motion disables smooth scrolling, section lifts and pointer effects. The graph remains readable without motion.

React Bits DotGrid and Magnet are adapted from pinned official sources. The retained BlurText adaptation is no longer used by the page. Full licenses and original source hashes are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the build copies every retained notice into `dist/`, linked from the footer. The new flow was independently implemented after inspecting [network-engineering's flow](https://github.com/whetstone-dev/network-engineering/blob/main/web/src/components/Flow.tsx).

The landing page contains no iframes. Each example explains a concrete question and opens the self-contained HTML report in its own tab. The same reports live in `examples/rendered/<scenario>/report.html` at the repository root. Repository links point to the corresponding example sources on GitHub; new committed files become available there after a push. The HTML reports are also shipped in the static site.

After building, run the webpage browser checks from the repository root:

```sh
pnpm exec playwright install chromium
pnpm exec playwright test tests/browser/site-regressions.spec.mjs tests/browser/site-docs.spec.mjs
```

The browser configuration serves the built page at `http://127.0.0.1:4173` and uses Playwright Chromium. Build the site first. Checks cover documentation routes, keyboard focus, mobile contents, command copying, actual reports and their JSON export, theme/language persistence, storage failure, system theme, translated mobile layouts, touch/focus/hover traces, explanatory flow, reduced motion, immediate keyboard fragments, pointer scrolling, magnetic focus reset, retained license bytes and browser errors. Root CLI/parser checks remain separate.

The reviewed desktop and mobile captures are in `screenshots/`.

Browser captures use reduced motion for stable static inspection; browser tests verify animated behavior.

With the built preview running, regenerate the documentation captures from the repository root:

```sh
node site/scripts/capture-docs.mjs
```

The script writes the desktop index in both themes, the installation page, and the Spanish mobile index to `site/screenshots/`. Set `DBDEP_SITE_URL` to use another local preview address.
