# Release procedure

Release only validated `main`. Version 0.1.0 is the first pre-1.0 contract; it does not claim production completeness. Version 0.2.0 adds webpage functionality. Update pyproject.toml, src/dbdep/__init__.py, SKILL.md metadata, site/package.json, site/package-lock.json and CHANGELOG.md together for later releases. The webpage footer and static archive name read their version from package metadata.

Run formatting/static checks, all offline/browser tests, isolated live tests where available, fixture regeneration checks and wheel/.skill install smoke checks. Record actual results and limitations. Inspect staged files for secrets and ignored output leakage.

Commits use `<gitmoji> <type>: <lowercase imperative subject>` with a separate explanatory body and no scopes. Create an annotated SemVer tag `v<version>` at the tested final main commit with release notes. Never move an existing release tag. The user supplied the Conventional Commits/Gitmoji guide on 2026-10-09.

Local commit/tag creation is distinct from remote publishing. Push main and tag, create GitHub release assets or publish to PyPI only when explicitly requested. A local validation receipt is not evidence that remote CI ran. Do not add passing badges before observing remote results.

Build local artifacts with `python -m build`, `python scripts/package_skill.py --creator-dir <installed-skill-creator>`, and `python scripts/package_site.py` after `npm ci && npm run build` in `site/`. The skill packager stages an allowlist and invokes the installed creator; it excludes environments, evaluation outputs and the separate webpage. Both skill/site archives normalize ZIP ordering/timestamps. The site archive retains dependency licenses. Check `python scripts/smoke_artifacts.py --wheel <wheel> --skill <skill>` outside the source tree before tagging, then record artifact SHA-256 checksums.
