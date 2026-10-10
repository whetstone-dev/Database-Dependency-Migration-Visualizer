/** Canonical identity, evidence and secret-safe semantic validation. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const STATUSES = ["OBSERVED", "PARSED", "INFERRED", "UNKNOWN"];
export const ORIGINS = [
  "postgres_catalog",
  "sql_file",
  "migration_diff",
  "application_source",
  "user_supplied",
  "heuristic",
];
export const KINDS = [
  "schema",
  "table",
  "partitioned_table",
  "view",
  "materialized_view",
  "column",
  "sequence",
  "index",
  "constraint",
  "type",
  "function",
  "procedure",
  "trigger",
  "query",
  "extension",
];
export const EDGE_KINDS = [
  "contains",
  "foreign_key",
  "catalog_dependency",
  "query_reference",
  "trigger_association",
  "type_reference",
  "partition",
  "inheritance",
  "expression_reference",
  "sequence_ownership",
];
export const resources = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ascii = (value) =>
  JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
export function compare(a, b) {
  const ac = Array.from(String(a), (c) => c.codePointAt(0)),
    bc = Array.from(String(b), (c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(ac.length, bc.length); i++)
    if (ac[i] !== bc[i]) return ac[i] - bc[i];
  return ac.length - bc.length;
}
/** Python-compatible sorted-key JSON. Compact form uses Python's default separators. */
export function json_sorted(value, indent = null) {
  const seen = new Set();
  function serialize(v, depth) {
    if (v === null || typeof v === "boolean" || typeof v === "string")
      return ascii(v);
    if (typeof v === "number") {
      if (!Number.isFinite(v))
        throw new TypeError("Canonical JSON requires finite numbers");
      return JSON.stringify(v);
    }
    if (typeof v !== "object" || v === undefined)
      throw new TypeError("Canonical JSON requires JSON values");
    if (seen.has(v))
      throw new TypeError("Canonical JSON cannot contain circular values");
    seen.add(v);
    const isArray = Array.isArray(v),
      keys = isArray ? v.map((_, i) => i) : Object.keys(v).sort(compare);
    const begin = isArray ? "[" : "{",
      end = isArray ? "]" : "}";
    let result;
    if (!keys.length) result = begin + end;
    else {
      const values = keys.map(
        (k) => (isArray ? "" : ascii(k) + ": ") + serialize(v[k], depth + 1),
      );
      result =
        indent === null
          ? begin + values.join(", ") + end
          : begin +
            "\n" +
            values
              .map((x) => " ".repeat((depth + 1) * indent) + x)
              .join(",\n") +
            "\n" +
            " ".repeat(depth * indent) +
            end;
    }
    seen.delete(v);
    return result;
  }
  return serialize(value, 0);
}
export const canonical = (value) => json_sorted(value, 2) + "\n";
export const digest = (value) =>
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8"))
    .digest("hex");
const quote = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
export const identity = (kind, schema, name, parent = "", signature = "") =>
  "postgresql:local/" +
  [schema, kind, parent, name, signature].map(quote).join("/");
export const quoted = (name) =>
  /^[a-z_][a-z_0-9$]*$/.test(name)
    ? name
    : '"' + name.replaceAll('"', '""') + '"';
export const display = (schema, name, parent = "") =>
  [schema, parent, name].filter(Boolean).map(quoted).join(".");
export function safe_path(source) {
  const absolute = path.resolve(String(source)),
    relative = path.relative(process.cwd(), absolute);
  return relative !== ".." &&
    !relative.startsWith(".." + path.sep) &&
    !path.isAbsolute(relative)
    ? relative.split(path.sep).join("/")
    : path.basename(absolute);
}
export function fingerprint(model) {
  const sources = [
    ...new Map(
      model.evidence.map((e) => {
        const pair = [e.path ?? e.query_id ?? "", e.source_hash];
        return [JSON.stringify(pair), pair];
      }),
    ).values(),
  ];
  sources.sort((a, b) => compare(a[0], b[0]) || compare(a[1], b[1]));
  return digest(canonical({ sources, version: model.engine.version }));
}
const unique = (values) => [...new Set(values)].sort(compare);
export class Builder {
  constructor(version = "18", source_mode = "offline_ddl") {
    this.model = {
      schema_version: "1.0.0",
      engine: { name: "postgresql", version: String(version), source_mode },
      snapshot: { id: "", created_at: null, source_fingerprint: "" },
      coverage: {
        catalog_available: false,
        repository_scan: false,
        exhaustive: false,
        unresolved: 0,
        capabilities: [],
      },
      nodes: [],
      edges: [],
      evidence: [],
      findings: [],
      unknowns: [],
    };
    this.nodes = new Map();
    this.edges = new Map();
  }
  evidence(
    source,
    raw,
    start = 0,
    length = 0,
    status = "PARSED",
    origin = "sql_file",
    extra = {},
  ) {
    raw = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const data = {
      origin,
      status,
      confidence: "direct",
      source_hash: digest(raw),
      explanation:
        "Syntax establishes a static reference, not runtime reachability.",
      ...extra,
    };
    if (origin !== "postgres_catalog")
      Object.assign(data, {
        path: safe_path(source),
        line_start: raw.subarray(0, start).filter((c) => c === 10).length + 1,
        line_end:
          raw.subarray(0, start + length).filter((c) => c === 10).length + 1,
        byte_start: start,
        byte_length: length,
      });
    data.id = "ev:" + digest(canonical(data)).slice(7, 31);
    if (!this.model.evidence.some((e) => e.id === data.id))
      this.model.evidence.push(data);
    return data.id;
  }
  node(
    kind,
    schema,
    name,
    evidence,
    parent = "",
    signature = "",
    properties = null,
    status = "PARSED",
    origin = "sql_file",
  ) {
    const key = identity(kind, schema, name, parent, signature);
    if (this.nodes.has(key)) {
      const n = this.nodes.get(key);
      n.evidence_ids = unique([...n.evidence_ids, evidence]);
      if (properties) Object.assign(n.properties, properties);
      return n;
    }
    const n = {
      id: key,
      kind,
      schema,
      name,
      parent,
      signature,
      qualified_name: display(schema, name, parent),
      origin,
      status,
      confidence: "direct",
      evidence_ids: [evidence],
      properties: properties ?? {},
    };
    this.nodes.set(key, n);
    return n;
  }
  edge(
    source,
    target,
    kind,
    evidence,
    status = "PARSED",
    origin = "sql_file",
    properties = null,
  ) {
    source = typeof source === "object" ? source.id : source;
    target = typeof target === "object" ? target.id : target;
    if (source === target) return;
    const props = properties ?? {},
      stable = Object.fromEntries(
        Object.entries(props).filter(([k]) => k !== "catalog_address"),
      );
    const key =
      "edge:" +
      digest(canonical([source, target, kind, status, stable])).slice(7, 31);
    if (this.edges.has(key))
      this.edges.get(key).evidence_ids = unique([
        ...this.edges.get(key).evidence_ids,
        evidence,
      ]);
    else
      this.edges.set(key, {
        id: key,
        source,
        target,
        kind,
        origin,
        status,
        confidence: "direct",
        evidence_ids: [evidence],
        explanation:
          "Source depends on or references target; impact traverses reverse edges. Runtime effects require review.",
        properties: props,
      });
  }
  unknown(explanation, evidence, object_id = null) {
    const u = {
      id:
        "unknown:" +
        digest(canonical([explanation, evidence, object_id])).slice(7, 31),
      status: "UNKNOWN",
      origin: "heuristic",
      confidence: "unknown",
      explanation,
      evidence_ids: [evidence],
      object_id,
    };
    if (!this.model.unknowns.some((x) => x.id === u.id))
      this.model.unknowns.push(u);
  }
  finish() {
    const byId = (a, b) => compare(a.id, b.id);
    this.model.nodes = [...this.nodes.values()].sort(byId);
    this.model.edges = [...this.edges.values()].sort(byId);
    for (const key of ["evidence", "unknowns", "findings"])
      this.model[key].sort(byId);
    this.model.coverage.unresolved = this.model.unknowns.length;
    const fp = fingerprint(this.model);
    this.model.snapshot.source_fingerprint = fp;
    this.model.snapshot.id = "snapshot:" + fp.slice(7, 31);
    return this.model;
  }
}
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const checkSchema = ajv.compile(
  JSON.parse(
    fs.readFileSync(
      path.join(resources(), "schemas/dbdep.schema.json"),
      "utf8",
    ),
  ),
);
export function validate(model, strict = false) {
  if (!checkSchema(model))
    return unique(
      checkSchema.errors.map(
        (e) =>
          `${e.instancePath.slice(1)}: JSON Schema ${e.keyword} check failed`,
      ),
    );
  const errors = [],
    ids = {};
  for (const key of ["nodes", "edges", "evidence", "findings", "unknowns"]) {
    const vals = model[key].map((x) => x.id);
    ids[key] = new Set(vals);
    if (ids[key].size !== vals.length) errors.push(`Duplicate IDs in ${key}`);
    if (strict) {
      const sorted = [...vals].sort(compare);
      if (vals.some((v, i) => v !== sorted[i])) errors.push(`Unsorted ${key}`);
    }
  }
  for (const edge of model.edges) {
    if (!ids.nodes.has(edge.source) || !ids.nodes.has(edge.target))
      errors.push("Dangling edge endpoint");
    if (
      edge.properties.constraint !== undefined &&
      !ids.nodes.has(edge.properties.constraint)
    )
      errors.push("Dangling constraint reference");
  }
  for (const finding of model.findings) {
    if (finding.object_ids.some((id) => !ids.nodes.has(id)))
      errors.push("Dangling finding object reference");
    if (
      canonical(unique(finding.evidence)) !==
      canonical(unique(finding.evidence_ids))
    )
      errors.push("Inconsistent finding evidence aliases");
  }
  for (const unknown of model.unknowns)
    if (unknown.object_id !== null && !ids.nodes.has(unknown.object_id))
      errors.push("Dangling unknown object reference");
  for (const key of ["nodes", "edges", "findings", "unknowns"])
    for (const obj of model[key])
      if (obj.evidence_ids.some((id) => !ids.evidence.has(id)))
        errors.push("Missing evidence reference");
  const hashes = new Map();
  for (const e of model.evidence) {
    const source = e.path ?? e.query_id;
    if (hashes.has(source) && hashes.get(source) !== e.source_hash)
      errors.push("Inconsistent source hash for an evidence source");
    hashes.set(source, e.source_hash);
    if ((e.line_end ?? 1) < (e.line_start ?? 1))
      errors.push("Invalid evidence range");
  }
  if (fingerprint(model) !== model.snapshot.source_fingerprint)
    errors.push("Source fingerprint mismatch");
  if (model.coverage.unresolved !== model.unknowns.length)
    errors.push("Unknown count mismatch");
  if (/postgres(?:ql)?:\/\/|password\s*=/i.test(canonical(model)))
    errors.push("Credential-bearing connection string is forbidden");
  return unique(errors);
}
