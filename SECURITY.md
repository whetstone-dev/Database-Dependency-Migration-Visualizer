# Security

This version analyzes PostgreSQL metadata and SQL locally. It cannot execute migrations. Live discovery is explicitly requested, uses an environment variable and fixed read-only catalog queries, and does not extract business rows or stored routine bodies. Read `references/security.md` for details.

Treat schema/source names and architecture reports as sensitive. Keep outputs local unless explicitly asked to share. Do not put connection strings into models or issue reports. Catalog errors intentionally hide driver details. Default SQL literals are hashed; provenance is not a general secret-scanning guarantee.

Report vulnerabilities privately through the repository owner's available GitHub security reporting/contact mechanism. Do not post credentials, production DDL or data in a public issue. No hosted support endpoint or response SLA is claimed.
