# Dedicated skill distribution validation

Validated locally on 2026-10-09 using Windows, Node.js 24.15.0, pnpm 12.10.1 and Skills CLI 1.7.2. The source checkout is based on `bee4ca28b803a933e9e8c28ee69bcb8ca7566d6d`; these results cover the dedicated-directory change rather than a published release.

## Installation size

The previous project installation in the network-engineering workspace contains 398 files and 14,988,975 bytes. The real Skills CLI smoke installs 82 files and 2,043,247 bytes from `skills/database-dependency-migration/`, an 86.4% reduction in uncompressed file bytes. Runtime dependencies are excluded from both measurements.

The installed file names and hashes match the dedicated directory exactly. Website, evaluations, tests and development scripts are absent. Source-review instructions, references, templates, agent metadata, optional toolkit resources, examples and licenses remain included. All relative Markdown links resolve within the distribution; developer-only documentation links point to the full repository.

## Checks performed

- `pnpm check:skill` verifies the source allowlist and committed distribution. Regression tests also confirm stale source copies and unexpected files fail, synchronization preserves unexpected files for review, and directory links cannot bypass checks.
- `pnpm test` reports 150 passing tests and two skipped live-catalog tests, with no failures. No live database DSN was configured for this packaging change.
- `pnpm verify:examples` confirms all eighteen curated artifacts remain reproducible.
- `pnpm smoke:skills --cli <cached-skills-1.7.2-entrypoint>` installs a current worktree snapshot into an external temporary project, verifies every member hash, installs frozen production dependencies, runs `doctor`, generates three HTML demos and strictly validates all three models.
- `pnpm build` exports all website routes. `pnpm package:site` verifies the canonical README and relocated skill-entry copies, curated public files and retained licenses before archiving.
- Targeted Playwright installation clipboard checks pass for both the home page and documentation page. Clipboard assertions normalize Windows line endings.
- `pnpm pack`, `pnpm package:skill` and `pnpm smoke:artifacts` verify fresh npm-toolkit and unpacked-skill installation outside the checkout. Both toolkits pass `doctor` and generate three strictly validated demo models. The npm tarball contains the standalone toolkit without a partial skill entry point; the complete `.skill` archive matches the Skills CLI payload byte-for-byte.
- Read-only code review and `git diff --check` found no remaining important issues.

## Maintenance

Author `SKILL.md` and the installation README in the dedicated directory. Other copies come from the repository's source files through `pnpm sync:skill`; include regenerated files with each relevant source change. CI checks synchronization before tests and runs the real installer smoke. Historical tags and evaluation records retain their original paths and evidence.

These are local results. No remote push, release publication, npm publication or Pages deployment is included.
