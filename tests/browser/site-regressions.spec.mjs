import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";

const site = "http://127.0.0.1:4173";
const slugs = ["ecommerce", "analytics", "high-traffic"];

for (const [viewport, reduced] of [
  [{ width: 1440, height: 1000 }, "no-preference"],
  [{ width: 390, height: 844 }, "reduce"],
]) {
  test(`reports, keyboard navigation, and layout at ${viewport.width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      reducedMotion: reduced,
    });
    const page = await context.newPage();
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(site);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Before you",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("iframe")).toHaveCount(0);
    const links = page
      .locator("#examples")
      .getByRole("link", { name: "Open HTML report" });
    for (const [index, slug] of slugs.entries()) {
      await expect(links.nth(index)).toHaveAttribute(
        "href",
        `./demos/${slug}/report.html`,
      );
      const report = await context.newPage();
      await report.goto(`${site}/demos/${slug}/report.html`);
      const model = JSON.parse(
        await readFile(
          new URL(
            `../../examples/rendered/${slug}/model.dbdep.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await expect(report.locator(".node")).toHaveCount(model.nodes.length);
      if (slug === "high-traffic") {
        await report.locator("[data-tab=findings]").click();
        await expect(report.locator("#finding-list")).toContainText("DDM006");
        await report.locator("[data-tab=sequence]").click();
        await expect(report.locator(".phase")).toHaveCount(5);
      }
      if (slug === "ecommerce" && viewport.width > 760) {
        const downloading = report.waitForEvent("download");
        await report.locator("#export-json").click();
        const download = await downloading;
        expect(
          JSON.parse(await readFile(await download.path(), "utf8")),
        ).toEqual(model);
      }
      await report.close();
    }
    expect(requests.every((url) => url.startsWith(site))).toBe(true);
    if (reduced === "reduce") {
      expect(
        await page
          .locator("html")
          .evaluate((el) => el.classList.contains("lenis")),
      ).toBe(false);
      await expect(page.locator(".dot-grid--static")).toHaveCount(1);
      expect(
        await page
          .locator(".button-primary")
          .first()
          .evaluate((el) => getComputedStyle(el).transitionDuration),
      ).toBe("0s");
    } else
      expect(
        await page
          .locator("html")
          .evaluate((el) => el.classList.contains("lenis")),
      ).toBe(true);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test("theme and language preferences persist", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(site);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Antes de migrar",
  );
  await expect(page.locator("header")).toContainText("Ejemplos");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("hover and focus highlight the corresponding dependency trace", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(site);
  for (let index = 0; index < 3; index++) {
    const node = page.locator(".graph-node").nth(index);
    await node.hover();
    await expect(page.locator('.trace[data-active="true"]')).toHaveCount(1);
    await expect(page.locator(".trace").nth(index)).toHaveAttribute(
      "data-active",
      "true",
    );
    await node.focus();
    await expect(page.locator(".trace").nth(index)).toHaveAttribute(
      "data-active",
      "true",
    );
  }
  await page.locator(".graph-root").focus();
  await expect(page.locator('.trace[data-active="true"]')).toHaveCount(3);
});

test("examples open reports separately and the workflow explains the pipeline", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(site);
  await expect(page.locator("iframe")).toHaveCount(0);
  const links = page
    .locator("#examples")
    .getByRole("link", { name: "Open HTML report" });
  await expect(links).toHaveCount(3);
  for (const [index, slug] of slugs.entries()) {
    await expect(links.nth(index)).toHaveAttribute(
      "href",
      `./demos/${slug}/report.html`,
    );
    await expect(links.nth(index)).toHaveAttribute("target", "_blank");
    const response = await page.request.get(
      `${site}/demos/${slug}/report.html`,
    );
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain("Content-Security-Policy");
  }
  await expect(page.locator('.flow-stage[data-on="true"]')).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Replay the flow" }),
  ).toBeVisible();
});

test("clipboard feedback and live reduced-motion changes work", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(site);
  const copy = page.getByRole("button", { name: "Copy pnpm install command" });
  await copy.click();
  await expect(copy).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "pnpm install --frozen-lockfile",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".dot-grid--static")).toHaveCount(1);
  expect(
    await page.locator("html").evaluate((el) => el.classList.contains("lenis")),
  ).toBe(false);
});

for (const reduced of ["no-preference", "reduce"]) {
  test(`keyboard fragment navigation arrives in one frame with ${reduced}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: reduced });
    await page.goto(site);
    await page.evaluate(() => {
      window.anchorSample = null;
      document.addEventListener("click", (event) => {
        if (event.target.closest("a")?.getAttribute("href") !== "#examples")
          return;
        requestAnimationFrame(() => {
          window.anchorSample = {
            detail: event.detail,
            top: document.querySelector("#examples").getBoundingClientRect()
              .top,
            hash: location.hash,
            focused: document.activeElement.id,
          };
        });
      });
    });
    await page
      .locator("header")
      .getByRole("link", { name: "Examples", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.anchorSample !== null);
    const sample = await page.evaluate(() => window.anchorSample);
    expect(sample.detail).toBe(0);
    expect(Math.abs(sample.top)).toBeLessThanOrEqual(2);
    expect(sample.hash).toBe("#examples");
    expect(sample.focused).toBe("examples");
    await page.keyboard.press("Tab");
    await expect(
      page
        .locator("#examples")
        .getByRole("link", { name: "Open HTML report" })
        .first(),
    ).toBeFocused();
  });
}

test("pointer anchors keep smooth scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(site);
  await page.evaluate(() => {
    window.pointerSample = null;
    document.addEventListener("click", (event) => {
      if (event.target.closest("a")?.getAttribute("href") !== "#examples")
        return;
      requestAnimationFrame(() => {
        window.pointerSample = {
          detail: event.detail,
          top: document.querySelector("#examples").getBoundingClientRect().top,
        };
      });
    });
  });
  await page
    .locator("header")
    .getByRole("link", { name: "Examples", exact: true })
    .click();
  await page.waitForFunction(() => window.pointerSample !== null);
  const sample = await page.evaluate(() => window.pointerSample);
  expect(sample.detail).toBe(1);
  expect(sample.top).toBeGreaterThan(100);
  await page.waitForFunction(
    () =>
      Math.abs(
        document.querySelector("#examples").getBoundingClientRect().top,
      ) < 2,
  );
  await expect(page).toHaveURL(`${site}/#examples`);
  await expect(page.locator("#examples")).toBeFocused();
});

test("keyboard focus resets the magnetic action in one frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(site);
  const action = page.locator(".hero-actions .button-primary");
  const magnet = action.locator("..");
  const box = await action.boundingBox();
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
  await page.waitForFunction(
    (el) => new DOMMatrix(getComputedStyle(el).transform).m41 > 5,
    await magnet.elementHandle(),
  );
  await page
    .locator("header")
    .getByRole("link", { name: "GitHub", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(action).toBeFocused();
  const sample = await magnet.evaluate(
    (el) =>
      new Promise((resolve) =>
        requestAnimationFrame(() =>
          resolve({
            x: new DOMMatrix(getComputedStyle(el).transform).m41,
            y: new DOMMatrix(getComputedStyle(el).transform).m42,
            duration: getComputedStyle(el).transitionDuration,
          }),
        ),
      ),
  );
  expect(sample).toEqual({ x: 0, y: 0, duration: "0s" });
});

test("the build retains every dependency notice and license byte", async ({
  page,
}) => {
  await page.goto(site);
  const notices = page.getByRole("link", { name: "Third-party notices" });
  await expect(notices).toHaveCount(1);
  const response = await page.request.get(
    site + (await notices.getAttribute("href")).slice(1),
  );
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain(
    "d86fccbd477786f94ca7eb891fbe0ec039d3cd3b",
  );
  for (const filename of await readdir(
    new URL("../../site/licenses/", import.meta.url),
  )) {
    const license = await page.request.get(`${site}/licenses/${filename}`);
    expect(license.ok()).toBe(true);
    expect(await license.body()).toEqual(
      await readFile(
        new URL(`../../site/licenses/${filename}`, import.meta.url),
      ),
    );
  }
});

for (const [locale, theme, width] of [
  ["en", "light", 320],
  ["es", "dark", 320],
  ["es", "light", 768],
]) {
  test(`localized layout and touch traces in ${locale}, ${theme}, ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.addInitScript(
      ({ locale, theme }) => {
        localStorage.setItem("dbdep-locale", locale);
        localStorage.setItem("dbdep-theme", theme);
      },
      { locale, theme },
    );
    await page.goto(site);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const control of await page.locator(".preferences button").all()) {
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator(".graph-node").nth(1).tap();
    await expect(page.locator(".trace").nth(1)).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(page.locator('.trace[data-active="true"]')).toHaveCount(1);
    await expect(page.locator(".trace-caption")).toContainText(
      "addresses.customer_id",
    );
    await expect(page.locator(".graph-node").nth(1)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await context.close();
  });
}

test("preferences survive unavailable storage and respect the system theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(site);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Español" }).click();
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  expect(errors).toEqual([]);
});

test("the flow supports pointer replay and immediate keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(site);
  await page
    .locator("header")
    .getByRole("link", { name: "How it works" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".flow-wrapper")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await expect(page.locator('.flow-stage[data-on="true"]')).toHaveCount(4);
  const replay = page.getByRole("button", { name: "Replay the flow" });
  await replay.click();
  await expect(page.locator(".flow-wrapper")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await expect(page.locator('.flow-stage[data-on="true"]')).toHaveCount(4);
  await expect(page.locator(".flow-wrapper")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await replay.focus();
  await replay.press("Enter");
  await expect(page.locator(".flow-wrapper")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await expect(page.locator('.flow-stage[data-on="true"]')).toHaveCount(4);
  await page.getByRole("button", { name: "Español" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  expect(
    await page
      .locator("#workflow .section-head")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
});

test("native keyboard scrolling does not animate sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(site);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.keyboardMotion = [];
    window.watchKeyboard = false;
    const sample = () => {
      if (window.watchKeyboard)
        for (const el of document.querySelectorAll("[data-reveal]")) {
          const box = el.getBoundingClientRect();
          if (
            box.top < innerHeight &&
            box.bottom > 0 &&
            Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) > 0.05
          )
            window.keyboardMotion.push(el.className);
        }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.keyboard.press("PageDown");
  await page.evaluate(() => (window.watchKeyboard = true));
  await page.waitForTimeout(500);
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.keyboardMotion)).toEqual([]);
});

for (const touch of [false, true]) {
  test(`the dot background stops drawing when idle or offscreen, touch=${touch}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: touch ? 390 : 1440, height: 844 },
      hasTouch: touch,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.canvasDraws = 0;
      const original = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        window.canvasDraws++;
        return original.apply(this, args);
      };
    });
    await page.goto(site);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.evaluate(() => (window.canvasDraws = 0));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.canvasDraws)).toBeLessThanOrEqual(
      1,
    );
    await page
      .locator("header")
      .getByRole("link", { name: "Install", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await page.evaluate(() => (window.canvasDraws = 0));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.canvasDraws)).toBe(0);
    if (touch) await expect(page.locator(".dot-grid--static")).toHaveCount(1);
    await context.close();
  });
}

for (const locale of ["en", "es"]) {
  test(`the impact diagram grows with enlarged ${locale} text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(
      (locale) => localStorage.setItem("dbdep-locale", locale),
      locale,
    );
    await page.goto(site);
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    await page.evaluate(() => document.fonts.ready);
    for (const node of await page.locator(".graph-root, .graph-node").all()) {
      const graph = await page.locator(".specimen").boundingBox();
      const box = await node.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(graph.x);
      expect(box.x + box.width).toBeLessThanOrEqual(graph.x + graph.width);
      const contained = await node.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return Array.from(
          el.querySelectorAll("strong, .node-kind, .node-meta"),
        ).every((child) => {
          const text = child.getBoundingClientRect();
          return (
            text.top >= box.top &&
            text.bottom <= box.bottom &&
            text.left >= box.left &&
            text.right <= box.right
          );
        });
      });
      expect(contained).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
