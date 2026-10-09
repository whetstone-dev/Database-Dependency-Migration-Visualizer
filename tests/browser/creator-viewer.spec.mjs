import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "@playwright/test";

for (const [label, newline] of [
  ["LF", "\n"],
  ["CRLF", "\r\n"],
]) {
  test(`creator viewer ${label} JSON cannot close its script and preserves every decoded output`, async ({
    page,
  }) => {
    assert.ok(
      existsSync(
        new URL("../../scripts/sanitize-creator-viewer.mjs", import.meta.url),
      ),
      "Creator viewer normalization is missing",
    );
    const { sanitize_creator_viewer } =
      await import("../../scripts/sanitize-creator-viewer.mjs");
    const data = {
      runs: [
        {
          outputs: [
            {
              content:
                "</script><script>window.injected=true</script><!-- & > Español \u2028",
            },
          ],
        },
      ],
    };
    const html = `<html><body><script>const EMBEDDED_DATA = ${JSON.stringify(data)};${newline}window.actual=EMBEDDED_DATA;</script></body></html>`;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setContent(sanitize_creator_viewer(html));
    assert.deepEqual(await page.evaluate(() => window.actual), data);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.deepEqual(errors, []);
  });
}
