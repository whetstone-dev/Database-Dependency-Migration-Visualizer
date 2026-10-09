# Contributing

Keep dependency claims grounded in source evidence, preserve explicit unknowns, and keep analysis separate from migration execution. Small changes should include the relevant verification and an explanation of their effect.

## Submit a contribution

Anyone can fork this public repository, create a branch in their fork, and open a pull request targeting `main`. Repository write access is not needed. Describe the problem, resulting behavior and checks performed, and follow the commit format below.

The [code owners](.github/CODEOWNERS) are `@JoseDFlorez` and `@Juanfrxz`. A pull request requires an approval from at least one of them, passing required CI checks and resolved review conversations before merging. New changes invalidate earlier approvals. Maintainers also use pull requests; the author cannot approve their own request and the latest push needs another maintainer's approval.

Public contributors can comment and submit reviews. Their approval does not replace the required code-owner approval. Keep vulnerabilities and private database artifacts out of public pull requests; follow [SECURITY.md](SECURITY.md).

## Before opening a pull request

Use Node.js 22.18+ and pnpm 12.10.1 for the full workspace. The pinned Skills CLI install smoke needs Node.js 22.20+; current local checks use Node.js 24.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec playwright install chromium
pnpm test
pnpm verify:examples
pnpm build
pnpm check:site
pnpm test:browser
pnpm audit --audit-level=low
```

Build before browser tests; Playwright serves `site/dist` through the local preview. The Node tests run offline and skip live cases without a disposable fixture DSN. Run `pnpm test:live` when PostgreSQL tools are available. This creates, stops and removes its own loopback cluster; supply `--pg-bin <directory>` through `pnpm test:live --pg-bin <directory>` if needed. CI has separate disposable PostgreSQL services.

Use `pnpm exec prettier --check` with the files you changed. Describe checks actually performed, skipped prerequisites, and unresolved limits. Do not treat local receipts or configured workflows as proof that remote CI passed.

## Architecture and evidence

| Change                             | Update together                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Model fields or evidence contract  | `src/dbdep/model.mjs`, `schemas/dbdep.schema.json`, applicable findings/report schemas, `references/model.md`, validation fixtures |
| SQL parsing or identity resolution | `src/dbdep/sql.mjs`, parser/confidence guidance, positive and ambiguous/unsupported SQL fixtures                                   |
| Graph direction, impact or diff    | `src/dbdep/graph.mjs`, dependency semantics, path/cycle/diff tests                                                                 |
| Catalog capture or normalization   | `src/dbdep/catalog.mjs`, fixed-query contract, catalog guidance, isolated live tests and sanitized provenance                      |
| Hazard rules or phase guidance     | `src/dbdep/rules.mjs`, `planning.mjs`, migration guidance, positive/negative and UNKNOWN regressions                               |
| Reports or viewer                  | `src/dbdep/reports.mjs`, `assets/viewer/`, schemas as needed, browser checks and regenerated examples                              |
| CLI or installation                | `src/dbdep/cli.mjs`, `SKILL.md`, README, site command docs, CLI and real-install smoke checks                                      |
| Website                            | `site/src/`, bilingual copy/accessibility, site tests and retained license notices                                                 |

Add an observable failing regression before changing graph semantics, hazards or safety boundaries. Preserve stable IDs, deterministic ordering, UTF-8 source locations, hashes and evidence states. Unsupported or ambiguous resolution must remain UNKNOWN. The current canonical contract is 1.0.0; explain incompatible changes explicitly.

Safety changes need hostile-input coverage where relevant: SQL literals/comments and DSNs, catalog rows, identifiers and paths, serialized HTML/Markdown/Mermaid/DOT, viewer DOM injection, and offline network isolation. Live queries must remain fixed, allowlisted and read-only. Never execute supplied SQL or user migrations against a shared database. Fixture setup is development tooling for explicitly isolated databases.

Read the [security boundary](references/security.md), [catalog contract](references/postgres-catalog.md), [security policy](SECURITY.md), and [audit](docs/security-audit.md). Keep `.env`, `.pgpass`, local connection files, `out/`, `tmp/`, caches and environments out of Git. Inspect the staged diff and `git check-ignore -v <path>` before sharing fixtures. Use sanitized, intentionally public examples with provenance; never force-add credentials.

## Regenerate fixtures

After changing the engine or report viewer:

```sh
pnpm demo
pnpm verify:examples
node scripts/capture-screenshots.mjs
pnpm build
pnpm check:site
pnpm test:browser
```

Inspect representative desktop/mobile reports, keyboard behavior and both UI languages. Regenerate model, HTML, Markdown and graph exports from the engine; do not patch generated artifacts by hand. `verify:examples` compares the eighteen curated outputs byte-for-byte.

Catalog recapture is separate and deliberately changes capture timestamps/provenance:

```sh
node scripts/fixture-cluster.mjs --update-fixtures
```

Review its sanitized capture and provenance, then regenerate demos. Do not rewrite frozen evaluation responses, grades or source manifests to represent newer behavior. Start a new evaluation iteration and document its actual execution in [evaluation guidance](docs/evaluation.md).

## Check distribution

Build and package the current local version, then test both npm/unpacked skill artifacts and the real Skills CLI installer:

```sh
pnpm build
pnpm check:site
pnpm pack --pack-destination dist/v0.3.2
pnpm package:skill
pnpm package:site
pnpm smoke:artifacts
```

For the real installer smoke, prepare a local, pinned CLI and supply its entry point. This installation is only development tooling:

```sh
npm install --prefix out/skills-cli --ignore-scripts --no-audit --no-fund skills@1.7.2
pnpm exec node scripts/smoke-skills-install.mjs --cli out/skills-cli/node_modules/skills/bin/cli.mjs
```

`DBDEP_SKILLS_CLI` can supply the same cached entry point. The smoke installs a current worktree snapshot into a project outside the checkout, disables telemetry, checks archive/version/member hashes and sensitive filenames, installs frozen production dependencies, runs `doctor`, creates all three demos and strictly validates them. Its checked temporary directory is removed and its receipt is written under `dist/v<version>/`. This catches the installer excluding files named `metadata.json`; the active high-traffic input is `workload-profile.json`.

The Skills CLI copies the root skill directory, including site/evaluation/development files. npm and `.skill` packaging use their own allowlists. Test their actual contents and preserve licenses. Rebuild the website after README or SKILL changes; site packaging rejects stale documentation copies. Development checks require the full workspace, while an installed skill uses `pnpm install --prod --frozen-lockfile --ignore-workspace --ignore-scripts`.

## Style and commits

Use English for code, CLI output and analytical documentation. Maintain both English and Spanish website/report controls, accessible labels, keyboard interaction and reduced-motion behavior. Do not translate source identifiers or silently alter evidence. Keep user errors clear without exposing stack traces or connection details.

This repository uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with [Gitmoji](https://gitmoji.dev/) and these local rules: a leading Gitmoji, lowercase type, no scope, a lowercase imperative subject, and a required explanatory body after a blank line.

```text
<gitmoji> <type>: <lowercase imperative subject>

Explain the change, its purpose, and the verification performed.
```

Examples are `🐛 fix: preserve metadata in skills installs` and `📝 docs: explain manual pages deployment`. Split changes by purpose. Use `!` or a `BREAKING CHANGE:` footer for incompatible contracts.

## Releases and deployment

Follow [SemVer](https://semver.org/) and [docs/releases.md](docs/releases.md). Update root/site package versions, `SKILL.md` metadata, the lockfile and changelog together. The pending local release is v0.3.2; historical v0.3.0/v0.3.1 receipts and frozen evaluations remain historical.

Complete relevant checks and artifact/hash comparisons on final `main` before creating an annotated `v<version>` tag. Never move or replace an existing release tag. Local commit/tag creation, remote push, GitHub release assets, npm publication and Pages deployment are distinct actions; perform publication only when authorized.

The [Pages workflow](.github/workflows/pages.yml) is manual-only. Review the curated public contents before running it, and follow [Pages setup](docs/github-pages.md). CI action references are pinned to commit SHAs; retain least-privilege permissions when changing workflows.
