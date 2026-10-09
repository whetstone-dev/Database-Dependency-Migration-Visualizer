# GitHub Pages

The website uses Next.js App Router with a static export. GitHub Pages publishes the built `site/out` directory through the repository's [manual Pages workflow](../.github/workflows/pages.yml). Local builds and release archives do not deploy it. No public deployment is claimed here.

## Repository setup

After the reviewed source and workflow have been pushed:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions** and select the workflow defined in `pages.yml`.
4. After reviewing the intended `main` commit and public contents, choose **Run workflow** on `main`.
5. Inspect the build/deploy results and use the URL recorded by the `github-pages` environment after a successful deployment.

The workflow has only `workflow_dispatch`; pushes and pull requests do not deploy the site automatically. Build jobs read repository contents. Deployment uses `pages: write` and `id-token: write`, and the `github-pages` environment. Actions are pinned to commit SHAs. GitHub documents these requirements in its [custom Pages workflows guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Build and review locally

From the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm verify:examples
pnpm build
pnpm check:site
pnpm preview
```

Open the local preview URL, the documentation at `/docs/`, and all three standalone example reports. Check asset loading, English/Spanish controls, keyboard navigation and report JSON/SVG exports. Browser verification needs Chromium:

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

`site/scripts/prepare-demos.mjs` copies the curated reports, model JSON, review JSON and Markdown into the site before building. It also copies README/SKILL documentation and complete retained website licenses. Changing root documentation therefore requires another build.

## Repository-path routing

`site/next.config.mjs` uses `output: "export"` and `trailingSlash: true`. Each documentation route has an `index.html`, so direct links and reloads need no server rewrite. The workflow runs `configure-pages` before building and passes its `base_path` to `NEXT_PUBLIC_BASE_PATH`. Next.js prefixes internal links and runtime bundles; the site's asset utility prefixes report and license URLs. The base path is fixed at build time. See Next.js's [static export guide](https://nextjs.org/docs/app/guides/static-exports) and [basePath reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath).

For a project site, a documentation URL has this shape:

```text
https://<owner>.github.io/<repository>/docs/
```

Existing `/#/docs` bookmarks redirect to the new routes after JavaScript loads. English content is present in the exported HTML; translation, saved preferences and interactive controls require JavaScript. A custom domain or account site can use an empty base path.

To reproduce the project path on PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH = '/Database-Dependency-Migration-Visualizer'
pnpm build
Remove-Item Env:NEXT_PUBLIC_BASE_PATH
pnpm check:site
$env:DBDEP_SITE_URL = 'http://127.0.0.1:4173/Database-Dependency-Migration-Visualizer'
pnpm test:browser
Remove-Item Env:DBDEP_SITE_URL
pnpm preview
```

On macOS/Linux, use `NEXT_PUBLIC_BASE_PATH=/Database-Dependency-Migration-Visualizer pnpm build` and `DBDEP_SITE_URL=http://127.0.0.1:4173/Database-Dependency-Migration-Visualizer pnpm test:browser`.

The preview reads the built base path, serves directory indexes and returns a real HTTP 404 for missing files. It binds only to loopback and rejects paths or symlinks outside the export. Use the deployment environment's actual URL after publishing; a local preview does not establish that URL is live. Check direct topic reloads, assets, report exports and the deployed 404 page.

## Public contents and subsequent deployments

Only `site/out` is uploaded. The curated examples, their architecture identifiers, generated reports, copied README/SKILL and license notices become publicly accessible. The publication validator compares exported pages, route payloads and runtime bundles with their compiled sources and checks public inputs byte-for-byte. It rejects unexpected files, source maps and symlinks. Review these deliberate publication inputs before deployment. Private `site/.next`, root `out/`, `tmp/`, raw evaluations and the repository's `evals/` directory are not deployment artifacts. The site has no upload endpoint, credentials or live database connection.

For an update, review and publish the intended source, rerun the checks, then manually run the workflow for that reviewed `main` revision. Keep release tags immutable. See the [security policy](../SECURITY.md), [audit](security-audit.md), and [release procedure](releases.md).
