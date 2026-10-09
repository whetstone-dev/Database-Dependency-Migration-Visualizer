# Standalone skill validation

Local validation on 2026-10-09 covered the instruction-first skill, distribution and updated English/Spanish website. The dependency engine and canonical model contract did not change. This record does not establish remote CI, Pages deployment or an independent accuracy benchmark.

## Behavioral checks

An independent agent used the original skill to review the ecommerce contract migration with runtime installation and database access prohibited. It could inventory source references but reported that the required toolkit prevented delivery of a complete review. This established the setup failure before the instructions changed.

A fresh independent agent then used the revised skill under the same constraints. It delivered a source-cited review covering customer/order queries, incoming foreign keys, the summary view, the order index, conversion/destructive risks, deployment order and unresolved operational evidence. It labeled direct inspection SOURCE_READ and did not claim parser or catalog validation.

The same forward evaluation reviewed a supplied EF Core add/rename/index sequence with explicit entity mappings, a property consumer, a raw SQL literal using the old name, and an unavailable custom helper. It resolved the new index target through the preceding operations, cited mapping/use evidence, qualified the raw SQL concern by its unknown execution, and marked the helper's final effects UNKNOWN. No software installation, toolkit execution or database connection was performed by either evaluating agent.

These two scenarios test usability and evidence discipline. They do not satisfy the planned accuracy study of at least three real projects and 20 meaningful changes.

## Local verification

| Check | Result |
| --- | --- |
| Creator frontmatter validator using the existing authoring virtual environment | Valid skill |
| Node regression suite | 145 passed, 2 live cases skipped, 147 total |
| Full browser suite on root and repository-prefix exports | 73 passed on each, including installation clipboard behavior, exported docs without JavaScript, language/theme persistence and mobile/enlarged-text layout |
| Example regeneration comparison | All 18 artifacts reproduced |
| Production website build | Static export and TypeScript checks passed |
| Publication validation | Build/source copies matched; allowlisted content passed |
| Dependency audit | No known vulnerabilities reported |
| Skill package regression | No required runtime declared; source-review references, roadmap and optional toolkit retained; no node_modules bundled |
| Fresh npm package and unpacked skill outside the checkout | Production npm installation, doctor and all three strictly validated demos passed for both artifacts |
| Formatting and whitespace | Changed JavaScript/TypeScript/JSON files passed Prettier; git diff whitespace check passed |
| Website visual inspection | Desktop English/light and mobile Spanish/dark captures inspected; capture script found no horizontal page overflow |

The new browser expectations failed against the old export before rebuilding, and the new package regression failed on its previous mandatory Node runtime declaration. Both passed after the changes. The plain system Python lacked PyYAML; the existing authoring environment ran the validator successfully. That environment is validation tooling, not an installed-skill requirement.

Live PostgreSQL cases were not run locally for this revision. The unchanged CI workflow retains its PostgreSQL matrix. No release tag, package publication or Pages deployment is part of this update.
