"""Browser checks for the separately built local skill webpage."""

import functools
import http.server
import json
import threading
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "site/dist"
pytestmark = [
    pytest.mark.browser,
    pytest.mark.skipif(not (DIST / "index.html").exists(), reason="Build site/ before testing it"),
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@pytest.fixture(scope="module")
def site_url():
    handler = functools.partial(QuietHandler, directory=str(DIST))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)


@pytest.mark.parametrize(
    "viewport,reduced",
    [({"width": 1440, "height": 1000}, "no-preference"), ({"width": 390, "height": 844}, "reduce")],
)
def test_site_reports_keyboard_navigation_and_layout(site_url, viewport, reduced):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(viewport=viewport, reduced_motion=reduced)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: errors.append(message.text) if message.type == "error" else None,
        )
        requests = []
        page.on("request", lambda request: requests.append(request.url))
        page.goto(site_url)
        expect(page.get_by_role("heading", level=1)).to_contain_text("Before you")
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        frame = page.frame_locator("iframe")
        tabs = page.get_by_role("tab")
        tabs.nth(0).scroll_into_view_if_needed()
        for index, slug in enumerate(("ecommerce", "analytics", "high-traffic")):
            if index:
                tabs.nth(index - 1).press("ArrowRight")
            expect(tabs.nth(index)).to_have_attribute("aria-selected", "true")
            expect(page.locator("iframe")).to_have_attribute("src", f"./demos/{slug}/report.html")
            model = json.loads((ROOT / "examples/rendered" / slug / "model.dbdep.json").read_text())
            expect(frame.locator(".node")).to_have_count(len(model["nodes"]))
            expect(page.locator(".demo-toolbar")).to_contain_text(f"{len(model['nodes'])} OBJECTS")
        frame.locator("[data-tab=findings]").click()
        expect(frame.locator("#finding-list")).to_contain_text("DDM006")
        frame.locator("[data-tab=sequence]").click()
        expect(frame.locator(".phase")).to_have_count(5)
        tabs.nth(2).press("Home")
        expect(tabs.nth(0)).to_have_attribute("aria-selected", "true")
        ecommerce = json.loads((ROOT / "examples/rendered/ecommerce/model.dbdep.json").read_text())
        expect(frame.locator(".node")).to_have_count(len(ecommerce["nodes"]))
        if viewport["width"] > 760:
            with page.expect_download() as download:
                frame.locator("#export-json").click()
            assert json.loads(Path(download.value.path()).read_text()) == ecommerce
        assert page.locator("iframe").get_attribute("sandbox") == "allow-scripts allow-downloads"
        assert all(url.startswith(site_url) for url in requests)
        if reduced == "reduce":
            assert not page.locator("html").evaluate("el => el.classList.contains('lenis')")
            assert page.locator(".dot-grid--static").count() == 1
            assert (
                page.locator(".button-primary").first.evaluate(
                    "el => getComputedStyle(el).transitionDuration"
                )
                == "0s"
            )
        else:
            assert page.locator("html").evaluate("el => el.classList.contains('lenis')")
        assert not errors
        browser.close()


def test_site_copy_and_reduced_motion_change(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(permissions=["clipboard-read", "clipboard-write"])
        page = context.new_page()
        page.goto(site_url)
        copy = page.get_by_role("button", name="Copy Python install command")
        copy.click()
        expect(copy).to_contain_text("Copied")
        assert page.evaluate("navigator.clipboard.readText()") == "python -m pip install -e ."
        page.emulate_media(reduced_motion="reduce")
        expect(page.locator(".dot-grid--static")).to_have_count(1)
        expect(page.locator("html")).not_to_have_class("lenis lenis-smooth")
        assert not page.locator("html").evaluate("el => el.classList.contains('lenis')")
        browser.close()


@pytest.mark.parametrize("reduced", ["no-preference", "reduce"])
def test_keyboard_fragments_arrive_in_one_frame_with_hash_and_focus(site_url, reduced):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, reduced_motion=reduced)
        page.goto(site_url)
        page.evaluate(
            """() => {
                window.anchorSample = null;
                document.addEventListener('click', event => {
                    if (event.target.closest('a')?.getAttribute('href') !== '#examples') return;
                    requestAnimationFrame(() => {
                        window.anchorSample = {
                            detail: event.detail,
                            top: document.querySelector('#examples').getBoundingClientRect().top,
                            hash: location.hash,
                            focused: document.activeElement.id
                        };
                    });
                });
            }"""
        )
        examples = page.locator("header").get_by_role("link", name="Examples", exact=True)
        examples.focus()
        page.keyboard.press("Enter")
        page.wait_for_function("window.anchorSample !== null")
        sample = page.evaluate("window.anchorSample")
        assert sample["detail"] == 0
        assert abs(sample["top"]) <= 2, sample
        assert sample["hash"] == "#examples", sample
        assert sample["focused"] == "examples", sample
        page.keyboard.press("Tab")
        expect(page.get_by_role("tab").first).to_be_focused()
        browser.close()


def test_pointer_anchor_keeps_smooth_scroll(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.goto(site_url)
        page.evaluate(
            """() => {
                window.pointerSample = null;
                document.addEventListener('click', event => {
                    if (event.target.closest('a')?.getAttribute('href') !== '#examples') return;
                    requestAnimationFrame(() => {
                        window.pointerSample = {
                            detail: event.detail,
                            top: document.querySelector('#examples').getBoundingClientRect().top
                        };
                    });
                });
            }"""
        )
        page.locator("header").get_by_role("link", name="Examples", exact=True).click()
        page.wait_for_function("window.pointerSample !== null")
        sample = page.evaluate("window.pointerSample")
        assert sample["detail"] == 1
        assert sample["top"] > 100, sample
        page.wait_for_function(
            "Math.abs(document.querySelector('#examples').getBoundingClientRect().top) < 2"
        )
        expect(page).to_have_url(f"{site_url}/#examples")
        expect(page.locator("#examples")).to_be_focused()
        browser.close()


def test_keyboard_focus_resets_magnetic_action_in_one_frame(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.goto(site_url)
        action = page.locator(".hero-actions .button-primary")
        magnet = action.locator("..")
        box = action.bounding_box()
        page.mouse.move(box["x"] + box["width"] - 3, box["y"] + box["height"] / 2)
        page.wait_for_function(
            "e => new DOMMatrix(getComputedStyle(e).transform).m41 > 5",
            arg=magnet.element_handle(),
        )
        page.locator("header").get_by_role("link", name="GitHub", exact=True).focus()
        page.keyboard.press("Tab")
        expect(action).to_be_focused()
        sample = magnet.evaluate(
            """e => new Promise(resolve => requestAnimationFrame(() => resolve({
                x: new DOMMatrix(getComputedStyle(e).transform).m41,
                y: new DOMMatrix(getComputedStyle(e).transform).m42,
                duration: getComputedStyle(e).transitionDuration
            })))"""
        )
        assert sample == {"x": 0, "y": 0, "duration": "0s"}, sample
        browser.close()


def test_built_site_retains_dependency_notices_and_licenses(site_url):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.goto(site_url)
        notices = page.get_by_role("link", name="Third-party notices")
        assert notices.count() == 1
        response = page.request.get(site_url + notices.get_attribute("href").removeprefix("."))
        assert response.ok
        assert "d86fccbd477786f94ca7eb891fbe0ec039d3cd3b" in response.text()
        for license_file in (ROOT / "site/licenses").iterdir():
            response = page.request.get(f"{site_url}/licenses/{license_file.name}")
            assert response.ok
            assert response.body() == license_file.read_bytes()
        browser.close()
