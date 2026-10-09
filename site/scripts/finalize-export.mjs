import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizeStaticSegments } from "./normalize-segments.mjs";
const site = new URL("../", import.meta.url);
const normalized = normalizeStaticSegments(
  fileURLToPath(new URL("out/", site)),
);
const manifest = JSON.parse(
  readFileSync(new URL(".next/routes-manifest.json", site), "utf8"),
);
writeFileSync(
  new URL("out/site-config.json", site),
  JSON.stringify(
    {
      format: "dbdep-static-site/1",
      base_path: manifest.basePath,
      next: "16.4.0",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Finalized static export at ${fileURLToPath(new URL("out/", site))} with base path ${manifest.basePath || "/"}; normalized ${normalized} Windows segment paths`,
);
