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
        expect(page.locator("iframe")).to_have_count(0)
        links = page.locator("#examples").get_by_role("link", name="Open HTML report")
        for index, slug in enumerate(("ecommerce", "analytics", "high-traffic")):
            assert links.nth(index).get_attribute("href") == f"./demos/{slug}/report.html"
            report = context.new_page()
            report.goto(site_url + f"/demos/{slug}/report.html")
            model = json.loads((ROOT / "examples/rendered" / slug / "model.dbdep.json").read_text())
            expect(report.locator(".node")).to_have_count(len(model["nodes"]))
            if slug == "high-traffic":
                report.locator("[data-tab=findings]").click()
                expect(report.locator("#finding-list")).to_contain_text("DDM006")
                report.locator("[data-tab=sequence]").click()
                expect(report.locator(".phase")).to_have_count(5)
            if slug == "ecommerce" and viewport["width"] > 760:
                with report.expect_download() as download:
                    report.locator("#export-json").click()
                assert json.loads(Path(download.value.path()).read_text()) == model
            report.close()
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


def test_theme_and_language_preferences_persist(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(color_scheme="light", reduced_motion="reduce")
        page.goto(site_url)
        expect(page.locator("html")).to_have_attribute("lang", "en")
        expect(page.locator("html")).to_have_attribute("data-theme", "light")
        page.get_by_role("button", name="Switch to dark mode").click()
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        page.get_by_role("button", name="Español").click()
        expect(page.locator("html")).to_have_attribute("lang", "es")
        expect(page.get_by_role("heading", level=1)).to_contain_text("Antes de migrar")
        expect(page.locator("header")).to_contain_text("Ejemplos")
        page.reload()
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        expect(page.locator("html")).to_have_attribute("lang", "es")
        page.get_by_role("button", name="English").click()
        expect(page.locator("html")).to_have_attribute("lang", "en")
        page.get_by_role("button", name="Switch to light mode").click()
        expect(page.locator("html")).to_have_attribute("data-theme", "light")
        browser.close()


def test_impact_hover_and_focus_highlight_the_corresponding_trace(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(reduced_motion="reduce")
        page.goto(site_url)
        for index in range(3):
            node = page.locator(".graph-node").nth(index)
            node.hover()
            expect(page.locator(".trace[data-active='true']")).to_have_count(1)
            expect(page.locator(".trace").nth(index)).to_have_attribute("data-active", "true")
            node.focus()
            expect(page.locator(".trace").nth(index)).to_have_attribute("data-active", "true")
        page.locator(".graph-root").focus()
        expect(page.locator(".trace[data-active='true']")).to_have_count(3)
        browser.close()


def test_examples_open_reports_separately_and_workflow_explains_the_pipeline(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(reduced_motion="reduce")
        page.goto(site_url)
        expect(page.locator("iframe")).to_have_count(0)
        links = page.locator("#examples").get_by_role("link", name="Open HTML report")
        expect(links).to_have_count(3)
        for index, slug in enumerate(("ecommerce", "analytics", "high-traffic")):
            assert links.nth(index).get_attribute("href") == f"./demos/{slug}/report.html"
            response = page.request.get(f"{site_url}/demos/{slug}/report.html")
            assert response.ok
            assert "Content-Security-Policy" in response.text()
        expect(page.locator(".flow-stage[data-on='true']")).to_have_count(4)
        expect(page.get_by_role("button", name="Replay the flow")).to_be_visible()
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
        expect(
            page.locator("#examples").get_by_role("link", name="Open HTML report").first
        ).to_be_focused()
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


@pytest.mark.parametrize(
    "locale,theme,width", [("en", "light", 320), ("es", "dark", 320), ("es", "light", 768)]
)
def test_localized_layout_and_touch_traces(site_url, locale, theme, width):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(
            viewport={"width": width, "height": 844}, has_touch=True, reduced_motion="reduce"
        )
        page.add_init_script(
            f"localStorage.setItem('dbdep-locale', '{locale}'); localStorage.setItem('dbdep-theme', '{theme}');"
        )
        page.goto(site_url)
        expect(page.locator("html")).to_have_attribute("lang", locale)
        expect(page.locator("html")).to_have_attribute("data-theme", theme)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        for control in page.locator(".preferences button").all():
            box = control.bounding_box()
            assert box["width"] >= 44 and box["height"] >= 44, box
        page.locator(".graph-node").nth(1).tap()
        expect(page.locator(".trace").nth(1)).to_have_attribute("data-active", "true")
        expect(page.locator(".trace[data-active='true']")).to_have_count(1)
        expect(page.locator(".trace-caption")).to_contain_text("addresses.customer_id")
        assert page.locator(".graph-node").nth(1).get_attribute("aria-pressed") == "true"
        browser.close()


def test_preferences_survive_unavailable_storage_and_respect_system_theme(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(color_scheme="dark", reduced_motion="reduce")
        page.add_init_script(
            "Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('blocked'); };"
        )
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(site_url)
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        expect(page.locator("html")).to_have_attribute("lang", "en")
        page.get_by_role("button", name="Español").click()
        page.get_by_role("button", name="Activar modo claro").click()
        expect(page.locator("html")).to_have_attribute("data-theme", "light")
        expect(page.locator("html")).to_have_attribute("lang", "es")
        assert not errors
        browser.close()


def test_flow_pointer_replay_and_keyboard_navigation(site_url):
    from playwright.sync_api import expect, sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.goto(site_url)
        page.locator("header").get_by_role("link", name="How it works").focus()
        page.keyboard.press("Enter")
        expect(page.locator(".flow-wrapper")).to_have_attribute("data-playing", "false")
        expect(page.locator(".flow-stage[data-on='true']")).to_have_count(4)
        replay = page.get_by_role("button", name="Replay the flow")
        replay.click()
        expect(page.locator(".flow-wrapper")).to_have_attribute("data-playing", "true")
        expect(page.locator(".flow-stage[data-on='true']")).to_have_count(4)
        expect(page.locator(".flow-wrapper")).to_have_attribute("data-playing", "false")
        replay.focus()
        replay.press("Enter")
        expect(page.locator(".flow-wrapper")).to_have_attribute("data-playing", "false")
        expect(page.locator(".flow-stage[data-on='true']")).to_have_count(4)
        spanish = page.get_by_role("button", name="Español")
        spanish.focus()
        spanish.press("Enter")
        expect(page.locator("html")).to_have_attribute("lang", "es")
        assert (
            page.locator("#workflow .section-head").evaluate("el => getComputedStyle(el).transform")
            == "none"
        )
        browser.close()


def test_native_keyboard_scrolling_does_not_animate_sections(site_url):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.goto(site_url)
        page.evaluate("document.fonts.ready")
        page.evaluate("""() => {
            window.keyboardMotion = [];
            window.watchKeyboard = false;
            const sample = () => {
                if (window.watchKeyboard) for (const el of document.querySelectorAll('[data-reveal]')) {
                    const box = el.getBoundingClientRect();
                    if (box.top < innerHeight && box.bottom > 0 && Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) > 0.05)
                        window.keyboardMotion.push(el.className);
                }
                requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
        }""")
        page.keyboard.press("PageDown")
        page.evaluate("window.watchKeyboard = true")
        page.wait_for_timeout(500)
        page.keyboard.press("PageDown")
        page.wait_for_timeout(500)
        assert not page.evaluate("window.keyboardMotion")
        browser.close()


@pytest.mark.parametrize("touch", [False, True])
def test_dot_background_does_no_continuous_idle_or_offscreen_drawing(site_url, touch):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(
            viewport={"width": 390 if touch else 1440, "height": 844}, has_touch=touch
        )
        page.add_init_script("""window.canvasDraws = 0;
            const original = CanvasRenderingContext2D.prototype.clearRect;
            CanvasRenderingContext2D.prototype.clearRect = function(...args) { window.canvasDraws++; return original.apply(this, args); };
        """)
        page.goto(site_url)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(200)
        page.evaluate("window.canvasDraws = 0")
        page.wait_for_timeout(400)
        assert page.evaluate("window.canvasDraws") <= 1
        page.locator("header").get_by_role("link", name="Install", exact=True).focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(200)
        page.evaluate("window.canvasDraws = 0")
        page.wait_for_timeout(400)
        assert page.evaluate("window.canvasDraws") == 0
        if touch:
            assert page.locator(".dot-grid--static").count() == 1
        browser.close()


@pytest.mark.parametrize("locale", ["en", "es"])
def test_impact_diagram_grows_with_enlarged_text(site_url, locale):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page.add_init_script(f"localStorage.setItem('dbdep-locale', '{locale}');")
        page.goto(site_url)
        page.evaluate("document.documentElement.style.fontSize = '200%'")
        page.evaluate("document.fonts.ready")
        for node in page.locator(".graph-root, .graph-node").all():
            graph_box = page.locator(".specimen").bounding_box()
            node_box = node.bounding_box()
            assert node_box["x"] >= graph_box["x"]
            assert node_box["x"] + node_box["width"] <= graph_box["x"] + graph_box["width"]
            result = node.evaluate("""el => {
                const box = el.getBoundingClientRect();
                return Array.from(el.querySelectorAll('strong, .node-kind, .node-meta')).map(child => {
                    const text = child.getBoundingClientRect();
                    return { inside: text.top >= box.top && text.bottom <= box.bottom && text.left >= box.left && text.right <= box.right, text: child.textContent };
                });
            }""")
            assert all(item["inside"] for item in result), result
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        browser.close()
