# Validation evidence

Current Node.js v0.3.0 validation is recorded separately in [node-validation.md](node-validation.md). The Python commands below describe historical tagged releases.

The table below preserves the original v0.1.0 validation and creator evaluation. The v0.2.0 webpage revision has a separate [validation receipt](webpage-validation.json) and [design/review record](webpage-redesign.md). Historical evaluation hashes and raw outputs have not been rewritten.

Observed locally on 2026-10-09, Windows, Python 3.14.4, Node 24.15.0 and PostgreSQL 18.3. These results describe the local implementation, not remote CI or production behavior.

| Check | Observed result |
|---|---|
| `python -m pytest -q` | 90 passed in 48.93 seconds, 2 live tests skipped without a DSN |
| `python scripts/fixture_cluster.py --pg-bin <PostgreSQL18-bin>` | 2 live tests passed; script-created cluster stopped and removed |
| Ruff check and format check | Passed |
| `python scripts/verify_examples.py` | All three generated JSON/HTML/Markdown/Mermaid/DOT bundles reproduce byte-for-byte |
| `python scripts/benchmark.py` | Complete synthetic 100, 1,000 and 5,000-node models; actual CPU results in [performance.json](performance.json) |
| `npm run build` in `site/` | TypeScript and production Vite build passed; pinned lockfile, bundled assets and retained licenses; all 8 webpage browser tests passed |
| System and installed creator validators | Both report “Skill is valid!” |
| `python -m build` | Wheel and source distribution built |
| Installed creator `.skill` packager | Validated clean staged toolkit; deterministic normalized ZIP metadata |
| `python scripts/smoke_artifacts.py --wheel <wheel> --skill <skill>` | Fresh environment outside the checkout: doctor, three valid demo models, bundled viewer/schema resources and unpacked skill entrypoint passed |
| Creator paired evaluation | 25/25 with skill, 24/25 without; actual aggregation and static review viewer passed |
| Creator review HTML | Opened locally in Chromium; Benchmark tab displayed without script errors |

The ordinary suite includes AST/reference correctness, DDM001–DDM015 positive/negative cases, unknown gates, source hashing, composite PK nullability, identifier collisions, unnamed CHECK/FK identity, cycle-safe reverse paths, OID drift, report schemas, dangling references, secret-safe errors, escaped HTML, offline network isolation and browser interactions. Webpage tests use a temporary localhost server; report-viewer tests open standalone files. Browser checks cover Chromium, desktop/mobile viewports, keyboard navigation, reduced motion, exports and a capped 1,000-node graph. Physical devices and other browsers were not tested.

All seven shipped schema/diff SQL files execute in the script's own isolated databases: ecommerce, analytics, dynamic SQL, multiple schemas, tricky identifiers and both diff states. The script executes fixture declarations, never migration proposals. Live tests check fixed read-only capture, absence of business-table SELECT grants, transaction read-only behavior, and catalog dependency normalization. [capture-provenance.json](../examples/analytics/capture-provenance.json) records the genuine sanitized analytics capture's version, timestamp and hashes.

The CI matrix is configured for PostgreSQL 14.20, 15.15, 16.11, 17.7 and 18.1. It has not run remotely. Local execution on 18.3 does not establish full 14–18 compatibility. PostgreSQL 18 parser acceptance also does not prove SQL availability on older servers.

Independent review found missing DML target references, low-risk results for unsupported migrations, ambiguous custom-type edges, collapsed unnamed CHECK/FK identities, and a same-line evidence collision. Regression tests now cover these cases, including repeated identical unnamed FKs. Evaluation also found unassessed backfill risk and incorrect composite-PK nullability; both were fixed while preserving initial evaluated outputs. Website spec and code-quality reviews passed after fixing keyboard anchor animation, focused button displacement and missing build notices. New tests verify immediate keyboard navigation, preserved pointer scrolling, focused-button reset and byte-exact license delivery. Validator diagnostics also reject invalid secret-bearing references without echoing their values.

The creator trigger runner failed all ten attempts with Windows `WinError 10038`. Trigger accuracy and description optimization are unavailable. Paired evaluation has one sample per case, no returned timing/token telemetry, and no pre-run toolkit hash snapshot. Its only observed difference is Markdown graph-ID coverage. See [evaluation.md](evaluation.md), [creator review](../evals/review.html) and the exact receipts; no general improvement claim follows.

The toolkit remains partial for routine bodies, dynamic/ORM SQL, nested column scopes, DML transformation semantics, target-schema replay, exact CASCADE closure and operational timing. Graph/path previews are explicitly capped while canonical model and CLI paths remain complete. PNG export is unavailable. A successful report is not deployment approval.

Release artifacts are created locally under `dist/`; environment/build/evaluation scratch directories are ignored. The annotated `v0.1.0` tag identifies validated local `main`. No remote push, GitHub release, PyPI publication or website deployment is implied. The local webpage preview is separate from hosting.

[validation-receipt.json](validation-receipt.json) records the observed checks and SHA-256 hashes of the final toolkit, schemas, viewer, webpage and tests. These are post-fix source hashes, separate from the unavailable pre-evaluation source snapshot. Wheel and source distribution, Agent Skill package and static webpage ZIP are accompanied by local package receipts/checksums. Package install checks run outside the checkout in a fresh environment.
