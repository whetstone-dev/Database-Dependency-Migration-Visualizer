/** Every report is derived from a validated canonical snapshot. */
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  lstatSync,
  realpathSync,
  readdirSync,
  openSync,
  closeSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import {
  dirname,
  join,
  resolve,
  parse,
  relative,
  sep,
  extname,
} from "node:path";
import { createHash, randomUUID } from "node:crypto";
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
    .replaceAll("\\", "\\\\")
    .replace(/[!*_\[\](){}#|]/g, (character) => `\\${character}`)
    .replace(/[\r\n]/g, " ")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("`", "&#96;");
// CommonMark code spans preserve punctuation without interpreting links or HTML.
// Choose a delimiter longer than any embedded backtick run, then pad both ends.
export function md_code(value) {
  const text = String(value).replace(/[\r\n]/g, " ");
  const runs = text.match(/`+/g) ?? [];
  const fence = "`".repeat(Math.max(0, ...runs.map((run) => run.length)) + 1);
  const padding = /^ *$/.test(text) ? "" : " ";
  return `${fence}${padding}${text}${padding}${fence}`;
}
export function markdown(model, review = null, changes = null) {
  require_valid(model);
  const s = summary(model);
  const lines = [
    "# PostgreSQL dependency review",
    "",
    "Analysis only. No SQL was executed by the analyzer.",
    "",
    `Snapshot ${md_code(model.snapshot.id)}. PostgreSQL ${md_safe(model.engine.version)}, ${md_safe(model.engine.source_mode)}.`,
    `Nodes: ${s.nodes}. Edges: ${s.edges}. Evidence: ${s.evidence}. Findings: ${s.findings}. Unknowns: ${s.unknowns}.`,
    "",
    "Arrows mean source depends on/references target. Impact walks reverse edges. Paths describe potential impact; they do not prove runtime failure or complete consumer coverage.",
    "",
    "## Findings",
    "",
  ];
  for (const f of model.findings)
    lines.push(
      `### ${md_safe(f.rule_id)} (${md_safe(f.severity)}, ${md_safe(f.risk_level)}, ${md_safe(f.status)})`,
      "",
      md_safe(f.reason),
      "",
      md_safe(f.remediation),
      "",
      `Finding ID: ${md_code(f.id)}. Dimensions: ${md_safe(f.risk_dimensions.join(", "))}. Evidence: ${md_safe(f.evidence_ids.join(", "))}.`,
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
      `- UNKNOWN: ${md_safe(u.explanation)} Evidence: ${md_safe(u.evidence_ids.join(", "))}.`,
    );
  if (review) {
    lines.push("", "## Migration sequence", "");
    for (const p of review.plan)
      lines.push(
        `### ${md_safe(p.phase)}`,
        "",
        md_safe(p.action),
        "",
        `Preconditions: ${md_safe(p.preconditions)}`,
        "",
        `Verification: ${md_safe(p.verification)}`,
        "",
        `Recovery: ${md_safe(p.recovery)}`,
        "",
      );
    for (const i of review.impacts ?? []) {
      lines.push(`Affected root: ${md_code(i.root)}.`, "");
      for (const n of i.affected)
        lines.push(`- ${md_code(n)} via ${md_safe(i.paths[n].join(", "))}`);
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
      `| ${md_safe(n.id)} | ${md_safe(n.qualified_name)} | ${md_safe(n.kind)} | ${md_safe(n.status)} | ${md_safe(n.evidence_ids.join(", "))} |`,
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
      `| ${md_safe(e.id)} | ${md_safe(e.source)} | ${md_safe(e.target)} | ${md_safe(e.kind)} | ${md_safe(e.status)} |`,
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
      `| ${md_safe(e.id)} | ${md_safe(e.origin)} | ${md_safe(location)} | ${md_safe(e.source_hash)} |`,
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
          `  ${ids.get(n.id)}["${html_escape(n.qualified_name).replace(/[\r\n]/g, " ")}"]`,
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
export const bundle_names = [
  "model.dbdep.json",
  "report.md",
  "report.html",
  "graph.mmd",
  "graph.dot",
  "review.json",
  "diff.json",
  "before.dbdep.json",
  "after.dbdep.json",
];

function info(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export function check_output_path(path) {
  const target = resolve(path),
    root = parse(target).root;
  let directory = root;
  for (const component of relative(root, dirname(target))
    .split(sep)
    .filter(Boolean)) {
    directory = join(directory, component);
    let entry = info(directory);
    if (!entry) {
      try {
        mkdirSync(directory, { mode: 0o700 });
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
      entry = lstatSync(directory);
    }
    if (entry.isSymbolicLink())
      throw new Error("Output path contains a symbolic link or junction");
    if (!entry.isDirectory())
      throw new Error("Output parent is not a regular directory");
  }
  const entry = info(target);
  if (entry?.isSymbolicLink())
    throw new Error("Output file is a symbolic link or junction");
  if (entry && !entry.isFile())
    throw new Error("Output destination is not a regular file");
  return target;
}

export function protect_inputs(outputs, inputs) {
  const protectedPaths = new Set();
  const pathKey = (path) =>
    process.platform === "win32" ? path.toLowerCase() : path;
  function collect(path, extensions) {
    const entry = info(path);
    if (!entry) return;
    if (entry.isDirectory()) {
      for (const child of readdirSync(path, { withFileTypes: true })) {
        if (child.isSymbolicLink()) continue;
        const full = join(path, child.name);
        if (child.isDirectory() || extensions.includes(extname(full)))
          collect(full, extensions);
      }
    } else protectedPaths.add(pathKey(realpathSync(path)));
  }
  for (const { path, extensions = [] } of inputs.filter(
    (input) => input.path,
  )) {
    const absolute = resolve(path);
    if (info(absolute)) collect(realpathSync(absolute), extensions);
  }
  const selected = new Set();
  for (const path of outputs.filter(Boolean)) {
    const absolute = check_output_path(path),
      key = pathKey(existsSync(absolute) ? realpathSync(absolute) : absolute);
    if (protectedPaths.has(key))
      throw new Error(
        "Output would overwrite an input source; choose a separate artifact path",
      );
    if (selected.has(key))
      throw new Error("Requested artifacts must have separate output paths");
    selected.add(key);
  }
}

export function write(path, content) {
  const target = check_output_path(path),
    temporary = join(dirname(target), `.dbdep-${randomUUID()}.tmp`);
  let descriptor,
    created = false;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    created = true;
    writeFileSync(descriptor, content, "utf8");
    closeSync(descriptor);
    descriptor = undefined;
    check_output_path(target);
    renameSync(temporary, target);
    created = false;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (created) unlinkSync(temporary);
  }
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
  for (const name of bundle_names) check_output_path(p(name));
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
