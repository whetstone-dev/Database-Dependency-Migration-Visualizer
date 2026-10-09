#!/usr/bin/env node
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { ROOT, save } from "./tooling.mjs";
import { createPreviewServer } from "../site/scripts/preview.mjs";
const built = join(ROOT, "site/out"),
  destination = process.env.DBDEP_CAPTURE_DIR
    ? resolve(process.env.DBDEP_CAPTURE_DIR)
    : join(ROOT, "site/screenshots");
if (!existsSync(join(built, "index.html")))
  throw new Error("Build the website before capturing it");
mkdirSync(destination, { recursive: true });
const basePath = JSON.parse(
  readFileSync(join(built, "site-config.json"), "utf8"),
).base_path;
const server = createPreviewServer({ built, basePath });
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${server.address().port}${basePath}`,
  browser = await chromium.launch(),
  captured = [];
try {
  for (const [label, width, height, locale, theme] of [
    ["desktop", 1440, 1000, "en", "light"],
    ["desktop-dark", 1440, 1000, "en", "dark"],
    ["mobile", 390, 844, "en", "light"],
    ["mobile-es-dark", 390, 844, "es", "dark"],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await page.addInitScript(
      ({ locale, theme }) => {
        localStorage.setItem("dbdep-locale", locale);
        localStorage.setItem("dbdep-theme", theme);
      },
      { locale, theme },
    );
    await page.goto(url);
    await page.locator("h1").waitFor();
    await page.waitForFunction(
      ({ locale, theme }) =>
        document.documentElement.lang === locale &&
        document.documentElement.dataset.theme === theme,
      { locale, theme },
    );
    await page.evaluate(() => document.fonts.ready);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`Horizontal overflow: ${label}`);
    for (const [suffix, full] of [
      ["hero", false],
      ["full", true],
    ]) {
      const filename = `${label}-${suffix}.png`;
      await page.screenshot({
        path: join(destination, filename),
        fullPage: full,
      });
      captured.push(filename);
    }
    await page.goto(url + "/docs/");
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const filename = `${label}-docs.png`;
    await page.screenshot({
      path: join(destination, filename),
      fullPage: true,
    });
    captured.push(filename);
    await page.close();
  }
  save(join(ROOT, "out/site-captures.json"), {
    captured,
    base_path: basePath,
    reduced_motion: true,
    self_hosted_fonts: true,
  });
  console.log(JSON.stringify({ captured }));
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
