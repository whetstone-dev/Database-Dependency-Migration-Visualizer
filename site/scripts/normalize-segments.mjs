import {
  readdirSync,
  realpathSync,
  existsSync,
  renameSync,
  rmdirSync,
} from "node:fs";
import { resolve, relative, sep, isAbsolute, dirname } from "node:path";

// Next.js 16.4 writes nested segment filenames on Windows while its router
// requests dot-separated names. Linux already emits the requested filenames.
// https://github.com/vercel/next.js/issues/92339
export function normalizeStaticSegments(built) {
  const root = realpathSync(built),
    moves = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink())
        throw Error("Static export contains a symbolic link");
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!entry.isFile())
        throw Error("Static export contains a non-regular file");
      const parts = relative(root, path).split(sep),
        index = parts.findIndex((p) => p.startsWith("__next."));
      if (index < 0 || index === parts.length - 1) continue;
      const tail = parts.slice(index);
      if (
        !tail.every((p) => /^[A-Za-z0-9_.$-]+$/.test(p)) ||
        !tail.at(-1).endsWith(".txt")
      )
        throw Error("Unexpected nested static segment path");
      const target = resolve(root, ...parts.slice(0, index), tail.join("."));
      const rel = relative(root, target);
      if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
        throw Error("Static segment path escapes export");
      moves.push({ path, target });
    }
  }
  visit(root);
  const targets = new Set();
  for (const { target } of moves) {
    if (existsSync(target) || targets.has(target))
      throw Error("Static segment filename collision");
    targets.add(target);
  }
  for (const { path, target } of moves) renameSync(path, target);
  const directories = new Set(moves.map(({ path }) => dirname(path)));
  for (const directory of directories) {
    if (!existsSync(directory)) continue;
    let current = directory;
    while (current !== root && readdirSync(current).length === 0) {
      const rel = relative(root, current);
      if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
        throw Error("Directory escapes export");
      rmdirSync(current);
      current = dirname(current);
    }
  }
  return moves.length;
}
