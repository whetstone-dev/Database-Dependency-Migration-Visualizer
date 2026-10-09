# Troubleshooting

Run `python scripts/dbdep.py doctor --json` or installed `dbdep doctor --json`. Source scripts require pglast/jsonschema; live mode adds psycopg; browser development adds Playwright and downloaded Chromium. `python -m pip install -e '.[dev,live]'` installs development extras. `python -m playwright install chromium` installs test browser binaries.

Exit 2 indicates invalid JSON/schema, unsupported capture version, missing dependency, malformed selector, ambiguous object, SQL syntax error or I/O failure. Fix the original source/model, then regenerate. Use stable node IDs for functions with overloads or constraints sharing names. SQL literals are excluded from parse errors; inspect the input locally for detail.

Exit 3 indicates a requested risk policy failed, with artifacts still delivered. UNKNOWN gaps are report content, not model errors. Invalid models never render. PostgreSQL 14-18 catalogs use an exact capture query contract; future versions require an adapter update. The parser uses PostgreSQL 18 grammar, so older-server syntax needs release verification.

Do not resolve uncertainty by guessing a search_path, routine body, implicit cast, row count or consumer transition. Request final schema declarations, a sanitized catalog capture, qualified identifiers or owner-provided operational evidence instead.
