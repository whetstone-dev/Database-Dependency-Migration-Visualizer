# Contributing

Install Node.js 22.18+, pnpm 12.10.1, `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium`. Run `pnpm test`, `pnpm build`, `pnpm test:browser` and `pnpm verify:examples`. Add failing observable tests before changing graph semantics, hazards or safety boundaries. Preserve source locations, unknowns and deterministic output. Do not test user migrations on any shared database.

Run the Node tests, example verification and packaging checks before committing. Regenerate curated examples with `pnpm demo`, then capture and inspect screenshots with `node scripts/capture-screenshots.mjs`. Do not edit generated model/HTML/Markdown by hand. CI browser/catalog matrices are defined in `.github/workflows/ci.yml`.

Use Conventional Commits with leading Gitmoji, no scope, imperative lowercase subject and a required body explaining change, purpose and validation. Examples: `✨ feat: add catalog dependency normalization` or `🐛 fix: preserve unknown backfill risk`. Split commits by purpose. Use `!`/BREAKING CHANGE for incompatible contracts. See `docs/releases.md` for annotated SemVer tags and publication.

Keep .env/.pgpass/local connection files, out/, tmp/, caches and virtual environments out of Git. Only sanitized intentionally public fixtures may be force-added after provenance inspection; never force-add credentials. Check representative ignore behavior with `git check-ignore -v` and inspect the staged diff.
