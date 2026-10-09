# Troubleshooting

Normal skill use needs no runtime. If Node.js, pnpm or toolkit packages are missing, use [source analysis](source-analysis.md) and deliver a source-cited review. Do not block that review on `doctor`, package installation or a build.

For the optional toolkit, run `node scripts/dbdep.mjs doctor --json` or installed `dbdep doctor --json`. Node.js 22.18+ is required only for this path. See [toolkit setup](toolkit.md) for the production-only npm installation and frozen pnpm alternative. Contributors use the full workspace setup in [CONTRIBUTING.md](../CONTRIBUTING.md); browser binaries are for development tests.

Exit 2 indicates invalid JSON/schema, unsupported capture version, missing dependency, malformed selector, ambiguous object, SQL syntax error or I/O failure. Fix the original source/model, then regenerate. Use stable node IDs for functions with overloads or constraints sharing names. SQL literals are excluded from parse errors; inspect the input locally for detail.

Exit 3 indicates a requested risk policy failed, with artifacts still delivered. UNKNOWN gaps are report content, not model errors. Invalid models never render. PostgreSQL 14-18 catalogs use an exact capture query contract; future versions require an adapter update. The parser uses PostgreSQL 18 grammar, so older-server syntax needs release verification.

Do not resolve uncertainty by guessing a search_path, routine body, implicit cast, row count or consumer transition. Request final schema declarations, a sanitized catalog capture, qualified identifiers or owner-provided operational evidence instead.
