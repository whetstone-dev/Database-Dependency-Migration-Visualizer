/** Reverse dependencies, bounded identity resolution and snapshot comparison. */
import { statements } from "./sql.mjs";
import { canonical, compare } from "./model.mjs";
import { assess_operation } from "./rules.mjs";

export function select(model, selector) {
  const direct = model.nodes.find((n) => n.id === selector);
  if (direct) return direct;
  let names;
  try {
    const stmts = statements("SELECT " + selector),
      body = stmts[0].stmt.SelectStmt;
    const fields = body.targetList[0].ResTarget.val.ColumnRef.fields;
    names = fields.map((f) => {
      if (!f.String) throw new Error();
      return f.String.sval;
    });
    if (
      stmts.length !== 1 ||
      body.targetList.length !== 1 ||
      names.length < 1 ||
      names.length > 3 ||
      Object.keys(body).some(
        (k) => !["targetList", "limitOption", "op"].includes(k),
      )
    )
      throw new Error();
  } catch {
    throw new Error(
      "Malformed selector; use schema.table.column or a stable node ID",
    );
  }
  const matches = model.nodes.filter((n) => {
    const parts = [n.schema, ...(n.parent ? [n.parent] : []), n.name];
    return (
      parts.length >= names.length &&
      parts.slice(-names.length).every((v, i) => v === names[i])
    );
  });
  if (matches.length !== 1)
    throw new Error(
      "Object selector is ambiguous or absent; use a stable node ID",
    );
  return matches[0];
}
export function impact(model, selector, operation = null, to = null) {
  const root = select(model, selector).id,
    reverse = new Map();
  for (const e of model.edges) {
    if (!reverse.has(e.target)) reverse.set(e.target, []);
    reverse.get(e.target).push(e);
  }
  const paths = new Map([[root, []]]),
    queue = [root];
  for (let index = 0; index < queue.length; index++) {
    const target = queue[index];
    for (const e of (reverse.get(target) ?? []).sort((a, b) =>
      compare(a.id, b.id),
    ))
      if (!paths.has(e.source)) {
        paths.set(e.source, [e.id, ...paths.get(target)]);
        queue.push(e.source);
      }
  }
  const affected = [...paths.keys()].filter((k) => k !== root).sort(compare),
    direct = [...new Set((reverse.get(root) ?? []).map((e) => e.source))]
      .filter((k) => k !== root)
      .sort(compare);
  const categories = {
      recorded_catalog: [],
      static_reference: [],
      inferred: [],
    },
    byEdge = new Map(model.edges.map((e) => [e.id, e]));
  for (const n of affected) {
    const statuses = new Set(paths.get(n).map((e) => byEdge.get(e).status));
    const category =
      statuses.has("INFERRED") || statuses.has("UNKNOWN")
        ? "inferred"
        : statuses.has("PARSED")
          ? "static_reference"
          : "recorded_catalog";
    categories[category].push(n);
  }
  const result = {
    root,
    operation,
    to,
    direct,
    affected,
    paths: Object.fromEntries(
      [...paths.entries()]
        .filter(([k]) => k !== root)
        .sort(([a], [b]) => compare(a, b)),
    ),
    categories,
    unknowns: model.unknowns,
    explanation:
      "Reverse paths show potential impact. They do not prove execution failure or exhaustive runtime coverage.",
  };
  if (operation)
    Object.assign(
      result,
      assess_operation(model, select(model, selector), operation, to),
    );
  return result;
}
export function diff(before, after) {
  const bn = new Map(before.nodes.map((n) => [n.id, n])),
    an = new Map(after.nodes.map((n) => [n.id, n]));
  const added = [...an.keys()].filter((k) => !bn.has(k)).sort(compare),
    removed = [...bn.keys()].filter((k) => !an.has(k)).sort(compare);
  const comparable = (n) => ({
    ...Object.fromEntries(
      Object.entries(n).filter(
        ([k]) =>
          ![
            "evidence_ids",
            "status",
            "origin",
            "confidence",
            "properties",
          ].includes(k),
      ),
    ),
    properties: Object.fromEntries(
      Object.entries(n.properties).filter(
        ([k]) =>
          !["oid", "catalog_address", "reltuples", "relpages"].includes(k),
      ),
    ),
  });
  const matched = [...bn.keys()].filter((k) => an.has(k)).sort(compare),
    modified = matched.filter(
      (k) =>
        canonical(comparable(bn.get(k))) !== canonical(comparable(an.get(k))),
    );
  const edgeKey = (e) =>
    canonical([
      e.source,
      e.target,
      e.kind,
      Object.fromEntries(
        Object.entries(e.properties).filter(([k]) => k !== "catalog_address"),
      ),
    ]);
  const be = new Map(before.edges.map((e) => [edgeKey(e), e.id])),
    ae = new Map(after.edges.map((e) => [edgeKey(e), e.id])),
    candidates = [];
  for (const r of removed)
    for (const a of added) {
      const old = bn.get(r),
        next = an.get(a);
      if (
        old.kind === "column" &&
        next.kind === "column" &&
        old.schema === next.schema &&
        old.parent === next.parent &&
        old.properties.type === next.properties.type
      )
        candidates.push({
          removed: r,
          added: a,
          status: "UNKNOWN",
          explanation:
            "Possible rename; add/drop remains the observed change. Human confirmation required.",
        });
    }
  return {
    schema_version: "1.0.0",
    before: before.snapshot.id,
    after: after.snapshot.id,
    added,
    removed,
    modified,
    matched,
    edges_added: [...ae.keys()]
      .filter((k) => !be.has(k))
      .map((k) => ae.get(k))
      .sort(compare),
    edges_removed: [...be.keys()]
      .filter((k) => !ae.has(k))
      .map((k) => be.get(k))
      .sort(compare),
    rename_candidates: candidates,
  };
}
