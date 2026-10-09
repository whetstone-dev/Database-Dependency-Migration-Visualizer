#!/usr/bin/env python3
"""Capture actual demo screenshots; inspect them before claiming visual review."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in ["ecommerce", "analytics", "high-traffic"]:
            folder = ROOT / "examples/rendered" / name
            page = browser.new_page(
                viewport={"width": 1500, "height": 1080},
                device_scale_factor=1,
                reduced_motion="reduce",
            )
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto((folder / "report.html").as_uri())
            if name == "high-traffic":
                page.locator("[data-tab=findings]").click()
            else:
                page.locator("#depth").select_option("transitive")
            assert not errors
            page.screenshot(path=str(folder / "screenshot.png"), full_page=True)
            print(f"Captured {name}/screenshot.png")
            page.close()
        browser.close()


if __name__ == "__main__":
    main()
