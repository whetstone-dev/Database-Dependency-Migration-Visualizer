import { test, expect } from "@playwright/test";

const site = process.env.DBDEP_SITE_URL ?? "http://127.0.0.1:4173";

test("documentation exports readable HTML before JavaScript runs", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${site}/docs/installation/`);
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Installation",
    );
    await expect(page.locator("main")).toContainText(
      "pnpm install --frozen-lockfile",
    );
    await expect(
      page
        .getByRole("navigation", { name: "Documentation navigation" })
        .getByRole("link", { name: "Quickstart", exact: true }),
    ).toHaveAttribute("href", /\/docs\/quickstart\/$/);
  } finally {
    await context.close();
  }
});

test("direct documentation routes survive reloads and preserve preferences", async ({
  page,
}) => {
  await page.goto(`${site}/docs/quickstart/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Quickstart",
  );
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Inicio rápido",
  );
  await expect(page).toHaveURL(`${site}/docs/quickstart/`);
});

test("existing documentation hash bookmarks resolve to the new route", async ({
  page,
}) => {
  await page.goto(`${site}/#/docs/confidence`);
  await expect(page).toHaveURL(`${site}/docs/confidence/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Evidence and confidence",
  );
});

test("unknown documentation routes return HTTP 404", async ({ request }) => {
  const response = await request.get(`${site}/docs/does-not-exist/`);
  expect(response.status()).toBe(404);
});

test("all documentation routes navigate without failed prefetches or hydration errors", async ({
  page,
}) => {
  const errors = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${site}/docs/`);
  await expect(page.locator('[data-site-ready="true"]')).toHaveCount(1);
  const navigation = page.getByRole("navigation", {
    name: "Documentation navigation",
  });
  for (const [slug, title] of [
    ["introduction", "Introduction"],
    ["installation", "Installation"],
    ["quickstart", "Quickstart"],
    ["good-requests", "Good requests"],
    ["command-reference", "Command reference"],
    ["confidence", "Evidence and confidence"],
    ["safety-limits", "Safety and limits"],
  ]) {
    await navigation.locator(`a[href$='/docs/${slug}/']`).click();
    await expect(page).toHaveURL(`${site}/docs/${slug}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  expect(errors).toEqual([]);
});
