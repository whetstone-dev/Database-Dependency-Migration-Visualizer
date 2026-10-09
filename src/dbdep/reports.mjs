/** Every report is derived from a validated canonical snapshot. */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { canonical, resources, validate } from "./model.mjs";

export function require_valid(model) {
  const errors = validate(model);
  if (errors.length)
    throw new Error(
      `Invalid canonical model: ${errors.slice(0, 8).join("; ")}`,
    );
}
export function summary(model) {
  return {
    nodes: model.nodes.length,
    edges: model.edges.length,
    evidence: model.evidence.length,
    unknowns: model.unknowns.length,
    findings: model.findings.length,
    severity_counts: Object.fromEntries(
      ["info", "warning", "error"].map((s) => [
        s,
        model.findings.filter((f) => f.severity === s).length,
      ]),
    ),
  };
}
export const html_escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
const csp_hash = (text) =>
  createHash("sha256").update(text, "utf8").digest("base64");

export function render(model, review = null, changes = null, root = null) {
  require_valid(model);
  const state = {
    model,
    summary: summary(model),
    plan: review?.plan ?? [],
    changes,
    root,
  };
  const data = canonical(state)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  const viewer = join(resources(), "assets/viewer");
  let css = readFileSync(join(viewer, "viewer.css"), "utf8");
  for (const [token, filename] of [
    ["__ARCHIVO_FONT__", "archivo-latin-wght-normal.woff2"],
    ["__PLEX_FONT__", "ibm-plex-mono-latin-400-normal.woff2"],
  ]) {
    if (css.includes(token))
      css = css.replaceAll(
        token,
        `data:font/woff2;base64,${readFileSync(join(viewer, filename)).toString("base64")}`,
      );
  }
  const js = readFileSync(join(viewer, "viewer.js"), "utf8");
  const bootstrap = existsSync(join(viewer, "bootstrap.js"))
    ? readFileSync(join(viewer, "bootstrap.js"), "utf8")
    : "";
  const locales = existsSync(join(viewer, "locales.js"))
    ? readFileSync(join(viewer, "locales.js"), "utf8")
    : "";
  const script = locales ? `${locales}\n${js}` : js;
  const csp = `default-src 'none'; script-src 'sha256-${csp_hash(script)}'${bootstrap ? ` 'sha256-${csp_hash(bootstrap)}'` : ""}; style-src 'sha256-${csp_hash(css)}'; font-src data:; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const fallback = `${model.nodes.length} nodes, ${model.edges.length} edges, ${model.findings.length} findings, ${model.unknowns.length} unknowns. PostgreSQL ${html_escape(model.engine.version)}. Source depends on target; blast radius follows reverse edges. Use report.md or the canonical JSON without JavaScript.`;
  const fontLicenses = ["archivo-LICENSE", "ibm-plex-mono-LICENSE"]
    .filter((f) => existsSync(join(viewer, f)))
    .map((f) => `${f}\n${readFileSync(join(viewer, f), "utf8")}`)
    .join("\n\n");
  let template = readFileSync(join(viewer, "template.html"), "utf8");
  const replacements = {
    __CSP__: html_escape(csp),
    __CSS__: css,
    __FALLBACK__: fallback,
    __STATE__: data,
    __JS__: script,
    __BOOTSTRAP__: bootstrap,
    __FONT_LICENSES__: html_escape(fontLicenses).replaceAll("--", "&#45;&#45;"),
  };
  // Single pass prevents user data from being interpreted as renderer tokens.
  template = template.replace(
    /__(?:CSP|CSS|FALLBACK|STATE|JS|BOOTSTRAP|FONT_LICENSES)__/g,
    (token) => replacements[token],
  );
  return template;
}
export function embedded_state(document) {
  const match = document.match(
    /<script id="dbdep-state" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error("HTML has no canonical embedded state");
  return JSON.parse(match[1]);
}
export const md_safe = (value) =>
  String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("`", "&#96;");
export function markdown(model, review = null, changes = null) {
  require_valid(model);
  const s = summary(model);
  const lines = [
    "# PostgreSQL dependency review",
    "",
    "Analysis only. No SQL was executed by the analyzer.",
    "",
    `Snapshot \`${model.snapshot.id}\`. PostgreSQL ${model.engine.version}, ${model.engine.source_mode}.`,
    `Nodes: ${s.nodes}. Edges: ${s.edges}. Evidence: ${s.evidence}. Findings: ${s.findings}. Unknowns: ${s.unknowns}.`,
    "",
    "Arrows mean source depends on/references target. Impact walks reverse edges. Paths describe potential impact; they do not prove runtime failure or complete consumer coverage.",
    "",
    "## Findings",
    "",
  ];
  for (const f of model.findings)
    lines.push(
      `### ${f.rule_id} (${f.severity}, ${f.risk_level}, ${f.status})`,
      "",
      md_safe(f.reason),
      "",
      md_safe(f.remediation),
      "",
      `Finding ID: \`${f.id}\`. Dimensions: ${f.risk_dimensions.join(", ")}. Evidence: ${f.evidence_ids.join(", ")}.`,
      "",
    );
  lines.push(
    "## Coverage and unknowns",
    "",
    "OBSERVED means supplied catalog metadata. PARSED means syntax-aware source evidence. INFERRED means unproven. UNKNOWN means unavailable or unsupported. Static analysis is not exhaustive.",
    "",
  );
  for (const u of model.unknowns)
    lines.push(
      `- UNKNOWN: ${md_safe(u.explanation)} Evidence: ${u.evidence_ids.join(", ")}.`,
    );
  if (review) {
    lines.push("", "## Migration sequence", "");
    for (const p of review.plan)
      lines.push(
        `### ${p.phase}`,
        "",
        p.action,
        "",
        `Preconditions: ${p.preconditions}`,
        "",
        `Verification: ${p.verification}`,
        "",
        `Recovery: ${p.recovery}`,
        "",
      );
    for (const i of review.impacts ?? []) {
      lines.push(`Affected root: \`${i.root}\`.`, "");
      for (const n of i.affected)
        lines.push(`- \`${n}\` via ${i.paths[n].join(", ")}`);
    }
  }
  if (changes)
    lines.push(
      "",
      "## Snapshot changes",
      "",
      "```json",
      canonical(changes).trimEnd(),
      "```",
    );
  lines.push(
    "",
    "## Object inventory",
    "",
    "| ID | Object | Kind | Status | Evidence |",
    "|---|---|---|---|---|",
  );
  for (const n of model.nodes)
    lines.push(
      `| ${n.id} | ${md_safe(n.qualified_name)} | ${n.kind} | ${n.status} | ${n.evidence_ids.join(", ")} |`,
    );
  lines.push(
    "",
    "## Edge inventory",
    "",
    "| ID | Source | Target | Kind | Status |",
    "|---|---|---|---|---|",
  );
  for (const e of model.edges)
    lines.push(
      `| ${e.id} | ${e.source} | ${e.target} | ${e.kind} | ${e.status} |`,
    );
  lines.push(
    "",
    "## Evidence inventory",
    "",
    "| ID | Origin | Location | Hash |",
    "|---|---|---|---|",
  );
  for (const e of model.evidence) {
    const location =
      e.path !== undefined
        ? `${e.path}:${e.line_start}-${e.line_end}`
        : `${e.query_id} at ${e.captured_at} (${e.catalog_address ?? ""})`;
    lines.push(
      `| ${e.id} | ${e.origin} | ${md_safe(location)} | ${e.source_hash} |`,
    );
  }
  return lines.join("\n") + "\n";
}
export function mermaid(model) {
  require_valid(model);
  const ids = new Map(model.nodes.map((n, i) => [n.id, `n${i}`]));
  return (
    [
      "flowchart LR",
      "  %% Source depends on target; traverse reverse for impact",
      ...model.nodes.map(
        (n) =>
          `  ${ids.get(n.id)}["${html_escape(n.qualified_name).replaceAll("\n", " ")}"]`,
      ),
      ...model.edges.map(
        (e) => `  ${ids.get(e.source)} -->|${e.kind}| ${ids.get(e.target)}`,
      ),
    ].join("\n") + "\n"
  );
}
export function dot(model) {
  require_valid(model);
  return (
    [
      "digraph dependencies {",
      "  // Source depends on target; reverse traversal gives impact",
      ...model.nodes.map(
        (n) =>
          `  ${JSON.stringify(n.id)} [label=${JSON.stringify(n.qualified_name)}];`,
      ),
      ...model.edges.map(
        (e) =>
          `  ${JSON.stringify(e.source)} -> ${JSON.stringify(e.target)} [label=${JSON.stringify(e.kind)}];`,
      ),
      "}",
    ].join("\n") + "\n"
  );
}
export function write(path, content) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, content, "utf8");
}
export function bundle(
  directory,
  model,
  review = null,
  changes = null,
  root = null,
) {
  require_valid(model);
  const p = (name) => join(directory, name);
  write(p("model.dbdep.json"), canonical(model));
  write(p("report.md"), markdown(model, review, changes));
  write(p("report.html"), render(model, review, changes, root));
  write(p("graph.mmd"), mermaid(model));
  write(p("graph.dot"), dot(model));
  if (review)
    write(
      p("review.json"),
      canonical(
        Object.fromEntries(
          Object.entries(review).filter(([k]) => k !== "model"),
        ),
      ),
    );
  if (changes) write(p("diff.json"), canonical(changes));
  return { directory: resolve(directory), summary: summary(model) };
}
