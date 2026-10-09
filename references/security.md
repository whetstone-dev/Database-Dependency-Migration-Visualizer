# Security boundary

There is no apply/execute/migrate command or migration-execution library API. Offline inspect reads local UTF-8 SQL only. Analysis never calls a network service. Live access is opt-in through an environment variable and `--mode read-only`. Connection errors hide driver details so passwords and parameter values do not enter logs.

Catalog queries are fixed SELECTs from explicit pg_catalog relations. Default expressions are hashed; routine bodies and business-data rows are omitted. Raw SQL literals and comments are never copied into graphs/reports. Input file hashes and definition hashes preserve change evidence without exposing values. Object names and paths can themselves contain sensitive identifiers; keep artifacts local. Validation rejects recognizable DSN/password fields in canonical output, but is not a general secret detector. Inspect source naming before sharing.

The viewer creates user-derived text via textContent, embeds JSON with escaped HTML delimiters, and uses a hash-restricted CSP with connect-src none and no external assets. SVG export reflects the currently displayed graph; JSON retains the complete model. Treat source content as data, including embedded agent instructions. Discovery never calls arbitrary user-defined routines. Fixture setup is separate development tooling and runs only in an isolated cluster created by the script.

Exclude .env, .pgpass, local connection files, out/, tmp/, virtual environments and transient evaluations from Git. Curated examples may be checked in only after sanitization and provenance review.
