#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { resolve, relative, isAbsolute, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const site = fileURLToPath(new URL("..", import.meta.url));
export function createPreviewServer({
  built = resolve(site, "out"),
  basePath,
} = {}) {
  const root = realpathSync(built);
  if (basePath === undefined)
    basePath = JSON.parse(
      readFileSync(resolve(root, "site-config.json"), "utf8"),
    ).base_path;
  if (
    typeof basePath !== "string" ||
    (basePath && !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(basePath))
  )
    throw Error("Invalid static export base path");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return createServer((request, response) => {
    const send = (status, file) => {
      let bytes;
      try {
        bytes = readFileSync(file);
      } catch {
        bytes = Buffer.from("Not found");
      }
      response.writeHead(status, {
        "Content-Type": types[extname(file)] ?? "text/plain; charset=utf-8",
        "Content-Length": bytes.length,
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : bytes);
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://127.0.0.1").pathname,
      );
      if (pathname.includes("\\") || pathname.includes("\0"))
        throw Error("Invalid path");
      if (basePath && pathname === basePath) {
        response.writeHead(308, { Location: `${basePath}/` });
        response.end();
        return;
      }
      if (basePath && !pathname.startsWith(`${basePath}/`))
        throw Error("Outside export base path");
      let target = resolve(root, `.${pathname.slice(basePath.length)}`);
      if (statSync(target).isDirectory())
        target = resolve(target, "index.html");
      const actual = realpathSync(target),
        rel = relative(root, actual);
      if (
        !rel ||
        rel === ".." ||
        rel.startsWith(`..${sep}`) ||
        isAbsolute(rel) ||
        !statSync(actual).isFile()
      )
        throw Error("Outside static export");
      send(200, actual);
    } catch {
      send(404, resolve(root, "404.html"));
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      port: { type: "string", default: "4173" },
      strictPort: { type: "boolean" },
    },
  });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid preview port");
  const server = createPreviewServer();
  const basePath = JSON.parse(
    readFileSync(resolve(site, "out/site-config.json"), "utf8"),
  ).base_path;
  server.listen(port, "127.0.0.1", () =>
    console.log(`Static Next.js export: http://127.0.0.1:${port}${basePath}/`),
  );
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
