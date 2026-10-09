# Next.js migration implementation plan

> Execute inline in the existing session. Keep all work on `feat/nextjs-static-site` and submit one PR.

**Goal:** Port the webpage to a validated Next.js static export for GitHub Pages while disabling automated dependency PRs.

**Architecture:** App Router renders home and bounded documentation routes. A shared client shell owns preferences and navigation focus. Reports remain curated static assets. Publication and preview tools operate only on `site/out`.

**Tech stack:** Next.js 16.4.0, React 19.3, TypeScript, pnpm 12.10.1, existing GSAP/Lenis/Motion components and Playwright 1.63.

## Implementation checkpoints

- [x] Add browser regressions for exported documentation with JavaScript disabled, direct reloads, old hash bookmarks and real unknown-route 404s. Run against the current Vite export and observe the missing behavior.
- [x] Replace Vite configuration and dependencies with `next.config.mjs`, App Router entries, an explicit base-path utility, and SSR-safe preferences/motion. Split `site/src/App.tsx` into the shared shell and `Home.tsx`; reuse existing documentation and visual components.
- [x] Implement `site/scripts/preview.mjs` for actual static files and safe base-path routing. Update Playwright and screenshot entry points to use it.
- [x] Adapt `scripts/check-site-publication.mjs`, `scripts/package-site.mjs`, and publication tests to Next.js output. Retain byte equality and reject unexpected files and symlinks. Test the real build inventory before allowing runtime file patterns.
- [x] Remove Dependabot configuration, add Next.js output ignores and license notices, and update Pages/CI and contributor instructions. Keep one branch and one PR.
- [x] Run frozen installation and dependency audit, Node tests, deterministic examples, root production build/publication validation, and the full browser suite. Rebuild with the repository base path and verify the same interactions on a static prefix preview.
- [x] Inspect desktop/mobile/light/dark/Spanish captures, package the changed website in an isolated temporary artifact directory, verify notices and copied source bytes, and record results and remaining limits.
- [ ] Commit focused changes using the Gitmoji convention, push this branch and create one PR with the final scope and actual validation results. Leave main approval protections active.

Useful verification commands from the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm audit --audit-level=low
pnpm test
pnpm verify:examples
pnpm build
pnpm check:site
pnpm test:browser
```

The repository-prefix build passes `NEXT_PUBLIC_BASE_PATH=/Database-Dependency-Migration-Visualizer` to the build. Browser checks then use `DBDEP_SITE_URL=http://127.0.0.1:4173/Database-Dependency-Migration-Visualizer`. The Pages workflow uses the configure-pages base path rather than requiring a hosted Node server.
