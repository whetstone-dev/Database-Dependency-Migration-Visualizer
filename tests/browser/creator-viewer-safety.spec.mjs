import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { sanitize_creator_viewer } from "../../scripts/sanitize-creator-viewer.mjs";

const injection =
  '<img src="data:image/png,invalid" onerror="window.creatorInjected=true">';
const attributeInjection =
  '" onmouseover="window.creatorInjected=true" data-dummy="';

function fixture() {
  return {
    skill_name: "synthetic-only",
    previous_feedback: { "dummy-with_skill-run-1": "synthetic-only" },
    runs: [
      {
        id: "dummy-with_skill-run-1",
        prompt: "Synthetic fixture only",
        outputs: [],
        grading: {
          summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
          expectations: [
            {
              text: "Dummy assertion",
              passed: true,
              evidence: "Dummy evidence",
            },
          ],
        },
      },
    ],
    benchmark: {
      metadata: { skill_name: "synthetic-only" },
      run_summary: {
        with_skill: { pass_rate: { mean: 1, stddev: 0 } },
        without_skill: { pass_rate: { mean: 1, stddev: 0 } },
        delta: { pass_rate: "+0.00" },
      },
      runs: [
        {
          eval_id: 1,
          configuration: "with_skill",
          run_number: 1,
          result: { pass_rate: 1, passed: 1, total: 1 },
          expectations: [
            {
              text: "Dummy assertion",
              passed: true,
              evidence: "Dummy evidence",
            },
          ],
        },
      ],
      notes: [],
    },
  };
}

async function load(
  page,
  name,
  data,
  { blockNetwork = true, templateSuffix = "" } = {},
) {
  const source = await readFile(
    new URL(`../../evals/${name}`, import.meta.url),
    "utf8",
  );
  const synthetic =
    source.replace(
      /const EMBEDDED_DATA = [^\r\n]*;/,
      `const EMBEDDED_DATA = ${JSON.stringify(data)};`,
    ) + templateSuffix;
  const normalized = sanitize_creator_viewer(synthetic);
  const requests = [];
  const errors = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  if (blockNetwork) await page.route("**/*", (route) => route.abort());
  else {
    // Fail before loading a template that would fetch third-party scripts.
    expect(
      /<(?:script|link)\b[^>]*(?:src|href)=["'](?:https?:)?\/\//i.test(
        normalized,
      ),
    ).toBe(false);
  }
  await page.setContent(normalized);
  await expect(page.locator("#progress")).toHaveText("1 of 1");
  expect(await page.evaluate(() => EMBEDDED_DATA)).toEqual(data);
  expect(errors).toEqual([]);
  return { requests, normalized };
}

for (const name of ["review.html", "review-node.html"]) {
  test(`${name} preserves every decoded value in the original evaluation data`, async () => {
    const source = await readFile(
      new URL(`../../evals/${name}`, import.meta.url),
      "utf8",
    );
    const embedded = (html) =>
      JSON.parse(html.match(/const EMBEDDED_DATA = ([^\r\n]*);/)[1]);
    const normalized = sanitize_creator_viewer(source);
    expect(embedded(normalized)).toEqual(embedded(source));
    expect(sanitize_creator_viewer(normalized)).toBe(normalized);
  });

  test(`${name} works offline without third-party requests and offers workbook downloads`, async ({
    page,
  }) => {
    const data = fixture();
    const workbook = { name: "dummy.xlsx", type: "xlsx", data_b64: "ZA==" };
    const originalTags =
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Lora:wght@400;500&display=swap" rel="stylesheet"><script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>';
    data.runs[0].outputs = [
      workbook,
      { name: "dummy.txt", type: "text", content: originalTags },
    ];
    data.previous_outputs = { [data.runs[0].id]: [workbook] };
    const { requests, normalized } = await load(page, name, data, {
      blockNetwork: false,
      templateSuffix:
        '<script src="//synthetic.invalid/template-only.js"></script><link rel="stylesheet" href="https://synthetic.invalid/template-only.css">',
    });
    await expect(
      page.locator("#outputs-body .output-file-content").first(),
    ).toHaveText(
      "Spreadsheet preview is unavailable offline. Download the workbook to view it.",
    );
    await expect(
      page.locator("#prev-outputs-content .output-file-content").first(),
    ).toHaveText(
      "Spreadsheet preview is unavailable offline. Download the workbook to view it.",
    );
    await expect(page.locator("#outputs-body .dl-btn").first()).toHaveAttribute(
      "href",
      "data:application/octet-stream;base64,ZA==",
    );
    await expect(
      page.locator("#prev-outputs-content .dl-btn").first(),
    ).toHaveAttribute("href", "data:application/octet-stream;base64,ZA==");
    await expect(page.locator("#outputs-body pre")).toHaveText(originalTags);
    await expect(
      page.locator(
        'script[src], link[rel="stylesheet"], link[rel="preconnect"]',
      ),
    ).toHaveCount(0);
    expect(await page.evaluate(() => typeof XLSX)).toBe("undefined");
    expect(sanitize_creator_viewer(normalized)).toBe(normalized);
    expect(requests).toEqual([]);
  });

  test(`${name} escapes benchmark evidence in attribute context`, async ({
    page,
  }) => {
    const data = fixture();
    data.benchmark.runs[0].expectations[0].evidence = attributeInjection;
    await load(page, name, data);
    const evidence = page.locator("#benchmark-content span[title]").first();
    await evidence.dispatchEvent("mouseover");
    expect(await page.evaluate(() => window.creatorInjected)).toBeUndefined();
    await expect(evidence).toHaveAttribute(
      "title",
      `Run 1: ${attributeInjection}`,
    );
    await expect(page.locator("#benchmark-content [onmouseover]")).toHaveCount(
      0,
    );
  });

  test(`${name} renders hostile grade counts and benchmark fields as text`, async ({
    page,
  }) => {
    const data = fixture();
    Object.assign(data.runs[0].grading.summary, {
      passed: injection,
      failed: injection,
      total: injection,
    });
    Object.assign(data.benchmark.metadata, {
      timestamp: injection,
      evals_run: [injection],
      runs_per_configuration: injection,
    });
    Object.assign(data.benchmark.run_summary.delta, {
      pass_rate: injection,
      time_seconds: injection,
      tokens: injection,
    });
    data.benchmark.run_summary.with_skill.time_seconds = { mean: 1, stddev: 0 };
    data.benchmark.run_summary.with_skill.tokens = { mean: 1, stddev: 0 };
    Object.assign(data.benchmark.runs[0], {
      configuration: injection,
      run_number: injection,
    });
    Object.assign(data.benchmark.runs[0].result, {
      passed: injection,
      total: injection,
      errors: injection,
    });
    await load(page, name, data);
    await expect(
      page.locator("#grades-content img, #benchmark-content img"),
    ).toHaveCount(0);
    await expect(page.locator("#grades-content")).toContainText(injection);
    await expect(page.locator("#benchmark-content")).toContainText(injection);
    expect(await page.evaluate(() => window.creatorInjected)).toBeUndefined();
  });

  test(`${name} rejects active and external preview URLs in current and previous outputs`, async ({
    page,
  }) => {
    const data = fixture();
    const outputs = [
      {
        name: "dummy.pdf",
        type: "pdf",
        data_uri: "javascript:parent.window.creatorInjected=true;void(0)",
      },
      {
        name: "dummy-html.pdf",
        type: "pdf",
        data_uri:
          "data:text/html,<script>parent.window.creatorInjected=true</script>",
      },
      {
        name: "dummy-remote.pdf",
        type: "pdf",
        data_uri: "https://synthetic.invalid/dummy.pdf",
      },
      {
        name: "dummy.png",
        type: "image",
        data_uri: "https://synthetic.invalid/dummy.png",
      },
      {
        name: "dummy.svg",
        type: "image",
        data_uri: `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="parent.window.creatorInjected=true"></svg>').toString("base64")}`,
      },
      {
        name: "dummy.bin",
        type: "binary",
        data_uri: `data:text/html;base64,${Buffer.from("<script>parent.window.creatorInjected=true</script>").toString("base64")}`,
      },
      {
        name: "dummy.txt",
        type: "text",
        content: "Synthetic only",
        data_uri: "javascript:window.creatorInjected=true",
      },
    ];
    data.runs[0].outputs = outputs;
    data.previous_outputs = { [data.runs[0].id]: outputs };
    const { requests } = await load(page, name, data);
    await expect(
      page.locator(
        'iframe[src^="javascript:"], iframe[src^="data:text/html"], iframe[src^="https:"], img[src^="https:"], img[src^="data:image/svg+xml"], a[href^="javascript:"], a[href^="data:text/html"]',
      ),
    ).toHaveCount(0);
    expect(await page.evaluate(() => window.creatorInjected)).toBeUndefined();
    expect(
      requests.some((url) => url.startsWith("https://synthetic.invalid/")),
    ).toBe(false);
    for (const frame of await page.locator("iframe").all())
      await expect(frame).toHaveAttribute("sandbox", "");
  });

  test(`${name} keeps safe downloads, numeric grades, navigation, and decoded data`, async ({
    page,
  }) => {
    const data = fixture();
    data.runs[0].outputs = [
      {
        name: "dummy.txt",
        type: "text",
        content: '</script><img src=x> " & Español',
      },
      {
        name: "dummy.png",
        type: "image",
        data_uri: "data:image/png;base64,iVBORw0KGgo=",
      },
      {
        name: "dummy.pdf",
        type: "pdf",
        data_uri: "data:application/pdf;base64,JVBERi0xLjQK",
      },
    ];
    const { normalized } = await load(page, name, data);
    expect(sanitize_creator_viewer(normalized)).toBe(normalized);
    await expect(page.locator("#outputs-body pre")).toHaveText(
      data.runs[0].outputs[0].content,
    );
    await expect(page.locator("#outputs-body .dl-btn").first()).toHaveAttribute(
      "href",
      `data:text/plain;charset=utf-8,${encodeURIComponent(data.runs[0].outputs[0].content)}`,
    );
    await expect(page.locator("#outputs-body iframe")).toHaveAttribute(
      "src",
      data.runs[0].outputs[2].data_uri,
    );
    await expect(page.locator("#outputs-body iframe")).toHaveAttribute(
      "sandbox",
      "",
    );
    await expect(page.locator("#grades-content")).toContainText(
      "1 passed, 0 failed of 1",
    );
    await page.locator("[onclick=\"switchView('benchmark')\"]").click();
    await expect(page.locator("#panel-benchmark")).toHaveClass(/active/);
  });

  test(`${name} strips active HTML from spreadsheet previews`, async ({
    page,
  }) => {
    const data = fixture();
    data.runs[0].outputs = [
      { name: "dummy.xlsx", type: "xlsx", data_b64: "ZA==" },
    ];
    // Provide a trusted renderer explicitly and exercise its untrusted HTML result.
    await page.evaluate(() => {
      window.XLSX = {
        read: () => ({ SheetNames: ["Dummy"], Sheets: { Dummy: {} } }),
        utils: {
          sheet_to_html: () =>
            '<table><tbody><tr><td colspan="2" onclick="window.creatorInjected=true"><a href="javascript:window.creatorInjected=true">Dummy cell</a><img src="https://synthetic.invalid/dummy" onerror="window.creatorInjected=true"><svg onload="window.creatorInjected=true"></svg><script>window.creatorInjected=true</script></td></tr></tbody></table>',
        },
      };
    });
    const { requests } = await load(page, name, data);
    await expect(page.locator("#outputs-body td")).toHaveText("Dummy cell");
    await expect(page.locator("#outputs-body td")).toHaveAttribute(
      "colspan",
      "2",
    );
    await expect(
      page.locator(
        '#outputs-body img, #outputs-body svg, #outputs-body script, #outputs-body a[href^="javascript:"], #outputs-body [onclick]',
      ),
    ).toHaveCount(0);
    expect(
      requests.some((url) => url.startsWith("https://synthetic.invalid/")),
    ).toBe(false);
    expect(await page.evaluate(() => window.creatorInjected)).toBeUndefined();
  });
}

test("creator renderer hardening rejects changed upstream rendering anchors", async () => {
  const source = await readFile(
    new URL("../../evals/review-node.html", import.meta.url),
    "utf8",
  );
  const iframeAnchor = source.includes("// dbdep creator renderer safety v2")
    ? "if (pdfUri) iframe.src = pdfUri;"
    : "iframe.src = file.data_uri;";
  for (const changed of [
    source.replace(iframeAnchor, "iframe.src = String(file.data_uri);"),
    source.replace(
      "function renderOutputs(run)",
      "function renderChangedOutputs(run)",
    ),
  ]) {
    expect(changed).not.toBe(source);
    expect(() => sanitize_creator_viewer(changed)).toThrow(
      /renderer.*changed|renderer.*missing/i,
    );
  }
});

test("creator renderer marker does not bypass safety anchor verification", async () => {
  const source = await readFile(
    new URL("../../evals/review-node.html", import.meta.url),
    "utf8",
  );
  const normalized = sanitize_creator_viewer(source);
  const marker = "// dbdep creator renderer safety v2";
  const markerBypass = source.includes(marker)
    ? source.replace(
        `return div.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");`,
        "return div.innerHTML;",
      )
    : source + `\n${marker}`;
  for (const [unchanged, changed] of [
    [
      normalized,
      normalized.replace(
        "if (pdfUri) iframe.src = pdfUri;",
        "iframe.src = file.data_uri;",
      ),
    ],
    [source, markerBypass],
  ]) {
    expect(changed).not.toBe(unchanged);
    expect(() => sanitize_creator_viewer(changed)).toThrow(
      /renderer.*changed|renderer.*missing/i,
    );
  }
});
