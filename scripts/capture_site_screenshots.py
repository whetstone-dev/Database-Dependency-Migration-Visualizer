#!/usr/bin/env python3
"""Capture the built webpage in reproducible themes, languages and viewports."""

import functools
import http.server
import json
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    from playwright.sync_api import sync_playwright

    built = ROOT / "site/dist"
    if not (built / "index.html").is_file():
        raise ValueError("Build site/ before capturing screenshots")
    destination = ROOT / "site/screenshots"
    destination.mkdir(exist_ok=True)
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(built))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    captured = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                variants = [
                    ("desktop", 1440, 1000, "en", "light"),
                    ("desktop-dark", 1440, 1000, "en", "dark"),
                    ("mobile", 390, 844, "en", "light"),
                    ("mobile-es-dark", 390, 844, "es", "dark"),
                ]
                for label, width, height, locale, theme in variants:
                    page = browser.new_page(
                        viewport={"width": width, "height": height}, reduced_motion="reduce"
                    )
                    page.add_init_script(
                        f"localStorage.setItem('dbdep-locale', '{locale}');"
                        f"localStorage.setItem('dbdep-theme', '{theme}');"
                    )
                    page.goto(f"http://127.0.0.1:{server.server_port}/")
                    page.locator("h1").wait_for()
                    page.evaluate("document.fonts.ready")
                    if page.evaluate("document.documentElement.scrollWidth > innerWidth"):
                        raise ValueError(f"Horizontal overflow in {label}")

                    def capture(filename, full=False):
                        page.screenshot(path=str(destination / filename), full_page=full)
                        captured.append(filename)

                    capture(f"{label}-hero.png")
                    capture(f"{label}.png", full=True)
                    page.locator("#examples").scroll_into_view_if_needed()
                    capture("examples.png" if label == "desktop" else f"{label}-examples.png")
                    page.locator("footer").scroll_into_view_if_needed()
                    capture(f"{label}-footer.png")
                    page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    print(json.dumps({"captured": captured, "reduced_motion": True, "fonts": "self-hosted"}))


if __name__ == "__main__":
    main()
