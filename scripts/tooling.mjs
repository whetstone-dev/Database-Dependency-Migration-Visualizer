import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { dirname, join, resolve, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { zipSync, unzipSync } from "fflate";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const VERSION = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
).version;
export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
export function files(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((e) =>
      e.isSymbolicLink()
        ? []
        : e.isDirectory()
          ? files(join(directory, e.name))
          : e.isFile()
            ? [join(directory, e.name)]
            : [],
    );
}
export function save(path, value) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
}
export function checked_remove(directory, parent) {
  const target = realpathSync(directory),
    base = realpathSync(parent),
    rel = relative(base, target);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error("Temporary directory escapes the checked parent");
  rmSync(target, { recursive: true, force: true });
}
export function archive(path, payloads) {
  const entries = {};
  for (const name of Object.keys(payloads).sort()) {
    if (name.startsWith("/") || name.split("/").includes(".."))
      throw new Error("Unsafe archive path");
    entries[name] = [
      new Uint8Array(payloads[name]),
      { level: 9, mtime: new Date(1980, 0, 1), os: 3, attrs: 0o100644 << 16 },
    ];
  }
  const bytes = zipSync(entries);
  const unpacked = unzipSync(bytes);
  for (const [name, payload] of Object.entries(payloads)) {
    if (sha256(unpacked[name]) !== sha256(payload))
      throw new Error("Archive round-trip verification failed");
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return {
    artifact: path.replaceAll("\\", "/"),
    sha256: sha256(bytes),
    members: Object.keys(entries).length,
    deterministic_zip_metadata: true,
  };
}
