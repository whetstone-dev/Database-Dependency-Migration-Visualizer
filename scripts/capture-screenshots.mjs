#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./tooling.mjs";
const browser = await chromium.launch();
try {
  for (const name of ["ecommerce", "analytics", "high-traffic"]) {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1080 },
      reducedMotion: "reduce",
    });
    await page.goto(
      pathToFileURL(join(ROOT, "examples/rendered", name, "report.html")).href,
    );
    await page.evaluate(() => document.fonts.ready);
    if (name === "high-traffic")
      await page.locator('[data-tab="findings"]').click();
    else await page.locator("#depth").selectOption("transitive");
    await page.screenshot({
      path: join(ROOT, "examples/rendered", name, "screenshot.png"),
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
