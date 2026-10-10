# Slim skill installation

The user approved a dedicated `skills/database-dependency-migration/` directory on 2026-10-09.

Move the canonical skill entry point there so the existing Skills CLI command discovers only the distributable directory. Keep toolkit source files at the repository root and generate committed copies with an explicit allowlist. Use that same payload for `.skill` archives. Preserve the optional toolkit, its production lockfile, examples, source-review references and licenses.

Execute this plan inline in an isolated worktree. Leave the reviewed changes in the original checkout for the user.

- [x] Add a regression in `tests/node/skill-distribution.test.mjs` that requires a discoverable, self-contained nested skill without website, evaluations, tests or developer scripts. Run it before implementation and confirm the missing directory fails.
- [x] Move `SKILL.md` into the dedicated directory and write its installation README. Add `scripts/skill-distribution.mjs` and `scripts/sync-skill.mjs` to collect, generate and check the resource allowlist. Reject stale or unexpected members. Add `sync:skill` and `check:skill` commands, and make `scripts/package-skill.mjs` archive the same checked payload.
- [x] Update root README, contributing/release instructions, changelog, bilingual installation documentation, npm file list and website copy/validation paths. Update website fixture tests for the nested canonical entry point. Preserve historical receipts and frozen evaluations.
- [x] Update `scripts/smoke-skills-install.mjs` to compare the installed files against the dedicated directory rather than the entire repository, assert exclusion of developer files and report installed bytes. Add the synchronization check and real installer smoke to CI.
- [x] Run `pnpm check:skill`, all Node tests, `pnpm verify:examples`, the pinned Skills CLI installation smoke, website build/publication checks and npm/skill artifact installation smoke. Confirm `doctor`, generated HTML and all three strict model validations work outside the checkout.
- [x] Review the diff and copy the verified change into the original clean checkout. Check the original directory and report the measured reduction and checks actually performed.
