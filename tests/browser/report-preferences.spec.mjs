import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const fixture = (name) =>
  new URL(`../../examples/rendered/${name}/`, import.meta.url);
let directory, reportUrl, model, review, largeUrl, unsafeUrl;

test.beforeAll(async () => {
  const { render } = await import("../../src/dbdep/reports.mjs");
  model = JSON.parse(
    await readFile(
      new URL("model.dbdep.json", fixture("high-traffic")),
      "utf8",
    ),
  );
  review = JSON.parse(
    await readFile(new URL("review.json", fixture("high-traffic")), "utf8"),
  );
  directory = await mkdtemp(join(tmpdir(), "dbdep-report-browser-"));
  const root = model.nodes.find(
    (n) => n.qualified_name === "public.customers.id",
  ).id;
  const report = join(directory, "report.html");
  await writeFile(report, render(model, review, null, root));
  reportUrl = pathToFileURL(report).href;

  const large = structuredClone(model);
  const baseNode = model.nodes.find((n) => n.kind === "table");
  const baseEdge =
    model.edges.find((e) => e.kind === "query_reference") || model.edges[0];
  large.nodes = Array.from({ length: 1000 }, (_, i) => ({
    ...baseNode,
    id: `large-node-${i}`,
    schema: i < 900 ? "public" : "sales",
    name: `t${String(i).padStart(4, "0")}`,
    qualified_name: `${i < 900 ? "public" : "sales"}.t${String(i).padStart(4, "0")}`,
  }));
  large.edges = large.nodes.slice(1).map((n, i) => ({
    ...baseEdge,
    id: `large-edge-${i}`,
    source: n.id,
    target: large.nodes[i].id,
  }));
  large.findings = [];
  large.unknowns = [];
  large.coverage.unresolved = 0;
  const largeReport = join(directory, "large.html");
  await writeFile(largeReport, render(large, null, null, large.nodes[0].id));
  largeUrl = pathToFileURL(largeReport).href;

  const unsafe = structuredClone(model);
  const unsafeNode = unsafe.nodes[0];
  unsafe.evidence.find((e) => e.id === unsafeNode.evidence_ids[0]).explanation =
    '</script><img src="https://invalid.example/x" onerror="window.reportInjected=true">';
  const unsafeReport = join(directory, "unsafe.html");
  await writeFile(unsafeReport, render(unsafe, null, null, unsafeNode.id));
  unsafeUrl = pathToFileURL(unsafeReport).href;
});

test.afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

for (const locale of ["en", "es"])
  for (const theme of ["light", "dark"]) {
    test(`standalone report restores ${locale} and ${theme} before displaying its controls`, async ({
      page,
    }) => {
      const requests = [],
        errors = [];
      page.on("request", (request) => requests.push(request.url()));
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem("dbdep-locale", locale);
          localStorage.setItem("dbdep-theme", theme);
          new MutationObserver(() => {
            if (
              document.querySelector("head style") &&
              !window.reportThemeAtStyles
            ) {
              window.reportThemeAtStyles =
                document.documentElement.dataset.theme;
            }
          }).observe(document, { childList: true, subtree: true });
        },
        { locale, theme },
      );
      await page.goto(reportUrl);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.evaluate(() => window.reportThemeAtStyles)).toBe(theme);
      await expect(
        page.getByRole("button", {
          name: locale === "en" ? "English" : "Español",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator('[data-tab="explorer"]')).toContainText(
        locale === "en" ? "Explorer" : "Explorador",
      );
      await expect(page.locator('#schema option[value=""]')).toHaveText(
        locale === "en" ? "All schemas" : "Todos los esquemas",
      );
      await expect(page.locator('#kind option[value="table"]')).toHaveText(
        locale === "en" ? "table" : "tabla",
      );
      await expect(page.locator("#cap")).toContainText(
        locale === "en" ? "visible objects" : "objetos visibles",
      );
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        theme === "light" ? "rgb(248, 250, 252)" : "rgb(16, 20, 28)",
      );
      expect(
        await page.evaluate(() =>
          document.fonts.check('16px "Archivo Variable"'),
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      expect(requests.every((url) => /^(file:|data:)/.test(url))).toBe(true);
    });
  }

test("English is the default and theme follows the system until explicitly chosen", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(reportUrl);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  expect(
    await page.evaluate(() => [
      localStorage.getItem("dbdep-theme"),
      localStorage.getItem("dbdep-locale"),
    ]),
  ).toEqual(["light", "es"]);
  // Remove the initialization script by loading the same file in a new page in this context.
  const reloaded = await page.context().newPage();
  await reloaded.goto(reportUrl);
  await expect(reloaded.locator("html")).toHaveAttribute("lang", "es");
  await expect(reloaded.locator("html")).toHaveAttribute("data-theme", "light");
  await reloaded.close();
});

test("preferences remain usable when browser storage throws", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.goto(reportUrl);
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const before = await page.locator("html").getAttribute("data-theme");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    before === "light" ? "dark" : "light",
  );
  expect(errors).toEqual([]);
});

test("graph selection, depth filters, panning, and keyboard tabs remain instant", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(reportUrl);
  await expect(page.locator(".node")).toHaveCount(model.nodes.length);
  await page
    .locator('.node[aria-label="public.customer_summary, view, PARSED"]')
    .press("Enter");
  const selected = model.nodes.find(
    (node) => node.qualified_name === "public.customer_summary",
  );
  await expect(page.locator("#detail h2")).toHaveText(selected.qualified_name);
  await expect(page.locator(".node.selected")).toHaveAttribute(
    "data-id",
    selected.id,
  );
  await page.locator("#depth").selectOption("direct");
  const direct = new Set(
    model.edges
      .filter((edge) => edge.target === selected.id)
      .map((edge) => edge.source),
  );
  direct.add(selected.id);
  await expect(page.locator(".node")).toHaveCount(direct.size);
  await page.locator("#graph").press("ArrowRight");
  await expect(page.locator("#scene")).toHaveAttribute(
    "transform",
    "translate(-30,0) scale(1)",
  );
  await page.locator("#zoom-in").press("Enter");
  await expect(page.locator("#scene")).toHaveAttribute(
    "transform",
    "translate(-30,0) scale(1.2)",
  );
  await expect(page.locator("#zoom-in")).toHaveCSS("transition-duration", "0s");
  await page.locator("#reset").press("Enter");
  await expect(page.locator("#scene")).toHaveAttribute(
    "transform",
    "translate(0,0) scale(1)",
  );
  await page.locator('[data-tab="findings"]').press("Enter");
  await expect(page.locator("#findings")).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test("locale changes preserve selection, filters, viewport, active tab, and original model export", async ({
  page,
}) => {
  await page.goto(reportUrl);
  await page.locator("#schema").selectOption("public");
  await page.locator("#depth").selectOption("transitive");
  await page.locator("#search").fill("customer");
  await page.locator("#zoom-in").click();
  const selection = await page
    .locator(".node.selected")
    .getAttribute("data-id");
  const transform = await page.locator("#scene").getAttribute("transform");
  const ids = await page
    .locator(".node")
    .evaluateAll((elements) => elements.map((e) => e.dataset.id));
  await page.locator('[data-tab="findings"]').click();
  await page.locator("#risk").selectOption("high");
  const evidenceText = model.findings.find(
    (f) => f.risk_level === "high",
  ).reason;
  await expect(page.locator("#finding-list")).toContainText(evidenceText);
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator('[data-tab="findings"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#risk")).toHaveValue("high");
  await expect(page.locator("#finding-list")).toContainText(evidenceText);
  await expect(page.locator("#original-text-note")).toBeVisible();
  await expect(page.locator("#original-text-note")).toContainText(
    "inglés original",
  );
  await expect(page.locator("#schema")).toHaveValue("public");
  await expect(page.locator("#depth")).toHaveValue("transitive");
  await expect(page.locator("#search")).toHaveValue("customer");
  await expect(page.locator(".node.selected")).toHaveAttribute(
    "data-id",
    selection,
  );
  await expect(page.locator("#scene")).toHaveAttribute("transform", transform);
  expect(
    await page
      .locator(".node")
      .evaluateAll((elements) => elements.map((e) => e.dataset.id)),
  ).toEqual(ids);
  await page.locator('[data-tab="sequence"]').click();
  await expect(page.locator(".phase")).toHaveCount(review.plan.length);
  await expect(page.locator("#phase-list")).toContainText(
    review.plan[0].action,
  );
  await expect(page.locator("#phase-list")).toContainText(
    "Condiciones previas",
  );
  await page.locator('[data-tab="explorer"]').click();
  const downloaded = page.waitForEvent("download");
  await page.locator("#export-json").click();
  const download = await downloaded;
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(
    model,
  );
});

for (const theme of ["light", "dark"]) {
  test(`SVG export retains the ${theme} report palette`, async ({
    page,
    browser,
  }) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("dbdep-theme", theme),
      theme,
    );
    await page.goto(reportUrl);
    const downloading = page.waitForEvent("download");
    await page.locator("#export-svg").click();
    const download = await downloading;
    const path = join(directory, `dependencies-${theme}.svg`);
    await download.saveAs(path);
    const exported = await readFile(path, "utf8");
    expect(exported).toContain(`data-theme="${theme}"`);
    const context = await browser.newContext();
    const svgPage = await context.newPage();
    await svgPage.goto(pathToFileURL(path).href);
    await expect(svgPage.locator(".node.selected rect")).toHaveCSS(
      "fill",
      theme === "light" ? "rgb(237, 242, 255)" : "rgb(32, 46, 76)",
    );
    await expect(svgPage.locator(".node text").first()).toHaveCSS(
      "fill",
      theme === "light" ? "rgb(24, 35, 49)" : "rgb(237, 241, 248)",
    );
    await context.close();
  });
}

test("mobile controls and 200 percent text fit without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(reportUrl);
  await page.getByRole("button", { name: "Español", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#search")).toHaveCSS("font-size", "16px");
  const undersized = await page
    .locator("button:visible, input:visible, select:visible")
    .evaluateAll((elements) =>
      elements
        .filter((e) => e.getBoundingClientRect().height < 44)
        .map((e) => e.id || e.textContent),
    );
  expect(undersized).toEqual([]);
  await page.locator("#zoom-in").focus();
  await expect(page.locator("#zoom-in")).toHaveCSS("transition-duration", "0s");
  await page.locator('[data-tab="findings"]').press("Enter");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('[data-tab="explorer"]').click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("large graphs preserve the 350 object and 40 path caps in both languages", async ({
  page,
}) => {
  await page.goto(largeUrl);
  await expect(page.locator(".node")).toHaveCount(350);
  await expect(page.locator(".path")).toHaveCount(40);
  await expect(page.locator("#cap")).toContainText("sales: 100");
  await expect(page.locator("#detail")).toContainText(
    "Showing 40 of 999 paths",
  );
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator(".node")).toHaveCount(350);
  await expect(page.locator(".path")).toHaveCount(40);
  await expect(page.locator("#detail")).toContainText(
    "Se muestran 40 de 999 rutas",
  );
  await page.locator("#search").fill("t0999");
  await page.locator(".node").press("Enter");
  await expect(page.locator("#detail h2")).toHaveText("sales.t0999");
  await page.locator("#search").fill("absent");
  await expect(page.locator("#cap")).toContainText(
    "No hay objetos coincidentes",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(document.getElementById("dbdep-state").textContent).model
          .nodes.length,
    ),
  ).toBe(1000);
});

test("original evidence is text and cannot create markup or offline network requests", async ({
  page,
}) => {
  const requests = [],
    errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(unsafeUrl);
  await expect(page.locator("#detail")).toContainText(
    '</script><img src="https://invalid.example/x"',
  );
  expect(await page.evaluate(() => window.reportInjected)).toBeUndefined();
  await expect(page.locator("#detail img")).toHaveCount(0);
  expect(requests.every((url) => /^(file:|data:)/.test(url))).toBe(true);
  expect(errors).toEqual([]);
});

test("frequent pointer tab changes stay immediate and do not restart fading", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(reportUrl);
  for (const tab of ["findings", "sequence", "explorer", "findings"]) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await expect(page.locator(`#${tab}`)).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) =>
              a.effect?.target?.matches("#explorer, #findings, #sequence"),
            ).length,
      ),
    ).toBe(0);
  }
});
