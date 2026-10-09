#!/usr/bin/env node
/** Preserve decoded creator outputs while making embedded JSON safe in an HTML script. */
import { readFileSync, copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT, save, sha256 } from "./tooling.mjs";

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
  return html.slice(0, start) + encoded + html.slice(end);
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
    operation: "Escape HTML delimiters only within creator embedded JSON",
    decoded_outputs_and_grades_unchanged: true,
    original_creator_html_sha256: sha256(Buffer.from(original)),
    normalized_html_sha256: sha256(Buffer.from(normalized)),
    creator_source_modified: false,
    original_creator_html_retained: rawName,
  };
  save(join(workspace, "viewer-normalization.json"), receipt);
  console.log(JSON.stringify(receipt));
}
