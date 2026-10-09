# Security policy

The latest locally validated release is v0.3.2. Support focuses on the latest release; older tags and evaluation records remain historical evidence. A local tag does not establish publication or a deployed website.

## Report a vulnerability

Use the repository's private vulnerability reporting option when available. Otherwise contact a maintainer privately before sharing an exploit that includes private database details. Public issues may describe a sanitized problem, affected version and reproduction using synthetic SQL. Do not include credentials, production captures or private schema names.

## Trust boundaries

The installed skill contains agent instructions and an optional Node.js toolkit. Ordinary source reviews require no dependency installation or executable toolkit code. Review the toolkit's source and dependencies before choosing to run it; install with `--ignore-scripts`, using the frozen production path when reproducibility is required. The Skills CLI copies the root skill directory, including development files and evaluations; the separate `.skill` archive has a narrower file allowlist.

The analyzer reads supplied SQL and catalog captures as data. It has no migration execution command or API. Live discovery requires an explicitly selected environment variable and read-only mode, uses fixed catalog queries, omits routine bodies and business rows, and hashes stored default-expression trees. Development fixture scripts execute shipped example SQL only in their own disposable cluster or explicitly configured CI fixture database.

Reports reject pre-existing symlink/junction output paths and replace ordinary files atomically. The CLI protects selected input files from output overwrites. These checks do not isolate a process from another user who can concurrently replace its directories. Run in a workspace you control and select a separate output directory.

SQL literals and comments are omitted from generated models. Recognizable DSN/password markers are rejected, but this is not exhaustive secret detection. Names, paths and metadata can still be sensitive. Reports and local catalog snapshots are private unless deliberately reviewed for sharing. The standalone explorer and creator evaluation viewers work offline; the public website contains curated examples only.

Input size and graph traversal are not globally resource-limited. Unsupported SQL resolution remains UNKNOWN. Read-only discovery and static findings do not establish a production migration's correctness, lock duration or downtime.

See the [security boundary](references/security.md), [catalog contract](references/postgres-catalog.md), [local audit](docs/security-audit.md), and [Pages publication setup](docs/github-pages.md).
