import { test, expect } from "@playwright/test";

const site = "http://127.0.0.1:4173";

for (const width of [601, 700, 820, 1000, 1100]) {
  test(`Spanish documentation header stays usable at 200% text and ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("dbdep-locale", "es"));
    await page.goto(`${site}/#/docs`);
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const control of await page
      .locator(".header-inner a, .preferences button")
      .all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await page
      .locator("header")
      .getByRole("link", { name: "Docs", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  });
}

test("an oversized desktop documentation sidebar keeps keyboard-focused links in the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 768 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("dbdep-locale", "es"));
  await page.goto(`${site}/#/docs/command-reference`);
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 1500));
  const navigation = page.getByRole("navigation", {
    name: "Navegación de documentación",
  });
  const last = navigation.getByRole("link", { name: "Seguridad y límites" });
  await last.focus();
  await expect(last).toBeFocused();
  const visible = await last.evaluate((link) => {
    const box = link.getBoundingClientRect();
    const header = document.querySelector("header").getBoundingClientRect();
    const sidebar = document.querySelector(".docs-sidebar");
    return {
      aboveHeader: box.top >= header.bottom,
      withinViewport: box.bottom <= innerHeight,
      bounded: sidebar.clientHeight < sidebar.scrollHeight,
      scrolled: sidebar.scrollTop > 0,
    };
  });
  expect(visible).toEqual({
    aboveHeader: true,
    withinViewport: true,
    bounded: true,
    scrolled: true,
  });
  await page.keyboard.press("Shift+Tab");
  const focused = await page.evaluate(() => {
    const box = document.activeElement.getBoundingClientRect();
    const header = document.querySelector("header").getBoundingClientRect();
    return box.top >= header.bottom && box.bottom <= innerHeight;
  });
  expect(focused).toBe(true);
  expect(
    await page.locator(".docs-sidebar-heading").evaluate((heading) => {
      const box = heading.getBoundingClientRect();
      return Array.from(heading.children).every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.left >= box.left && rect.right <= box.right;
      });
    }),
  ).toBe(true);
});

test("the skip link focuses the current documentation page without changing its route", async ({
  page,
}) => {
  await page.goto(`${site}/#/docs/installation`);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Installation",
  );
  await expect(page).toHaveURL(`${site}/#/docs/installation`);
});

test("documentation index opens from the site and has seven usable topic cards", async ({
  page,
}) => {
  await page.goto(site);
  await page.evaluate(() => {
    window.docsSample = null;
    document.addEventListener("click", (event) => {
      if (event.target.closest("a")?.getAttribute("href") !== "#/docs") return;
      requestAnimationFrame(() => {
        window.docsSample = {
          focused: document.activeElement.id,
          hash: location.hash,
          smooth: document.documentElement.classList.contains("lenis"),
        };
      });
    });
  });
  const docs = page
    .locator("header")
    .getByRole("link", { name: "Docs", exact: true });
  await docs.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.docsSample !== null);
  expect(await page.evaluate(() => window.docsSample)).toEqual({
    focused: "docs-heading",
    hash: "#/docs",
    smooth: false,
  });
  await expect(page).toHaveURL(`${site}/#/docs`);
  await expect(
    page.getByRole("heading", { name: "Documentation", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".docs-card")).toHaveCount(7);
  await page.locator(".docs-card").filter({ hasText: "Installation" }).click();
  await expect(page).toHaveURL(`${site}/#/docs/installation`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Installation",
  );
  await expect(page.locator("main")).toContainText(
    "pnpm install --frozen-lockfile",
  );
});

test("topic links support keyboard focus, direct reload, and browser history", async ({
  page,
}) => {
  await page.goto(`${site}/#/docs/quickstart`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Quickstart",
  );
  const confidence = page
    .getByRole("navigation", { name: "Documentation navigation" })
    .getByRole("link", { name: "Evidence and confidence" });
  await confidence.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page).toHaveURL(`${site}/#/docs/confidence`);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Evidence and confidence",
  );
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Quickstart",
  );
  await page
    .locator("header")
    .getByRole("link", { name: "Examples", exact: true })
    .click();
  await expect(page.locator("#examples")).toBeFocused();
  await expect(
    page.locator("#examples").getByRole("link", { name: "Open HTML report" }),
  ).toHaveCount(3);
});

test("confidence documentation distinguishes parser grammar, catalog context, and evidence states", async ({
  page,
}) => {
  await page.goto(`${site}/#/docs/confidence`);
  const main = page.locator("main");
  await expect(main).toContainText("PostgreSQL 18 grammar");
  await expect(main).toContainText("PostgreSQL 14-18");
  for (const state of ["OBSERVED", "PARSED", "INFERRED", "UNKNOWN"])
    await expect(main).toContainText(state);
  await expect(main).toContainText("potential consumers");
  await expect(main).toContainText("source depends on or references target");
});

test("command reference uses the Node CLI and preserves review policy meanings", async ({
  page,
}) => {
  await page.goto(`${site}/#/docs/command-reference`);
  const main = page.locator("main");
  await expect(main).toContainText("pnpm dbdep inspect");
  await expect(main).toContainText("node scripts/dbdep.mjs");
  await expect(main).toContainText("snapshot");
  await expect(main).toContainText("--transaction-mode single");
  await expect(main).toContainText("Exit 3");
  await expect(main).not.toContainText("scripts/dbdep.py");
});

test("documentation has an accessible mobile contents control and keeps text within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${site}/#/docs`);
  const contents = page.getByRole("button", { name: "Browse documentation" });
  await expect(contents).toHaveAttribute("aria-expanded", "false");
  await contents.click();
  await expect(contents).toHaveAttribute("aria-expanded", "true");
  const navigation = page.getByRole("navigation", {
    name: "Documentation navigation",
  });
  await navigation.getByRole("link", { name: "Introduction" }).focus();
  await page.keyboard.press("Escape");
  await expect(contents).toHaveAttribute("aria-expanded", "false");
  await expect(contents).toBeFocused();
  await contents.click();
  await page
    .getByRole("navigation", { name: "Documentation navigation" })
    .getByRole("link", { name: "Safety and limits" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Safety and limits",
  );
  await expect(contents).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("documentation follows persistent Spanish and dark mode preferences", async ({
  page,
}) => {
  await page.goto(`${site}/#/docs/good-requests`);
  await page.getByRole("button", { name: "Español" }).click();
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Buenas peticiones",
  );
  await expect(page.locator("main")).toContainText("solo análisis");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Buenas peticiones",
  );
});

test("setup commands copy exactly and unknown topics provide a route back", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${site}/#/docs/installation`);
  await page
    .getByRole("button", { name: "Copy installation commands" })
    .click();
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).replace(
      /\r\n/g,
      "\n",
    ),
  ).toBe("pnpm install --frozen-lockfile\npnpm dbdep doctor --json");
  await page.goto(`${site}/#/docs/not-a-topic`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
  await page.getByRole("link", { name: "Back to documentation" }).click();
  await expect(page).toHaveURL(`${site}/#/docs`);
});
