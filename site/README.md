# Database dependency migration website

A separate React/Vite website for the Agent Skill and Node.js toolkit. It explains PostgreSQL dependency analysis, provides English/Spanish documentation at `/#/docs`, and opens three generated standalone HTML reports. The pending local release is v0.3.2. Hosting uses the [manual GitHub Pages workflow](../.github/workflows/pages.yml); deployment is separate from local validation and is not claimed here.

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

Open the localhost address printed by Vite. `prepare:demos` runs before development and builds. It copies report HTML, model JSON, review JSON and Markdown from `examples/rendered/`, copies README/SKILL documentation, derives the visible graph/counts from the models, and retains complete website license notices. It rejects missing selected dependency paths. Generated copies, build output and dependencies are ignored.

When the engine changes, run `pnpm demo` and `pnpm verify:examples` before rebuilding. Do not edit generated reports or model data by hand. The CLI also supports `node scripts/dbdep.mjs <command>`.

## Interface and evidence

English is the default. ENG/ESP translates website copy, documentation, accessible controls and document language. Light/dark starts from system preferences; explicit choices persist when storage is available. Report controls support both languages, while CLI/Markdown and analytical explanations remain English. Source identifiers and evidence retain their original language.

The selected impact traces come from real curated model edges. Arrows point from a dependent toward its dependency; selected traces do not represent every runtime consumer. Example cards open self-contained reports in separate tabs. The canonical JSON remains unchanged by UI preferences and can be exported from the report.

Keyboard focus and fragment navigation are immediate. Reduced motion disables smooth scrolling and decorative movement. The explanatory flow supports replay and remains readable without animation. GSAP, Lenis and adapted React Bits components provide the retained motion/pointer behavior.

The site has no backend, upload endpoint, credentials, database discovery or migration execution. See [security](../references/security.md), [parser coverage](../references/parser-and-confidence.md), and the [audit](../docs/security-audit.md).

## GitHub Pages

Follow [the Pages guide](../docs/github-pages.md). Select **GitHub Actions** as the Pages source, then manually run `pages.yml` for reviewed, published `main` source. Pushes and pull requests do not deploy automatically.

The workflow uploads only `site/dist`. Curated reports/models and copied documentation/licenses are public; local `out/`, `tmp/` and `evals/` directories are excluded from the deployment. Relative asset paths use Vite's `base: "./"`; hash routes support direct documentation links and reloads under a repository subdirectory. Inspect the actual deployment URL after the workflow succeeds.

## Verification and notices

Build first, then run from the repository root:

```sh
pnpm exec playwright install chromium
pnpm check:site
pnpm test:browser
```

The browser configuration serves the built site at `http://127.0.0.1:4173`. Tests cover documentation routes, keyboard/mobile navigation, theme/language persistence, blocked storage, source-backed traces, actual report exports, motion preferences, retained licenses and browser errors. CLI/parser checks and visual inspection remain separate.

Reviewed captures are in [screenshots/](screenshots/). `node scripts/capture-site-screenshots.mjs` captures the built site; with a preview running, `node site/scripts/capture-docs.mjs` captures documentation pages. `DBDEP_SITE_URL` can select another local preview address. Static captures use reduced motion.

React Bits adaptations retain pinned source hashes and MIT + Commons Clause notices. GSAP retains its Standard License. All retained notices are copied into the build and linked from the footer. Read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistribution. The explanatory flow was independently implemented after inspecting [network-engineering's flow](https://github.com/whetstone-dev/network-engineering/blob/main/web/src/components/Flow.tsx); no PostgreSQL engine code was imported from that project.
