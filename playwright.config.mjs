import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  expect: { timeout: 6000 },
  fullyParallel: false,
  workers: 1,
  use: {
    headless: true,
    acceptDownloads: true,
    baseURL: process.env.DBDEP_SITE_URL ?? "http://127.0.0.1:4173",
  },
  reporter: [["list"], ["json", { outputFile: "out/browser-results.json" }]],
  webServer: {
    command:
      "pnpm --filter database-dependency-migration-site preview --port 4173 --strictPort",
    url: process.env.DBDEP_SITE_URL ?? "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
