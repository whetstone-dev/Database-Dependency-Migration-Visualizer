#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, relative, extname, sep, isAbsolute } from "node:path";
import { chromium } from "@playwright/test";
import { ROOT, save } from "./tooling.mjs";
const built = join(ROOT, "site/dist"),
  destination = join(ROOT, "site/screenshots");
if (!existsSync(join(built, "index.html")))
  throw new Error("Build the website before capturing it");
mkdirSync(destination, { recursive: true });
const server = createServer((request, response) => {
  const path = resolve(
      built,
      "." +
        decodeURIComponent(new URL(request.url, "http://localhost").pathname),
    ),
    rel = relative(built, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    response.writeHead(403);
    response.end();
    return;
  }
  const target =
    existsSync(path) && extname(path) ? path : join(built, "index.html");
  const mime =
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".woff2": "font/woff2",
      ".png": "image/png",
    }[extname(target)] ?? "text/plain";
  try {
    response.writeHead(200, { "Content-Type": mime });
    response.end(readFileSync(target));
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${server.address().port}`,
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
    await page.goto(url + "/#/docs");
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
    reduced_motion: true,
    self_hosted_fonts: true,
  });
  console.log(JSON.stringify({ captured }));
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
