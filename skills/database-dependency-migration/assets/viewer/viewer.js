"use strict";
const STATE = JSON.parse(document.getElementById("dbdep-state").textContent);
const M = STATE.model,
  NS = "http://www.w3.org/2000/svg",
  CAP = 350;
const $ = (id) => document.getElementById(id);
const nodes = new Map(M.nodes.map((n) => [n.id, n]));
const edges = new Map(M.edges.map((e) => [e.id, e]));
const evidence = new Map(M.evidence.map((e) => [e.id, e]));
const reverse = new Map();
M.edges.forEach((e) => {
  if (!reverse.has(e.target)) reverse.set(e.target, []);
  reverse.get(e.target).push(e);
});
let selected = STATE.root || null,
  zoom = 1,
  panX = 0,
  panY = 0,
  drag = null;
let locale = document.documentElement.dataset.locale === "es" ? "es" : "en";
let theme =
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
document.addEventListener("keydown", () =>
  document.body.classList.add("keyboard-mode"),
);
document.addEventListener("pointerdown", () =>
  document.body.classList.remove("keyboard-mode"),
);

function t(key, replacements = {}) {
  return COPY[locale][key].replace(/\{(\w+)\}/g, (_, token) =>
    String(replacements[token]),
  );
}
function value(type, canonical) {
  return locale === "es"
    ? SPANISH_VALUES[type]?.[canonical] || canonical
    : canonical;
}
function persist(key, preference) {
  try {
    localStorage.setItem(`dbdep-${key}`, preference);
  } catch {
    /* Preferences still work when browser storage is unavailable. */
  }
}
function el(tag, text, cls, parent) {
  const element = document.createElement(tag);
  if (text !== null) element.textContent = text;
  if (cls) element.className = cls;
  if (parent) parent.append(element);
  return element;
}
function original(tag, text, cls, parent) {
  const element = el(
    tag,
    text,
    [cls, "original-text"].filter(Boolean).join(" "),
    parent,
  );
  element.lang = "en";
  return element;
}
function svg(tag, attrs, text) {
  const element = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, v]) => element.setAttribute(key, v));
  if (text !== undefined) element.textContent = text;
  return element;
}

// One BFS predecessor per object keeps the full impact traversal linear in memory.
function reach(root) {
  const paths = new Map([[root, null]]),
    queue = [root];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of reverse.get(queue[i]) || []) {
      if (!paths.has(edge.source)) {
        paths.set(edge.source, edge.id);
        queue.push(edge.source);
      }
    }
  }
  paths.delete(root);
  return paths;
}
function pathPreview(id, paths) {
  const result = [];
  let steps = 0;
  while (paths.has(id)) {
    const edgeId = paths.get(id);
    if (result.length < 16) result.push(edgeId);
    id = edges.get(edgeId).target;
    steps++;
  }
  return { edges: result, steps };
}
function options(id, key) {
  [...new Set(M.nodes.map((node) => node[key]))].sort().forEach((v) => {
    const option = el("option", v, null, $(id));
    option.value = v;
    if (key !== "schema") option.dataset.valueType = key;
  });
}
options("schema", "schema");
options("kind", "kind");
options("status", "status");
for (const [key, label] of [
  ["nodes", "statNodes"],
  ["edges", "statEdges"],
  ["findings", "statFindings"],
  ["unknowns", "statUnknowns"],
]) {
  const stat = el("div", null, "stat", $("stats"));
  el("strong", String(STATE.summary[key]), null, stat);
  el("span", t(label), null, stat).dataset.i18n = label;
}
function transform() {
  $("scene").setAttribute(
    "transform",
    `translate(${panX},${panY}) scale(${zoom})`,
  );
}
function draw() {
  const paths = selected ? reach(selected) : new Map();
  const direct = new Set(
    (reverse.get(selected) || []).map((edge) => edge.source),
  );
  const text = $("search").value.toLowerCase(),
    depth = $("depth").value;
  const filtered = M.nodes.filter(
    (node) =>
      (!text ||
        node.qualified_name.toLowerCase().includes(text) ||
        node.id.toLowerCase().includes(text)) &&
      (!$("schema").value || node.schema === $("schema").value) &&
      (!$("kind").value || node.kind === $("kind").value) &&
      (!$("status").value || node.status === $("status").value) &&
      (depth === "all" ||
        node.id === selected ||
        (depth === "direct" ? direct.has(node.id) : paths.has(node.id))),
  );
  const shown = filtered.slice(0, CAP),
    positions = new Map();
  const schemas = [...new Set(shown.map((node) => node.schema))].sort();
  const allSchemas = [...new Set(filtered.map((node) => node.schema))].sort();
  let row = 0;
  const scene = $("scene");
  scene.replaceChildren();
  for (const schema of schemas) {
    scene.append(
      svg(
        "text",
        { x: 20, y: row * 78 + 20, class: "schema-title" },
        schema.toUpperCase(),
      ),
    );
    row++;
    const group = shown.filter((node) => node.schema === schema);
    group.forEach((node, i) =>
      positions.set(node.id, {
        x: 20 + (i % 5) * 256,
        y: (row + Math.floor(i / 5)) * 78,
      }),
    );
    row += Math.ceil(group.length / 5) + 1;
  }
  $("cap").textContent = !filtered.length
    ? t("noObjects")
    : filtered.length > CAP
      ? t("capped", {
          cap: CAP,
          total: filtered.length,
          schemas: allSchemas
            .map(
              (schema) =>
                `${schema}: ${filtered.filter((node) => node.schema === schema).length}`,
            )
            .join(", "),
        })
      : t("visible", {
          visible: shown.length,
          dependents: paths.size,
          unknowns: M.unknowns.length,
        });
  const activeEdges = new Set(paths.values());
  M.edges.forEach((edge) => {
    if (!positions.has(edge.source) || !positions.has(edge.target)) return;
    const a = positions.get(edge.source),
      b = positions.get(edge.target);
    const path = svg("path", {
      d: `M${a.x + 119},${a.y + 57} C${a.x + 119},${a.y + 90} ${b.x + 119},${b.y - 20} ${b.x + 119},${b.y}`,
      class: `edge ${edge.kind === "foreign_key" ? "fk" : edge.status === "PARSED" ? "parsed" : ""} ${activeEdges.has(edge.id) ? "active" : ""}`,
    });
    path.append(
      svg(
        "title",
        {},
        `${value("edgeKind", edge.kind)} · ${value("status", edge.status)} · ${edge.explanation}`,
      ),
    );
    scene.append(path);
  });
  const changed = new Set(
    STATE.changes
      ? [
          ...STATE.changes.added,
          ...STATE.changes.removed,
          ...STATE.changes.modified,
        ]
      : [],
  );
  shown.forEach((node) => {
    const point = positions.get(node.id);
    const group = svg("g", {
      class: `node ${node.id === selected ? "selected" : paths.has(node.id) ? "affected" : ""} ${changed.has(node.id) ? "changed" : ""}`,
      transform: `translate(${point.x},${point.y})`,
      tabindex: 0,
      role: "button",
      "aria-label": `${node.qualified_name}, ${value("kind", node.kind)}, ${value("status", node.status)}`,
      "data-id": node.id,
    });
    const label =
      node.kind === "column"
        ? `${node.parent}.${node.name}`
        : node.kind === "query"
          ? node.name.split(":ev:")[0].split("/").slice(-2).join("/")
          : node.name;
    group.append(
      svg("rect", { width: 238, height: 58, rx: 6 }),
      svg(
        "text",
        { x: 10, y: 23 },
        label.length > 27 ? label.slice(0, 24) + "…" : label,
      ),
      svg(
        "text",
        { x: 10, y: 43, class: "sub" },
        `${value("kind", node.kind)} / ${value("status", node.status)}`,
      ),
      svg("title", {}, node.qualified_name),
    );
    group.addEventListener("click", () => choose(node.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(node.id);
      }
    });
    scene.append(group);
  });
  $("graph").setAttribute("viewBox", `0 0 1300 ${Math.max(780, row * 78)}`);
  transform();
}
function choose(id) {
  selected = id;
  draw();
  inspect();
  const group = [...document.querySelectorAll(".node")].find(
    (node) => node.getAttribute("data-id") === id,
  );
  if (group) group.focus();
}
function inspect() {
  const detail = $("detail");
  detail.replaceChildren();
  el("p", t("inspector"), "eyebrow mono", detail);
  if (!selected || !nodes.has(selected)) {
    el("h2", t("selectObject"), null, detail);
    el("p", t("selectHint"), null, detail);
    return;
  }
  const node = nodes.get(selected),
    paths = reach(selected);
  el("h2", node.qualified_name, null, detail);
  el(
    "p",
    t("dependents", {
      kind: value("kind", node.kind),
      status: value("status", node.status),
      count: paths.size,
    }),
    null,
    detail,
  );
  el("p", node.id, "object-id", detail);
  for (const id of node.evidence_ids) {
    const record = evidence.get(id),
      block = el("div", null, "evidence", detail);
    el(
      "strong",
      `${value("status", record.status)} / ${value("origin", record.origin)}`,
      null,
      block,
    );
    el(
      "p",
      record.path
        ? `${record.path}:${record.line_start}–${record.line_end}`
        : `${record.query_id} · ${record.captured_at} · ${record.catalog_address || ""}`,
      null,
      block,
    );
    original("p", record.explanation, null, block);
    el("p", record.source_hash, null, block);
  }
  el("h3", t("dependencyPaths"), null, detail);
  let displayed = 0;
  for (const id of paths.keys()) {
    if (displayed++ >= 40) break;
    const preview = pathPreview(id, paths),
      block = el("div", null, "path", detail);
    const button = el("button", nodes.get(id).qualified_name, null, block);
    button.type = "button";
    button.addEventListener("click", () => choose(id));
    for (const edgeId of preview.edges) {
      const edge = edges.get(edgeId);
      el(
        "p",
        `${nodes.get(edge.source).qualified_name} → ${nodes.get(edge.target).qualified_name} (${value("edgeKind", edge.kind)}, ${value("status", edge.status)})`,
        null,
        block,
      );
      el(
        "p",
        edge.evidence_ids
          .map((id) => {
            const record = evidence.get(id);
            return record.path
              ? `${record.path}:${record.line_start}`
              : `${record.query_id} / ${record.catalog_address || ""}`;
          })
          .join("; "),
        null,
        block,
      );
    }
    if (preview.steps > 16)
      el("p", t("omittedSteps", { count: preview.steps - 16 }), null, block);
  }
  if (paths.size > 40)
    el("p", t("cappedPaths", { total: paths.size }), null, detail);
  el("h3", t("unknownCoverage"), null, detail);
  M.unknowns.forEach((unknown) =>
    original("p", unknown.explanation, "unknown", detail),
  );
}
function findings() {
  const list = $("finding-list");
  list.replaceChildren();
  const risk = $("risk").value;
  const shown = M.findings.filter(
    (finding) => !risk || finding.risk_level === risk,
  );
  for (const finding of shown) {
    const article = el("article", null, `finding ${finding.risk_level}`, list);
    el(
      "h3",
      `${finding.rule_id} · ${value("risk", finding.risk_level).toUpperCase()} · ${value("status", finding.status)}`,
      null,
      article,
    );
    original("p", finding.reason, null, article);
    original("p", finding.remediation, null, article);
    el(
      "p",
      `${finding.risk_dimensions.map((dimension) => value("dimension", dimension)).join(", ")} · ${finding.evidence_ids.join(", ")}`,
      "evidence",
      article,
    );
  }
  if (!shown.length)
    el("p", t(M.findings.length ? "noRiskFindings" : "noFindings"), null, list);
}
function coverage() {
  $("unknown-list").replaceChildren();
  M.unknowns.forEach((unknown) => {
    const paragraph = el("p", null, "unknown", $("unknown-list"));
    el("span", value("status", "UNKNOWN") + " / ", null, paragraph);
    original("span", unknown.explanation, null, paragraph);
  });
}
function changes() {
  const list = $("change-list");
  list.replaceChildren();
  if (!STATE.changes) return;
  for (const key of ["added", "removed", "modified"]) {
    el("h3", t(key), null, list);
    STATE.changes[key].forEach((id) =>
      el("p", nodes.has(id) ? nodes.get(id).qualified_name : id, null, list),
    );
  }
  STATE.changes.rename_candidates.forEach((candidate) =>
    original("p", candidate.explanation, "unknown", list),
  );
}
function sequence() {
  const list = $("phase-list");
  list.replaceChildren();
  STATE.plan.forEach((phase, i) => {
    const article = el("article", null, "phase", list);
    el("h2", `${i + 1}. ${value("phase", phase.phase)}`, null, article);
    const content = el("div", null, null, article);
    original("p", phase.action, null, content);
    for (const key of ["preconditions", "verification", "recovery"]) {
      el("h3", t(key), null, content);
      original("p", phase[key], null, content);
    }
  });
  if (!STATE.plan.length) el("p", t("noPlan"), null, list);
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  $("theme-toggle").setAttribute(
    "aria-label",
    t(theme === "light" ? "dark" : "light"),
  );
  $("theme-toggle").setAttribute("aria-pressed", String(theme === "dark"));
  $("theme-moon").toggleAttribute("hidden", theme === "dark");
  $("theme-sun").toggleAttribute("hidden", theme !== "dark");
}
function applyLocale() {
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document
    .querySelectorAll("[data-i18n-aria]")
    .forEach((element) =>
      element.setAttribute("aria-label", t(element.dataset.i18nAria)),
    );
  document
    .querySelectorAll("[data-i18n-placeholder]")
    .forEach((element) =>
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder)),
    );
  document.querySelectorAll("option[data-value-type]").forEach((option) => {
    option.textContent = value(option.dataset.valueType, option.value);
  });
  $("locale-en").setAttribute("aria-pressed", String(locale === "en"));
  $("locale-es").setAttribute("aria-pressed", String(locale === "es"));
  $("original-text-note").hidden = locale !== "es";
  applyTheme();
  const scrollTop = $("detail").scrollTop;
  draw();
  inspect();
  $("detail").scrollTop = scrollTop;
  findings();
  coverage();
  changes();
  sequence();
}
for (const language of ["en", "es"])
  $("locale-" + language).addEventListener("click", () => {
    locale = language;
    persist("locale", locale);
    applyLocale();
  });
$("theme-toggle").addEventListener("click", () => {
  theme = theme === "light" ? "dark" : "light";
  persist("theme", theme);
  applyTheme();
});

document.querySelectorAll("[data-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-tab]")
      .forEach((other) =>
        other.setAttribute("aria-pressed", String(other === button)),
      );
    for (const id of ["explorer", "findings", "sequence"])
      $(id).hidden = id !== button.dataset.tab;
  }),
);
for (const id of ["search", "schema", "kind", "status", "depth"])
  $(id).addEventListener(id === "search" ? "input" : "change", draw);
$("risk").addEventListener("change", findings);
function scale(factor) {
  zoom = Math.min(4, Math.max(0.25, zoom * factor));
  transform();
}
$("zoom-in").addEventListener("click", () => scale(1.2));
$("zoom-out").addEventListener("click", () => scale(1 / 1.2));
$("reset").addEventListener("click", () => {
  zoom = 1;
  panX = panY = 0;
  transform();
});
$("graph").addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    scale(event.deltaY < 0 ? 1.1 : 1 / 1.1);
  },
  { passive: false },
);
$("graph").addEventListener("keydown", (event) => {
  const steps = {
    ArrowLeft: [30, 0],
    ArrowRight: [-30, 0],
    ArrowUp: [0, 30],
    ArrowDown: [0, -30],
  };
  if (steps[event.key]) {
    event.preventDefault();
    panX += steps[event.key][0];
    panY += steps[event.key][1];
    transform();
  }
  if (event.key === "+" || event.key === "=") scale(1.2);
  if (event.key === "-") scale(1 / 1.2);
});
$("graph").addEventListener("pointerdown", (event) => {
  if (drag || event.target.closest(".node")) return;
  drag = [event.clientX, event.clientY, panX, panY];
  $("graph").setPointerCapture(event.pointerId);
});
$("graph").addEventListener("pointermove", (event) => {
  if (!drag) return;
  const box = $("graph").getBoundingClientRect(),
    viewBox = $("graph").viewBox.baseVal;
  panX = drag[2] + ((event.clientX - drag[0]) * viewBox.width) / box.width;
  panY = drag[3] + ((event.clientY - drag[1]) * viewBox.height) / box.height;
  transform();
});
$("graph").addEventListener("pointerup", () => {
  drag = null;
});
$("graph").addEventListener("pointercancel", () => {
  drag = null;
});
function download(name, data, type) {
  const anchor = document.createElement("a"),
    url = URL.createObjectURL(new Blob([data], { type }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("export-json").addEventListener("click", () =>
  download("model.dbdep.json", JSON.stringify(M, null, 2), "application/json"),
);
$("export-svg").addEventListener("click", () => {
  const clone = $("graph").cloneNode(true);
  clone.setAttribute("xmlns", NS);
  // The SVG needs its own preference: it no longer inherits the HTML root palette.
  clone.setAttribute("data-theme", theme);
  clone.setAttribute("lang", locale);
  clone.removeAttribute("tabindex");
  clone.removeAttribute("data-i18n-aria");
  clone.prepend(
    svg("rect", { width: "100%", height: "100%", class: "export-background" }),
  );
  clone.prepend(svg("style", {}, document.querySelector("style").textContent));
  download(
    "dependencies.svg",
    new XMLSerializer().serializeToString(clone),
    "image/svg+xml",
  );
});
applyLocale();
