import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const url = process.env.DBDEP_SITE_URL ?? "http://127.0.0.1:4173";
const directory = process.env.DBDEP_CAPTURE_DIR
  ? resolve(process.env.DBDEP_CAPTURE_DIR)
  : fileURLToPath(new URL("../screenshots/", import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const capture of [
    {
      name: "docs-desktop",
      width: 1440,
      height: 1000,
      locale: "en",
      theme: "light",
      path: "docs/",
    },
    {
      name: "docs-desktop-dark",
      width: 1440,
      height: 1000,
      locale: "en",
      theme: "dark",
      path: "docs/",
    },
    {
      name: "docs-installation",
      width: 1440,
      height: 1000,
      locale: "en",
      theme: "light",
      path: "docs/installation/",
    },
    {
      name: "docs-mobile-es-dark",
      width: 390,
      height: 844,
      locale: "es",
      theme: "dark",
      path: "docs/",
    },
  ]) {
    const context = await browser.newContext({
      viewport: { width: capture.width, height: capture.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem("dbdep-locale", locale);
      localStorage.setItem("dbdep-theme", theme);
    }, capture);
    await page.goto(`${url}/${capture.path}`);
    await page.locator("#docs-heading").waitFor();
    await page.waitForFunction(
      ({ locale, theme }) =>
        document.documentElement.lang === locale &&
        document.documentElement.dataset.theme === theme,
      capture,
    );
    await page.evaluate(() => document.fonts.ready);
    const output = resolve(directory, `${capture.name}.png`);
    await page.screenshot({ path: output, fullPage: true });
    console.log(output);
    await context.close();
  }
} finally {
  await browser.close();
}
