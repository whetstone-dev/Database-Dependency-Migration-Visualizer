# GitHub Pages

The website is a static React/Vite application. GitHub Pages publishes the built `site/dist` directory through the repository's [manual Pages workflow](../.github/workflows/pages.yml). Local builds and release archives do not deploy it. No public deployment is claimed for the pending v0.3.2 work.

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

Open the local Vite URL, the documentation at `/#/docs`, and all three standalone example reports. Check asset loading, English/Spanish controls, keyboard navigation and report JSON/SVG exports. Browser verification needs Chromium:

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

`site/scripts/prepare-demos.mjs` copies the curated reports, model JSON, review JSON and Markdown into the site before building. It also copies README/SKILL documentation and complete retained website licenses. Changing root documentation therefore requires another build.

## Repository-path routing

`site/vite.config.ts` uses `base: "./"`, so generated asset links resolve relative to the repository's Pages directory. Application documentation uses hash routes, including `/#/docs`, which support direct links and reloads without server-side route rewrites. Keep both behaviors when changing routing or asset URLs. [Vite's deployment guide](https://vite.dev/guide/static-deploy.html#github-pages) explains the relationship between the asset base and hosting path.

For a project site, a documentation URL has this shape:

```text
https://<owner>.github.io/<repository>/#/docs
```

Use the deployment environment's actual URL; a configured workflow or local preview does not establish that URL is live.

## Public contents and subsequent deployments

Only `site/dist` is uploaded. The curated examples, their architecture identifiers, generated reports, copied README/SKILL and license notices become publicly accessible. Review these deliberate publication inputs before deployment. Local `out/`, `tmp/`, raw evaluations and the repository's `evals/` directory are not deployment artifacts. The site has no upload endpoint, credentials or live database connection.

For an update, review and publish the intended source, rerun the checks, then manually run the workflow for that reviewed `main` revision. Keep release tags immutable. See the [security policy](../SECURITY.md), [audit](security-audit.md), and [release procedure](releases.md).
