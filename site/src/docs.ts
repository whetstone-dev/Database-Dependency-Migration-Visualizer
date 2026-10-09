import type { Locale } from "./i18n";

export const topicOrder = [
  "introduction",
  "installation",
  "quickstart",
  "good-requests",
  "command-reference",
  "confidence",
  "safety-limits",
] as const;
export type TopicSlug = (typeof topicOrder)[number];
export type DocSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  code?: { label: string; value: string; copyLabel: string }[];
  table?: { headings: string[]; rows: string[][] };
  callout?: string;
};
type Topic = {
  title: string;
  description: string;
  sections: DocSection[];
  reference: string;
};
type DocsCopy = {
  title: string;
  eyebrow: string;
  body: string;
  browse: string;
  navigation: string;
  overview: string;
  groups: string[];
  topicsTitle: string;
  startTitle: string;
  startBody: string;
  startLink: string;
  previous: string;
  next: string;
  source: string;
  missingTitle: string;
  missingBody: string;
  back: string;
  topics: Record<TopicSlug, Topic>;
};

const install = "pnpm install --frozen-lockfile\npnpm dbdep doctor --json";
const inspect =
  "pnpm dbdep inspect --ddl examples/ecommerce/schema.sql --repo examples/ecommerce/app --out out/schema.dbdep.json";
const validate = "pnpm dbdep validate out/schema.dbdep.json --strict --json";
const render =
  "pnpm dbdep render out/schema.dbdep.json --object public.customers.id --out out/dependencies.html";
const review =
  "pnpm dbdep review --baseline out/schema.dbdep.json --migration examples/ecommerce/migrations/003_contract_legacy_id.sql --out out/review --json";

const en: DocsCopy = {
  title: "Documentation",
  eyebrow: "DATABASE DEPENDENCY MIGRATION",
  body: "Build a dependency model from your PostgreSQL sources, trace a proposed change, and review the evidence before you migrate.",
  browse: "Browse documentation",
  navigation: "Documentation navigation",
  overview: "Overview",
  groups: ["Get started", "Work with the skill", "Reference"],
  topicsTitle: "Explore the documentation",
  startTitle: "Start with a real schema",
  startBody:
    "The shipped ecommerce fixture is a complete offline first run. No database connection is required.",
  startLink: "Follow the quickstart",
  previous: "Previous",
  next: "Next",
  source: "Read the source reference",
  missingTitle: "Page not found",
  missingBody:
    "This documentation topic does not exist. Choose a page from the contents or return to the overview.",
  back: "Back to documentation",
  topics: {
    introduction: {
      title: "Introduction",
      description:
        "Understand the model, the dependency direction, and what the toolkit produces.",
      reference: "SKILL.md",
      sections: [
        {
          title: "What dbdep does",
          paragraphs: [
            "Database dependency migration is an Agent Skill and a Node.js toolkit for PostgreSQL schema analysis. Supply DDL, SQL repository files, or a catalog snapshot. The CLI builds a versioned .dbdep.json model with stable object identifiers, typed dependencies, source evidence, and explicit unknowns.",
            "Use that model to explain potential downstream impact, review SQL migration hazards, compare snapshots, or generate standalone reports. Every migration plan is material for human review. The toolkit never applies it.",
          ],
        },
        {
          title: "One model, several artifacts",
          bullets: [
            "JSON retains the full model, evidence, coverage gaps, and stable identifiers.",
            "The standalone HTML explorer supports search, filters, dependency paths, findings, and a phased review plan. Its interface supports English and Spanish. Source evidence and analytical text retain their original language.",
            "Markdown summarizes the model for review. Mermaid and DOT export deterministic diagrams. The HTML viewer exports SVG and JSON; PNG export is unavailable.",
          ],
        },
        {
          title: "Read an arrow",
          paragraphs: [
            "A source-to-target arrow means the source depends on or references the target. Impact analysis walks those edges in reverse to find potential consumers. Foreign keys, catalog dependencies, and parsed SQL references remain different edge kinds.",
          ],
          callout:
            "A dependency path explains why an object needs review. It does not prove an application will fail or predict PostgreSQL's exact CASCADE deletion closure.",
        },
      ],
    },
    installation: {
      title: "Installation",
      description:
        "Set up Node, pnpm, and the skill in your agent's workspace.",
      reference: "README.md",
      sections: [
        {
          title: "Requirements",
          paragraphs: [
            "Use Node.js 22.18.0 or newer and pnpm 12.10.1, the version pinned by this repository. Clone or download the repository, then open a terminal at its root. The frozen lockfile installs the toolkit and website dependencies together.",
          ],
          code: [
            {
              label: "FROM THE REPOSITORY ROOT",
              value: install,
              copyLabel: "Copy installation commands",
            },
          ],
        },
        {
          title: "Connect your coding agent",
          paragraphs: [
            "Copy or symlink the complete checkout into your agent's skill directory, then reload the agent. Keep the scripts, references, schemas, and installed dependencies available with SKILL.md. A copy of SKILL.md alone does not include the toolkit.",
          ],
          table: {
            headings: [
              "Agent",
              "User skill directory",
              "Project skill directory",
            ],
            rows: [
              [
                "Codex",
                "~/.agents/skills/database-dependency-migration",
                ".agents/skills/database-dependency-migration",
              ],
              [
                "Claude Code",
                "~/.claude/skills/database-dependency-migration",
                ".claude/skills/database-dependency-migration",
              ],
            ],
          },
        },
        {
          title: "Run the toolkit directly",
          paragraphs: [
            "The pnpm script runs the local CLI. You can also invoke its Node entry point. Run these examples from the repository root. An installed skill should resolve its own absolute directory and keep output in the user's workspace.",
          ],
          code: [
            {
              label: "DIRECT NODE ENTRY POINT",
              value:
                "node scripts/dbdep.mjs doctor --json\nnode scripts/dbdep.mjs inspect --ddl examples/ecommerce/schema.sql --out out/schema.dbdep.json",
              copyLabel: "Copy Node commands",
            },
          ],
        },
        {
          title: "Run this website locally",
          code: [
            {
              label: "LOCAL WEBSITE",
              value:
                "pnpm dev\n# Build and preview the static site\npnpm build\npnpm preview",
              copyLabel: "Copy website commands",
            },
          ],
          paragraphs: [
            "Open the localhost address printed by Vite. The website explains the toolkit and opens the shipped reports. It has no database connection or upload flow.",
          ],
        },
      ],
    },
    quickstart: {
      title: "Quickstart",
      description:
        "Inspect the shipped ecommerce schema and open an evidence-backed report.",
      reference: "examples/README.md",
      sections: [
        {
          title: "1. Inspect your sources",
          paragraphs: [
            "Run from the repository root after installation. The schema contains customer, order, and address dependencies. SQL files add static application references. This run stays offline.",
          ],
          code: [
            {
              label: "BUILD THE MODEL",
              value: inspect,
              copyLabel: "Copy inspect command",
            },
          ],
        },
        {
          title: "2. Validate the model",
          paragraphs: [
            "Strict validation checks model structure, object and edge references, deterministic identifiers, and evidence integrity. A valid model can still contain unknown coverage. Read those gaps with the results.",
          ],
          code: [
            {
              label: "VALIDATE",
              value: validate,
              copyLabel: "Copy validate command",
            },
          ],
        },
        {
          title: "3. Open the dependency report",
          paragraphs: [
            "Render a self-contained HTML report focused on public.customers.id. Open out/dependencies.html in your browser. Search for an object, inspect the evidence panel, and follow its reverse dependency paths.",
          ],
          code: [
            {
              label: "RENDER HTML",
              value: render,
              copyLabel: "Copy render command",
            },
          ],
        },
        {
          title: "4. Review a proposal",
          paragraphs: [
            "The shipped proposal illustrates a destructive contract phase in a customer identifier transition. The analyzer reads the SQL and writes findings and a review-only phase plan. It does not execute the proposal or prove a backfill has completed.",
          ],
          code: [
            {
              label: "REVIEW MIGRATION SQL",
              value: review,
              copyLabel: "Copy review command",
            },
          ],
          callout:
            "Exit 0 means the analysis completed. It can contain high-risk findings. Inspect the report before making an execution decision.",
        },
        {
          title: "Reproduce the three demonstrations",
          code: [
            {
              label: "GENERATE DEMOS",
              value: "pnpm dbdep demo out/demo",
              copyLabel: "Copy demo command",
            },
          ],
          paragraphs: [
            "The command generates the ecommerce identifier transition, catalog view chain, and dangerous index proposal from the checked-in inputs. Screenshots establish presentation; graph and rule tests establish behavior.",
          ],
        },
      ],
    },
    "good-requests": {
      title: "Good requests",
      description:
        "Give your agent concrete sources, a precise change, and the context it needs.",
      reference: "evals/evals.json",
      sections: [
        {
          title: "Make the input and boundary explicit",
          paragraphs: [
            "Name the source files or existing model, the fully qualified object, and the proposed change. State whether the task is offline or explicitly authorizes live discovery. Ask for the evidence, unknown coverage, and output paths.",
          ],
          code: [
            {
              label: "OFFLINE IMPACT REQUEST",
              value:
                "Use examples/ecommerce/schema.sql and examples/ecommerce/app.\nAnalyze the impact of changing public.customers.id from bigint to uuid.\nStay offline. Validate the model, cite evidence, list unknown consumers,\nand write an HTML report under out/customer-id. Analysis only.",
              copyLabel: "Copy impact request",
            },
          ],
        },
        {
          title: "Describe the migration runner",
          paragraphs: [
            "Transaction context changes the interpretation of concurrent index creation. Tell the agent if your runner wraps the file in one transaction. Identify the baseline and supply operational metadata only when you have it.",
          ],
          code: [
            {
              label: "MIGRATION REVIEW REQUEST",
              value:
                "Review examples/high-traffic/migrations/007.sql against the baseline model.\nOur runner wraps the file in one transaction. Use --transaction-mode single.\nTreat examples/high-traffic/metadata.json as user-supplied metadata.\nReport DDM findings, evidence, gaps, and a phased plan. Do not execute SQL.",
              copyLabel: "Copy review request",
            },
          ],
        },
        {
          title: "Use stable context for comparisons",
          bullets: [
            "Compare before and after .dbdep.json models captured in the same mode. Ask for possible rename diagnostics without assuming a confirmed rename.",
            "Use fully qualified names when schemas contain matching object names. Supply a stable identifier for ambiguous objects or overloaded routines.",
            "For a live capture request, name the environment variable that holds the DSN. Keep the DSN value and credentials out of the prompt and artifacts.",
          ],
        },
        {
          title: "Ask questions the evidence can answer",
          paragraphs: [
            "Ask which recorded objects potentially depend on a column and why. A request to find every runtime consumer cannot be satisfied by static files alone. Dynamic SQL, routine bodies, ORMs, and unresolved scopes require catalog or manual follow-up.",
          ],
          callout:
            "This skill handles dependency analysis and migration review. Migration execution, other database engines, and general query performance optimization are outside its scope.",
        },
      ],
    },
    "command-reference": {
      title: "Command reference",
      description:
        "Run inspection, impact analysis, reviews, and artifact exports with the local CLI.",
      reference: "README.md",
      sections: [
        {
          title: "CLI entry points",
          paragraphs: [
            "Use pnpm dbdep <command> from the repository root. The equivalent direct entry point is node scripts/dbdep.mjs <command>. snapshot is an alias for inspect.",
          ],
          code: [
            {
              label: "INSPECT, VALIDATE, AND TRACE",
              value: `${inspect}\n${validate}\npnpm dbdep impact out/schema.dbdep.json --object public.customers.id --operation alter-type --to uuid --json`,
              copyLabel: "Copy analysis commands",
            },
          ],
        },
        {
          title: "Commands",
          table: {
            headings: ["Command", "Purpose"],
            rows: [
              [
                "inspect / snapshot",
                "Build a model from --ddl, --repo, --catalog, or an explicitly authorized --dsn-env capture.",
              ],
              [
                "validate <model>",
                "Check model and evidence integrity; --strict and --json support automation.",
              ],
              [
                "impact <model>",
                "Trace reverse dependencies for --object and the proposed --operation.",
              ],
              [
                "review",
                "Read --migration against an optional --baseline and write findings and a phase plan.",
              ],
              [
                "diff <before> <after>",
                "Compare snapshots and retain ambiguous possible renames.",
              ],
              [
                "render <model>",
                "Write standalone HTML; --object sets its initial focus.",
              ],
              [
                "docs / mermaid / dot <model>",
                "Export a Markdown summary or a deterministic text diagram.",
              ],
              [
                "doctor / demo <directory>",
                "Check setup or generate all three shipped demonstrations.",
              ],
            ],
          },
        },
        {
          title: "Review context and policy gates",
          paragraphs: [
            "Use --transaction-mode single when the runner wraps the file in one transaction. Default analysis reads statement execution and explicit transaction statements; it cannot infer the runner's submission protocol. --metadata <file> labels supplied size and traffic facts as user-supplied.",
            "A review without --baseline is allowed and explicitly partial. The baseline is never replayed or mutated. DML and backfill semantics remain UNKNOWN.",
          ],
          code: [
            {
              label: "REVIEW WITH A POLICY GATE",
              value:
                "pnpm dbdep review --baseline out/schema.dbdep.json --migration examples/high-traffic/migrations/007.sql --transaction-mode single --metadata examples/high-traffic/metadata.json --out out/review --fail-on high --json",
              copyLabel: "Copy policy review command",
            },
          ],
          table: {
            headings: ["Policy", "Risk levels that fail"],
            rows: [
              ["--fail-on high", "high"],
              ["--fail-on medium", "high, medium"],
              ["--fail-on unknown", "high, medium, unknown"],
            ],
          },
        },
        {
          title: "Exit codes",
          bullets: [
            "Exit 0: analysis completed. Findings may still be high risk.",
            "Exit 2: input, prerequisites, model validation, or command usage is invalid.",
            "Exit 3: the requested risk policy failed. Review artifacts still exist.",
          ],
        },
        {
          title: "Explicitly authorized live discovery",
          paragraphs: [
            "Use a least-privileged role and provide credentials through an environment variable. This mode runs fixed catalog SELECTs with timeouts and a repeatable-read, read-only snapshot. It does not read business rows or execute supplied SQL.",
          ],
          code: [
            {
              label: "READ-ONLY CATALOG CAPTURE",
              value:
                "pnpm dbdep inspect --dsn-env DBDEP_DATABASE_URL --mode read-only --out out/live.dbdep.json --capture-out out/catalog.json",
              copyLabel: "Copy catalog capture command",
            },
          ],
        },
      ],
    },
    confidence: {
      title: "Evidence and confidence",
      description:
        "Read provenance, version context, and coverage gaps without treating them as certainty.",
      reference: "references/parser-and-confidence.md",
      sections: [
        {
          title: "Evidence states",
          table: {
            headings: ["State", "Meaning"],
            rows: [
              [
                "OBSERVED",
                "Metadata extracted from a supplied or captured PostgreSQL catalog. It records catalog facts, not every runtime consumer.",
              ],
              [
                "PARSED",
                "Syntax-aware static evidence from DDL or SQL. Parsing does not perform PostgreSQL name or type binding.",
              ],
              [
                "INFERRED",
                "A plausible relationship or hypothesis that the evidence does not prove.",
              ],
              [
                "UNKNOWN",
                "A missing, unsupported, ambiguous, or unavailable fact. Keep it visible in the decision.",
              ],
            ],
          },
          paragraphs: [
            "Confidence values direct, conditional, and unknown describe how to interpret evidence. They are not probabilities. Source evidence records file locations and hashes or catalog addresses and capture context.",
          ],
        },
        {
          title: "Parser grammar and PostgreSQL versions",
          paragraphs: [
            "The Node parser uses PostgreSQL 18 grammar. Review and live catalog context support PostgreSQL 14-18. Grammar acceptance does not prove a statement exists or executes on every supported release. Check the intended release and actual fixture execution separately.",
            "Offline parsing has partial coverage. Routine bodies, dynamic SQL, host-language SQL and ORMs, nested or CTE column scopes, and unresolved names can remain UNKNOWN. The toolkit does not invent search_path or an exhaustive runtime call graph.",
          ],
        },
        {
          title: "Dependency direction",
          paragraphs: [
            "An arrow means source depends on or references target. Impact walks reverse edges to find potential consumers. Foreign-key references have their own edge kind; parsed SQL and recorded catalog dependencies retain their provenance.",
            "A reverse path shows why a consumer deserves review. It does not prove failure, give PostgreSQL's exact CASCADE deletion closure, or measure downtime.",
          ],
        },
        {
          title: "Validation has a defined scope",
          paragraphs: [
            "Strict model validation checks structure and internal evidence consistency. It does not prove operational safety. A rendered report can pass browser tests while a dependency claim still needs substantive graph and source checks.",
          ],
          callout:
            "Review the model's unknowns and the finding assumptions together. An absent hazard finding is not a safety approval.",
        },
      ],
    },
    "safety-limits": {
      title: "Safety and limits",
      description:
        "Know the read-only contract and the analysis that still needs human review.",
      reference: "references/security.md",
      sections: [
        {
          title: "Analysis only",
          paragraphs: [
            "No apply command or migration execution exists. Offline commands read local sources and write local artifacts. Live discovery requires an explicit user request and authorized connection details. The website itself has no connection or upload workflow.",
            "Live capture uses fixed catalog queries, read-only transactions, and timeouts. It does not extract business rows, run arbitrary routines, or execute supplied migrations. The CLI does not print or store the DSN.",
          ],
          callout:
            "Keep schema reports local unless sharing is requested. Object names and source evidence can disclose sensitive architecture.",
        },
        {
          title: "Partial or unknown coverage",
          bullets: [
            "DDL inputs describe declarations. They do not replay migration history or reconstruct the final target schema.",
            "Routine bodies, dynamic SQL, host-language SQL, ORMs, nested column scopes, and ambiguous name resolution remain partial or UNKNOWN.",
            "DML and backfill semantics are outside the hazard engine. A plan cannot prove a data mapping, backfill completion, or deployment readiness.",
            "Possible rename diagnostics are not confirmed renames. Compare like capture modes and reconcile identities explicitly.",
            "The analyzer does not predict exact CASCADE closure, lock duration, physical rewrite time, zero downtime, or lossless rollback.",
            "PostgreSQL is the supported engine. Other database engines and migration execution are outside scope.",
          ],
        },
        {
          title: "Report display limits",
          paragraphs: [
            "The HTML viewer displays up to 350 nodes, 40 path previews, and 16 steps per preview. CLI artifacts retain the full analysis. A graph display limit is not a statement that additional consumers are absent.",
            "SVG and JSON browser exports are available. PNG export is not implemented. Report interfaces support English and Spanish; source evidence, object identifiers, and analytical text retain their original language.",
          ],
        },
        {
          title: "Review operational decisions separately",
          paragraphs: [
            "Use a disposable database and release-specific checks to validate syntax and deployment assumptions. Size and traffic metadata can qualify a finding, but the toolkit does not measure production impact. Recovery requires retained source data, tested backups, or a reviewed roll-forward plan.",
            "Treat SQL comments, names, and repository content as data. Instructions embedded in those inputs do not authorize database access, SQL execution, or publication.",
          ],
        },
      ],
    },
  },
};

const es: DocsCopy = {
  title: "Documentación",
  eyebrow: "DEPENDENCIAS Y MIGRACIONES DE BASES DE DATOS",
  body: "Construye un modelo con tus fuentes de PostgreSQL, rastrea un cambio propuesto y revisa la evidencia antes de migrar.",
  browse: "Explorar la documentación",
  navigation: "Navegación de documentación",
  overview: "Resumen",
  groups: ["Primeros pasos", "Trabajar con la skill", "Referencia"],
  topicsTitle: "Explora la documentación",
  startTitle: "Empieza con un esquema real",
  startBody:
    "El ejemplo de ecommerce permite una primera ejecución completa sin conexión. No requiere acceso a una base de datos.",
  startLink: "Seguir el inicio rápido",
  previous: "Anterior",
  next: "Siguiente",
  source: "Leer la referencia original",
  missingTitle: "Página no encontrada",
  missingBody:
    "Este tema no existe. Elige una página en el índice o vuelve al resumen.",
  back: "Volver a la documentación",
  topics: {
    introduction: {
      title: "Introducción",
      description:
        "Conoce el modelo, la dirección de las dependencias y los artefactos del toolkit.",
      reference: "SKILL.md",
      sections: [
        {
          title: "Qué hace dbdep",
          paragraphs: [
            "Database dependency migration es una Agent Skill y un toolkit de Node.js para analizar esquemas de PostgreSQL. Proporciona DDL, archivos SQL del repositorio o una captura del catálogo. La CLI crea un modelo .dbdep.json versionado con identificadores estables, dependencias tipadas, evidencia e incertidumbre explícita.",
            "Usa el modelo para explicar el impacto potencial, revisar riesgos de migración, comparar capturas o generar informes independientes. Los planes de migración son material para revisión humana. El toolkit nunca los ejecuta.",
          ],
        },
        {
          title: "Un modelo, varios artefactos",
          bullets: [
            "JSON conserva el modelo completo, la evidencia, los límites de cobertura y los identificadores estables.",
            "El explorador HTML independiente permite buscar, filtrar y revisar rutas, hallazgos y un plan por fases. Su interfaz admite inglés y español. La evidencia y el texto analítico conservan su idioma original.",
            "Markdown resume el modelo. Mermaid y DOT exportan diagramas deterministas. El visor HTML exporta SVG y JSON; la exportación PNG no está disponible.",
          ],
        },
        {
          title: "Cómo leer una flecha",
          paragraphs: [
            "Una flecha de origen a destino significa que el origen depende del destino o lo referencia. El análisis recorre las conexiones en sentido inverso para encontrar consumidores potenciales. Las claves foráneas, las dependencias del catálogo y las referencias SQL mantienen tipos de conexión distintos.",
          ],
          callout:
            "Una ruta explica por qué hay que revisar un objeto. No demuestra un fallo ni predice el alcance exacto de un borrado CASCADE en PostgreSQL.",
        },
      ],
    },
    installation: {
      title: "Instalación",
      description:
        "Configura Node, pnpm y la skill en el espacio de trabajo de tu agente.",
      reference: "README.md",
      sections: [
        {
          title: "Requisitos",
          paragraphs: [
            "Usa Node.js 22.18.0 o posterior y pnpm 12.10.1, la versión fijada por el repositorio. Clona o descarga el repositorio y abre una terminal en su raíz. El lockfile instala las dependencias del toolkit y de la web juntas sin modificarse.",
          ],
          code: [
            {
              label: "DESDE LA RAÍZ DEL REPOSITORIO",
              value: install,
              copyLabel: "Copiar comandos de instalación",
            },
          ],
        },
        {
          title: "Conecta tu agente",
          paragraphs: [
            "Copia o enlaza el repositorio completo al directorio de skills de tu agente y vuelve a cargarlo. Conserva los scripts, referencias, esquemas y dependencias junto con SKILL.md. Copiar solo SKILL.md no incluye el toolkit.",
          ],
          table: {
            headings: [
              "Agente",
              "Directorio de usuario",
              "Directorio del proyecto",
            ],
            rows: [
              [
                "Codex",
                "~/.agents/skills/database-dependency-migration",
                ".agents/skills/database-dependency-migration",
              ],
              [
                "Claude Code",
                "~/.claude/skills/database-dependency-migration",
                ".claude/skills/database-dependency-migration",
              ],
            ],
          },
        },
        {
          title: "Ejecuta el toolkit directamente",
          paragraphs: [
            "El script de pnpm ejecuta la CLI local. También puedes usar su punto de entrada de Node. Ejecuta los ejemplos desde la raíz del repositorio. Una skill instalada debe resolver su directorio absoluto y guardar la salida en el espacio de trabajo del usuario.",
          ],
          code: [
            {
              label: "PUNTO DE ENTRADA DE NODE",
              value:
                "node scripts/dbdep.mjs doctor --json\nnode scripts/dbdep.mjs inspect --ddl examples/ecommerce/schema.sql --out out/schema.dbdep.json",
              copyLabel: "Copiar comandos de Node",
            },
          ],
        },
        {
          title: "Ejecuta esta web localmente",
          code: [
            {
              label: "WEB LOCAL",
              value:
                "pnpm dev\n# Compilar y previsualizar la web estática\npnpm build\npnpm preview",
              copyLabel: "Copiar comandos de la web",
            },
          ],
          paragraphs: [
            "Abre la dirección local que imprime Vite. La web explica el toolkit y abre los informes incluidos. No tiene conexión a bases de datos ni carga de archivos.",
          ],
        },
      ],
    },
    quickstart: {
      title: "Inicio rápido",
      description:
        "Inspecciona el esquema de ecommerce y abre un informe con evidencia.",
      reference: "examples/README.md",
      sections: [
        {
          title: "1. Inspecciona las fuentes",
          paragraphs: [
            "Ejecuta los comandos desde la raíz del repositorio después de instalar. El esquema contiene dependencias de clientes, pedidos y direcciones. Los archivos SQL añaden referencias estáticas de la aplicación. Esta ejecución no se conecta a una base de datos.",
          ],
          code: [
            {
              label: "CREAR EL MODELO",
              value: inspect,
              copyLabel: "Copiar comando de inspección",
            },
          ],
        },
        {
          title: "2. Valida el modelo",
          paragraphs: [
            "La validación estricta comprueba la estructura, las referencias entre objetos y conexiones, los identificadores deterministas y la integridad de la evidencia. Un modelo válido puede conservar incertidumbre. Revisa esos límites junto con los resultados.",
          ],
          code: [
            {
              label: "VALIDAR",
              value: validate,
              copyLabel: "Copiar comando de validación",
            },
          ],
        },
        {
          title: "3. Abre el informe de dependencias",
          paragraphs: [
            "Genera un HTML independiente enfocado en public.customers.id. Abre out/dependencies.html en tu navegador. Busca un objeto, revisa su evidencia y sigue las rutas inversas de dependencias.",
          ],
          code: [
            {
              label: "GENERAR HTML",
              value: render,
              copyLabel: "Copiar comando de generación",
            },
          ],
        },
        {
          title: "4. Revisa una propuesta",
          paragraphs: [
            "La propuesta incluida ilustra una fase destructiva de contracción durante una transición de identificadores. El analizador lee el SQL y escribe hallazgos y un plan por fases para revisión. No ejecuta la propuesta ni demuestra que el relleno de datos haya terminado.",
          ],
          code: [
            {
              label: "REVISAR EL SQL DE MIGRACIÓN",
              value: review,
              copyLabel: "Copiar comando de revisión",
            },
          ],
          callout:
            "El código de salida 0 indica que el análisis terminó. Puede contener hallazgos de alto riesgo. Revisa el informe antes de decidir una ejecución.",
        },
        {
          title: "Reproduce las tres demostraciones",
          code: [
            {
              label: "GENERAR EJEMPLOS",
              value: "pnpm dbdep demo out/demo",
              copyLabel: "Copiar comando de ejemplos",
            },
          ],
          paragraphs: [
            "El comando genera la transición de identificadores, la cadena de vistas del catálogo y la propuesta de índice peligrosa a partir de los archivos incluidos. Las capturas muestran la presentación; las pruebas del grafo y de las reglas verifican el comportamiento.",
          ],
        },
      ],
    },
    "good-requests": {
      title: "Buenas peticiones",
      description:
        "Proporciona fuentes concretas, un cambio preciso y el contexto necesario.",
      reference: "evals/evals.json",
      sections: [
        {
          title: "Define las fuentes y los límites",
          paragraphs: [
            "Nombra los archivos o el modelo existente, el objeto con su esquema y el cambio propuesto. Indica si el trabajo es sin conexión o autoriza expresamente la consulta del catálogo. Pide evidencia, incertidumbre y rutas de salida. Mantén el alcance de solo análisis.",
          ],
          code: [
            {
              label: "PETICIÓN DE IMPACTO SIN CONEXIÓN",
              value:
                "Usa examples/ecommerce/schema.sql y examples/ecommerce/app.\nAnaliza cambiar public.customers.id de bigint a uuid.\nTrabaja sin conexión. Valida el modelo, cita evidencia, enumera consumidores\ndesconocidos y genera un HTML en out/customer-id. Solo análisis.",
              copyLabel: "Copiar petición de impacto",
            },
          ],
        },
        {
          title: "Describe el ejecutor de migraciones",
          paragraphs: [
            "El contexto de transacción cambia la interpretación de los índices concurrentes. Indica si tu ejecutor envuelve el archivo en una transacción. Identifica el modelo base y aporta datos operativos solo si los tienes.",
          ],
          code: [
            {
              label: "PETICIÓN DE REVISIÓN",
              value:
                "Revisa examples/high-traffic/migrations/007.sql con el modelo base.\nNuestro ejecutor usa una transacción. Usa --transaction-mode single.\nTrata examples/high-traffic/metadata.json como metadatos del usuario.\nInforma reglas DDM, evidencia, límites y un plan por fases. No ejecutes SQL.",
              copyLabel: "Copiar petición de revisión",
            },
          ],
        },
        {
          title: "Usa contexto estable para comparar",
          bullets: [
            "Compara modelos .dbdep.json anteriores y posteriores capturados con el mismo modo. Pide posibles cambios de nombre sin asumir que están confirmados.",
            "Usa nombres con esquema cuando varios objetos se llamen igual. Aporta el identificador estable de objetos ambiguos o rutinas sobrecargadas.",
            "Para una captura en vivo, indica la variable de entorno que contiene el DSN. No incluyas su valor ni credenciales en la petición o los artefactos.",
          ],
        },
        {
          title: "Pide respuestas que la evidencia permita",
          paragraphs: [
            "Pregunta qué objetos registrados podrían depender de una columna y por qué. Los archivos estáticos no permiten encontrar todos los consumidores en ejecución. SQL dinámico, rutinas, ORM y ámbitos sin resolver requieren catálogo o revisión manual.",
          ],
          callout:
            "La skill analiza dependencias y revisa migraciones. La ejecución, otros motores y la optimización general de consultas quedan fuera de su alcance.",
        },
      ],
    },
    "command-reference": {
      title: "Referencia de comandos",
      description:
        "Ejecuta inspecciones, análisis de impacto, revisiones y exportaciones con la CLI local.",
      reference: "README.md",
      sections: [
        {
          title: "Puntos de entrada",
          paragraphs: [
            "Usa pnpm dbdep <comando> desde la raíz del repositorio. El punto de entrada directo equivalente es node scripts/dbdep.mjs <comando>. snapshot es un alias de inspect.",
          ],
          code: [
            {
              label: "INSPECCIONAR, VALIDAR Y RASTREAR",
              value: `${inspect}\n${validate}\npnpm dbdep impact out/schema.dbdep.json --object public.customers.id --operation alter-type --to uuid --json`,
              copyLabel: "Copiar comandos de análisis",
            },
          ],
        },
        {
          title: "Comandos",
          table: {
            headings: ["Comando", "Función"],
            rows: [
              [
                "inspect / snapshot",
                "Crea un modelo con --ddl, --repo, --catalog o una captura --dsn-env autorizada.",
              ],
              [
                "validate <modelo>",
                "Comprueba modelo y evidencia; --strict y --json permiten automatizar.",
              ],
              [
                "impact <modelo>",
                "Rastrea dependencias inversas para --object y --operation.",
              ],
              [
                "review",
                "Lee --migration con un --baseline opcional y genera hallazgos y un plan por fases.",
              ],
              [
                "diff <antes> <después>",
                "Compara capturas y conserva posibles cambios de nombre ambiguos.",
              ],
              [
                "render <modelo>",
                "Genera HTML independiente; --object establece el foco inicial.",
              ],
              [
                "docs / mermaid / dot <modelo>",
                "Exporta un resumen Markdown o un diagrama de texto determinista.",
              ],
              [
                "doctor / demo <directorio>",
                "Comprueba la instalación o genera las tres demostraciones.",
              ],
            ],
          },
        },
        {
          title: "Contexto y políticas de revisión",
          paragraphs: [
            "Usa --transaction-mode single cuando el ejecutor envuelve el archivo en una transacción. El análisis predeterminado interpreta sentencias y transacciones explícitas; no deduce el protocolo del ejecutor. --metadata <archivo> identifica los datos de tamaño y tráfico como aportados por el usuario.",
            "Se permite revisar sin --baseline, con cobertura expresamente parcial. El modelo base no se modifica ni reproduce la migración. La semántica de DML y del relleno de datos sigue como UNKNOWN.",
          ],
          code: [
            {
              label: "REVISIÓN CON POLÍTICA DE RIESGO",
              value:
                "pnpm dbdep review --baseline out/schema.dbdep.json --migration examples/high-traffic/migrations/007.sql --transaction-mode single --metadata examples/high-traffic/metadata.json --out out/review --fail-on high --json",
              copyLabel: "Copiar revisión con política",
            },
          ],
          table: {
            headings: ["Política", "Niveles que producen fallo"],
            rows: [
              ["--fail-on high", "high"],
              ["--fail-on medium", "high, medium"],
              ["--fail-on unknown", "high, medium, unknown"],
            ],
          },
        },
        {
          title: "Códigos de salida",
          bullets: [
            "Salida 0: el análisis terminó. Los hallazgos aún pueden ser de alto riesgo.",
            "Salida 2: las fuentes, los requisitos, la validación o el uso del comando son inválidos.",
            "Salida 3: falló la política de riesgo solicitada. Los artefactos de revisión existen.",
          ],
        },
        {
          title: "Consulta en vivo autorizada",
          paragraphs: [
            "Usa un rol con permisos mínimos y una variable de entorno para las credenciales. Este modo ejecuta SELECT fijos del catálogo con tiempos máximos y una captura repetible de solo lectura. No lee filas de negocio ni ejecuta SQL proporcionado.",
          ],
          code: [
            {
              label: "CAPTURA DE CATÁLOGO DE SOLO LECTURA",
              value:
                "pnpm dbdep inspect --dsn-env DBDEP_DATABASE_URL --mode read-only --out out/live.dbdep.json --capture-out out/catalog.json",
              copyLabel: "Copiar captura del catálogo",
            },
          ],
        },
      ],
    },
    confidence: {
      title: "Evidencia y confianza",
      description:
        "Interpreta la procedencia, las versiones y los límites de cobertura.",
      reference: "references/parser-and-confidence.md",
      sections: [
        {
          title: "Estados de evidencia",
          table: {
            headings: ["Estado", "Significado"],
            rows: [
              [
                "OBSERVED",
                "Metadatos de un catálogo de PostgreSQL proporcionado o capturado. No registra todos los consumidores en ejecución.",
              ],
              [
                "PARSED",
                "Evidencia estática del análisis de sintaxis de DDL o SQL. No resuelve nombres y tipos como PostgreSQL.",
              ],
              [
                "INFERRED",
                "Relación o hipótesis plausible que la evidencia no demuestra.",
              ],
              [
                "UNKNOWN",
                "Dato faltante, no compatible, ambiguo o no disponible. Debe seguir visible al decidir.",
              ],
            ],
          },
          paragraphs: [
            "Los valores de confianza direct, conditional y unknown describen la interpretación de la evidencia. No son probabilidades. La evidencia registra líneas y hashes de archivos o direcciones y contexto del catálogo.",
          ],
        },
        {
          title: "Gramática y versiones de PostgreSQL",
          paragraphs: [
            "El analizador de Node usa la gramática de PostgreSQL 18. El contexto de revisión y del catálogo en vivo admite PostgreSQL 14-18. Aceptar una sintaxis no demuestra que exista o se ejecute en cada versión. Comprueba por separado la versión de destino y la ejecución real de los ejemplos.",
            "El análisis sin conexión tiene cobertura parcial. Cuerpos de rutinas, SQL dinámico, SQL en otros lenguajes y ORM, ámbitos de columnas anidados o CTE y nombres sin resolver pueden quedar como UNKNOWN. El toolkit no inventa search_path ni un grafo completo de llamadas en ejecución.",
          ],
        },
        {
          title: "Dirección de las dependencias",
          paragraphs: [
            "La flecha indica que el origen depende del destino o lo referencia. El impacto recorre conexiones inversas para encontrar consumidores potenciales. Las claves foráneas tienen un tipo propio; SQL analizado y dependencias del catálogo conservan su procedencia.",
            "Una ruta inversa indica por qué revisar un consumidor. No prueba un fallo, el alcance exacto de un borrado CASCADE ni mide indisponibilidad.",
          ],
        },
        {
          title: "El alcance de la validación",
          paragraphs: [
            "La validación estricta comprueba estructura y consistencia interna de la evidencia. No demuestra seguridad operativa. Un informe puede pasar pruebas de navegador mientras una afirmación de dependencias necesita comprobación del grafo y de las fuentes.",
          ],
          callout:
            "Revisa la incertidumbre del modelo y los supuestos de los hallazgos juntos. La ausencia de un hallazgo no aprueba la seguridad del cambio.",
        },
      ],
    },
    "safety-limits": {
      title: "Seguridad y límites",
      description:
        "Conoce el contrato de solo lectura y lo que requiere revisión humana.",
      reference: "references/security.md",
      sections: [
        {
          title: "Solo análisis",
          paragraphs: [
            "No existe un comando apply ni ejecución de migraciones. Los comandos sin conexión leen archivos y generan artefactos locales. La consulta en vivo requiere una petición explícita y una conexión autorizada. La web no tiene conexión ni carga de archivos.",
            "La captura en vivo usa consultas fijas del catálogo, transacciones de solo lectura y tiempos máximos. No extrae filas de negocio, ejecuta rutinas arbitrarias ni migraciones proporcionadas. La CLI no imprime ni guarda el DSN.",
          ],
          callout:
            "Conserva los informes localmente salvo que se solicite compartirlos. Los nombres y la evidencia pueden revelar arquitectura sensible.",
        },
        {
          title: "Cobertura parcial o desconocida",
          bullets: [
            "El DDL describe declaraciones. No reproduce el historial de migraciones ni reconstruye el esquema final.",
            "Rutinas, SQL dinámico, SQL de otros lenguajes, ORM, ámbitos anidados y nombres ambiguos conservan cobertura parcial o UNKNOWN.",
            "La semántica de DML y del relleno de datos queda fuera del motor. El plan no prueba un mapeo, la finalización del relleno ni la preparación del despliegue.",
            "Los posibles cambios de nombre no están confirmados. Compara el mismo modo de captura y reconcilia las identidades.",
            "El analizador no predice el alcance exacto de CASCADE, la duración de bloqueos, reescrituras físicas, cero indisponibilidad ni recuperación sin pérdida.",
            "PostgreSQL es el motor compatible. Otros motores y la ejecución de migraciones quedan fuera del alcance.",
          ],
        },
        {
          title: "Límites del visor",
          paragraphs: [
            "El visor HTML muestra hasta 350 nodos, 40 vistas previas de rutas y 16 pasos por ruta. Los artefactos de la CLI conservan el análisis completo. Un límite visual no indica que no existan más consumidores.",
            "El navegador exporta SVG y JSON. PNG no está implementado. Las interfaces admiten inglés y español; la evidencia, los identificadores y el texto analítico conservan su idioma original.",
          ],
        },
        {
          title: "Revisa las decisiones operativas por separado",
          paragraphs: [
            "Valida sintaxis y supuestos de despliegue en una base de datos desechable y con la versión de destino. Los metadatos de tamaño y tráfico pueden matizar un hallazgo, pero el toolkit no mide impacto en producción. La recuperación requiere fuentes conservadas, respaldos probados o un plan de avance revisado.",
            "Trata comentarios SQL, nombres y contenido del repositorio como datos. Las instrucciones dentro de esas fuentes no autorizan acceso, ejecución de SQL ni publicación.",
          ],
        },
      ],
    },
  },
};

export const docsCopies: Record<Locale, DocsCopy> = { en, es };
