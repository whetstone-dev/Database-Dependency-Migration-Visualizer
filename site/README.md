# Database dependency migration website

A separate Next.js 16.4 App Router website for the Agent Skill and Node.js toolkit. It explains PostgreSQL dependency analysis, exports English documentation as HTML at `/docs/`, supports English/Spanish controls, and opens three generated standalone HTML reports. Hosting uses the [manual GitHub Pages workflow](../.github/workflows/pages.yml); deployment is separate from local validation and is not claimed here.

## Development and build

Use Node.js 22.18+ and pnpm 12.10.1. Run from the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

For a production preview:

```sh
pnpm build
pnpm preview
```

Open the localhost address printed by Next.js in development or the static preview in production. `prepare:demos` runs before development and builds. It copies report HTML, model JSON, review JSON and Markdown from `examples/rendered/`, copies README/SKILL documentation, derives the visible graph/counts from the models, and retains complete website license notices. It rejects missing selected dependency paths. Generated copies, build output and dependencies are ignored.

When the engine changes, run `pnpm demo` and `pnpm verify:examples` before rebuilding. Do not edit generated reports or model data by hand. The CLI also supports `node scripts/dbdep.mjs <command>`.

## Interface and evidence

English is the default. ENG/ESP translates website copy, documentation, accessible controls and document language. Light/dark starts from system preferences; explicit choices persist when storage is available. Report controls support both languages, while CLI/Markdown and analytical explanations remain English. Source identifiers and evidence retain their original language.

The selected impact traces come from real curated model edges. Arrows point from a dependent toward its dependency; selected traces do not represent every runtime consumer. Example cards open self-contained reports in separate tabs. The canonical JSON remains unchanged by UI preferences and can be exported from the report.

Keyboard focus and fragment navigation are immediate. Reduced motion disables smooth scrolling and decorative movement. The explanatory flow supports replay and remains readable without animation. GSAP, Lenis and adapted React Bits components provide the retained motion/pointer behavior.

The site has no backend, upload endpoint, credentials, database discovery or migration execution. See [security](../references/security.md), [parser coverage](../references/parser-and-confidence.md), and the [audit](../docs/security-audit.md).

## GitHub Pages

Follow [the Pages guide](../docs/github-pages.md). Select **GitHub Actions** as the Pages source, then manually run `pages.yml` for reviewed, published `main` source. Pushes and pull requests do not deploy automatically.

The workflow uploads only `site/out`. Curated reports/models and copied documentation/licenses are public; local `out/`, `tmp/` and `evals/` directories are excluded from the deployment. Next.js uses `output: "export"`, directory indexes and a build-time `NEXT_PUBLIC_BASE_PATH` supplied by Pages configuration. No Node server is deployed. Inspect the actual deployment URL after the workflow succeeds.

All seven documentation topics have direct `/docs/<topic>/` routes that survive reloads and contain English content with JavaScript disabled. Existing `/#/docs` bookmarks redirect after JavaScript loads. Theme, Spanish translation and interactive controls require JavaScript. Unknown routes return 404 in the preview; actual GitHub Pages behavior must be checked after deployment. Next.js runtime build IDs can differ between builds; deterministic toolkit/example checks remain separate from website bundle generation.

The post-build finalizer normalizes Windows segment filenames to the dot-separated names requested by Next.js's router. Linux already emits those names. This addresses the [upstream Windows export issue](https://github.com/vercel/next.js/issues/92339), preserves payload bytes and rejects filename collisions. Publication validation compares normalized payloads with the compiler's original artifacts.

## Verification and notices

Build first, then run from the repository root:

```sh
pnpm exec playwright install chromium
pnpm check:site
pnpm test:browser
```

The browser configuration serves the built site at `http://127.0.0.1:4173`. For a prefixed build, set `DBDEP_SITE_URL` to the full local base URL. Tests cover exported documentation without JavaScript, direct routes and old bookmarks, keyboard/mobile navigation, theme/language persistence, blocked storage, source-backed traces, actual report exports, motion preferences, retained licenses and browser errors. Publication checks compare pages, route payloads and runtime files with their compiled sources and reject unexpected files, source maps and symlinks. CLI/parser checks and visual inspection remain separate.

Reviewed captures are in [screenshots/](screenshots/). `node scripts/capture-site-screenshots.mjs` captures the built site; with a preview running, `node site/scripts/capture-docs.mjs` captures documentation pages. `DBDEP_SITE_URL` can select another local preview address. Set `DBDEP_CAPTURE_DIR` to save new review captures separately. Static captures use reduced motion.

React Bits adaptations retain pinned source hashes and MIT + Commons Clause notices. GSAP retains its Standard License. All retained notices are copied into the build and linked from the footer. Read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistribution. The explanatory flow was independently implemented after inspecting [network-engineering's flow](https://github.com/whetstone-dev/network-engineering/blob/main/web/src/components/Flow.tsx); no PostgreSQL engine code was imported from that project.
