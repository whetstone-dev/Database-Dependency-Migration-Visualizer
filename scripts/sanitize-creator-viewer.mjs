#!/usr/bin/env node
/** Preserve decoded creator outputs while making embedded JSON safe in an HTML script. */
import { readFileSync, copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT, save, sha256 } from "./tooling.mjs";

/** Asset tags are removed only from template fragments outside embedded JSON. */
function remove_external_assets(template) {
  return template
    .replace(
      /<script\b[^>]*\bsrc\s*=\s*(["'])(?:https?:)?\/\/[^"']+\1[^>]*>[\s\S]*?<\/script\s*>/gi,
      "",
    )
    .replace(
      /<link\b[^>]*\bhref\s*=\s*(["'])(?:https?:)?\/\/[^"']+\1[^>]*>/gi,
      "",
    );
}

/** Harden the known upstream renderer without rewriting any evaluation data. */
function harden_creator_renderer(source) {
  const creator = [
    "function renderOutputs",
    "function renderBenchmark",
    "function getDownloadUri",
  ];
  if (!creator.some((anchor) => source.includes(anchor))) return source;
  const marker = "// dbdep creator renderer safety v2";
  const already_hardened = source.includes(marker);
  let renderer = source.replaceAll("\r\n", "\n");
  const replace = (before, after, expected = 1) => {
    const anchor = already_hardened ? after : before;
    const count = renderer.split(anchor).length - 1;
    if (count !== expected)
      throw new Error(
        "Creator renderer changed; required safety anchor is missing",
      );
    if (!already_hardened) renderer = renderer.replaceAll(before, after);
  };
  const offline_fallback = () =>
    replace(
      "    function renderXlsx(container, b64Data) {\n",
      '    function renderXlsx(container, b64Data) {\n      if (typeof XLSX !== "object" || XLSX === null || typeof XLSX.read !== "function" || typeof XLSX.utils?.sheet_to_html !== "function") {\n        container.textContent = "Spreadsheet preview is unavailable offline. Download the workbook to view it.";\n        return;\n      }\n',
    );
  if (renderer.includes("// dbdep creator renderer safety v1")) {
    replace("// dbdep creator renderer safety v1", marker);
    offline_fallback();
    return harden_creator_renderer(renderer);
  }
  replace("function renderOutputs(run)", "function renderOutputs(run)");
  // Element-text escaping alone does not protect the benchmark's title attribute.
  replace(
    "return div.innerHTML;",
    `return div.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");`,
  );
  for (const expression of [
    "(summary.passed || 0)",
    "(summary.failed || 0)",
    "(summary.total || 0)",
    '(metadata.runs_per_configuration || "?")',
    '(delta.pass_rate || "—")',
    '(delta.tokens || "—")',
    "(r.passed || 0)",
    "(r.total || 0)",
    "(r.errors || 0)",
  ])
    replace(expression, `escapeHtml(${expression})`);
  replace(
    "html += metadata.timestamp +",
    "html += escapeHtml(metadata.timestamp) +",
  );
  replace(
    'metadata.evals_run.join(", ") +',
    'escapeHtml(metadata.evals_run.join(", ")) +',
  );
  replace('delta.time_seconds + "s"', 'escapeHtml(delta.time_seconds) + "s"');
  replace(" + configLabel + ", " + escapeHtml(configLabel) + ", 2);
  replace(" + run.run_number + ", " + escapeHtml(run.run_number) + ", 2);

  // Previews may consume only local data with the MIME type promised by their type.
  replace(
    "img.src = file.data_uri;",
    'const imageUri = creatorDataUri(file.data_uri, "image");\n          if (imageUri) img.src = imageUri;',
    2,
  );
  replace(
    "iframe.src = file.data_uri;",
    'iframe.setAttribute("sandbox", "");\n          const pdfUri = creatorDataUri(file.data_uri, "pdf");\n          if (pdfUri) iframe.src = pdfUri;',
    2,
  );
  replace("a.href = file.data_uri;", "a.href = getDownloadUri(file);", 2);
  replace(
    "if (file.data_uri) return file.data_uri;",
    "const uri = creatorDataUri(file.data_uri, file.type);\n      if (uri) return uri;",
  );
  replace(
    'if (file.data_b64) return "data:application/octet-stream;base64," + file.data_b64;',
    'if (typeof file.data_b64 === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(file.data_b64)) return "data:application/octet-stream;base64," + file.data_b64;',
  );
  replace(
    "wrapper.innerHTML = htmlStr;",
    "wrapper.replaceChildren(creatorSafeTable(htmlStr));",
  );
  offline_fallback();
  const helpers = `    ${marker}
    function creatorDataUri(uri, type) {
      if (typeof uri !== "string") return null;
      const mime = type === "image" ? "image/(?:png|jpeg|gif|webp|avif|bmp)"
        : type === "pdf" ? "application/pdf"
        : type === "binary" || type === "xlsx" ? "application/octet-stream" : null;
      return mime && new RegExp("^data:" + mime + ";base64,[A-Za-z0-9+/]+={0,2}$", "i").test(uri) ? uri : null;
    }

    // Spreadsheet HTML is a library result derived from untrusted cell content.
    // Rebuild only table elements and text, excluding links, styles, and handlers.
    function creatorSafeTable(html) {
      const template = document.createElement("template");
      template.innerHTML = html;
      const allowed = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "COLGROUP", "COL"]);
      function copy(node) {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
        const result = allowed.has(node.nodeName)
          ? document.createElement(node.nodeName.toLowerCase()) : document.createDocumentFragment();
        if (result.nodeType === Node.ELEMENT_NODE) {
          for (const name of ["colspan", "rowspan"]) {
            const value = node.getAttribute(name);
            if (/^[1-9][0-9]{0,3}$/.test(value || "")) result.setAttribute(name, value);
          }
        }
        if (!["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(node.nodeName))
          for (const child of node.childNodes) result.appendChild(copy(child));
        return result;
      }
      return copy(template.content);
    }

`;
  replace("    // ---- Util ----\n", helpers + "    // ---- Util ----\n");
  return renderer;
}

export function sanitize_creator_viewer(html) {
  const prefix = "const EMBEDDED_DATA = ";
  const marker = html.indexOf(prefix);
  const start = marker + prefix.length;
  const terminator = /;\r?\n/.exec(html.slice(start));
  const end = terminator ? start + terminator.index : -1;
  if (marker < 0 || end < start)
    throw new Error("Creator viewer data envelope is missing");
  const data = JSON.parse(html.slice(start, end));
  const encoded = JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  if (!isDeepStrictEqual(JSON.parse(encoded), data))
    throw new Error("Decoded creator data changed");
  return (
    remove_external_assets(html.slice(0, start)) +
    encoded +
    remove_external_assets(harden_creator_renderer(html.slice(end)))
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const index = process.argv.indexOf("--workspace");
  const workspace =
    index < 0
      ? join(
          dirname(ROOT),
          "database-dependency-migration-workspace",
          "iteration-2",
        )
      : resolve(process.argv[index + 1]);
  const rawIndex = process.argv.indexOf("--raw-name");
  const rawName =
    rawIndex < 0 ? "review-creator-raw.html" : process.argv[rawIndex + 1];
  if (
    typeof rawName !== "string" ||
    basename(rawName) !== rawName ||
    !rawName.endsWith(".html")
  )
    throw new Error("Creator raw viewer name must be a local HTML filename");
  const input = join(workspace, "review.html"),
    raw = join(workspace, rawName);
  if (!existsSync(raw)) copyFileSync(input, raw);
  const original = readFileSync(raw, "utf8");
  const normalized = sanitize_creator_viewer(original);
  writeFileSync(input, normalized);
  const receipt = {
    operation:
      "Escape embedded JSON delimiters, harden creator rendering and previews, and remove external template assets for offline viewing",
    decoded_outputs_and_grades_unchanged: true,
    original_creator_html_sha256: sha256(Buffer.from(original)),
    normalized_html_sha256: sha256(Buffer.from(normalized)),
    creator_source_modified: false,
    original_creator_html_retained: rawName,
  };
  save(join(workspace, "viewer-normalization.json"), receipt);
  console.log(JSON.stringify(receipt));
}
