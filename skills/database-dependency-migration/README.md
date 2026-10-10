# Database dependency migration

Review PostgreSQL migrations and database consumers in SQL, EF Core/C#, Prisma and TypeORM sources. Read [SKILL.md](SKILL.md) for the agent workflow. Source review requires no runtime setup and never executes migrations.

## Installation

From the project where you want to use the skill:

```sh
npx skills@1.7.2 add whetstone-dev/Database-Dependency-Migration-Visualizer --skill database-dependency-migration --agent codex --copy
```

This installs into `.agents/skills/database-dependency-migration` in the current project. Replace `codex` with `claude-code` for that agent. Add `--global` for a personal installation. The Skills CLI requires Node.js 22.20+.

For installation without Node.js, copy this directory into your agent's skill directory or unpack the `.skill` release archive. Keep its references, templates and agent metadata together. Reload your agent and ask it to use `database-dependency-migration` to review your actual schema, migration and application files.

The package contains source-review guidance, the optional toolkit, examples and licenses. Website, evaluations, tests and development scripts stay in the full repository.

## Optional toolkit

Normal source review needs no dependency installation. For validated JSON and interactive HTML reports, install the optional runtime inside this directory with Node.js 22.18+:

```sh
npm install --omit=dev --ignore-scripts --package-lock=false
node scripts/dbdep.mjs doctor --json
```

For frozen transitive dependencies, use pnpm 12.10.1 instead:

```sh
pnpm install --prod --frozen-lockfile --ignore-workspace --ignore-scripts
```

Run the toolkit from your workspace with `node "<skill-directory>/scripts/dbdep.mjs" ...`. Keep inputs and generated reports outside this installed directory. Read [toolkit usage](references/toolkit.md), [source analysis](references/source-analysis.md), [the report outline](templates/review-report.md), [security](SECURITY.md) and [license notices](THIRD_PARTY_NOTICES.md).

The [full repository](https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer) contains the website, contributor tools and evaluation records.
