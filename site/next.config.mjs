import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
if (basePath && !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(basePath))
  throw new Error(
    "NEXT_PUBLIC_BASE_PATH must be an absolute path without a trailing slash",
  );

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  turbopack: { root: resolve(fileURLToPath(new URL("..", import.meta.url))) },
};
