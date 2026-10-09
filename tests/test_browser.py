import json

import pytest

from test_engine import ROOT, api, ecommerce


@pytest.mark.browser
def test_offline_interactions_and_exports(tmp_path):
    from playwright.sync_api import sync_playwright
    from dbdep.reports import render
    from dbdep.graph import select

    model = ecommerce()
    root = select(model, "public.customers.id")["id"]
    p = tmp_path / "viewer.html"
    p.write_text(render(model, root=root), encoding="utf-8")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        errors = []
        requests = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))
        page.goto(p.resolve().as_uri())
        assert page.locator(".node").count() == len(model["nodes"])
        assert page.locator(".node.affected").count() == len(api().impact(model, root)["affected"])
        page.locator("#depth").select_option("transitive")
        assert page.locator(".node").count() == len(api().impact(model, root)["affected"]) + 1
        page.locator("#search").fill("customer_summary")
        assert page.locator(".node").count() == 4
        page.locator('.node[aria-label="public.customer_summary, view, PARSED"]').press("Enter")
        assert "customer_summary" in page.locator("#detail").inner_text()
        page.locator("#search").fill("")
        page.locator("#depth").select_option("all")
        page.locator("#schema").select_option("public")
        page.locator("#kind").select_option("table")
        assert page.locator(".node").count() == 6
        page.locator("#kind").select_option("")
        before = page.locator("#scene").get_attribute("transform")
        page.locator("#zoom-in").click()
        assert page.locator("#scene").get_attribute("transform") != before
        with page.expect_download() as downloaded:
            page.locator("#export-json").click()
        assert json.loads(open(downloaded.value.path(), encoding="utf-8").read()) == model
        with page.expect_download() as downloaded:
            page.locator("#export-svg").click()
        assert "<svg" in open(downloaded.value.path(), encoding="utf-8").read()
        page.locator("[data-tab=findings]").click()
        assert page.locator("#unknown-list").is_visible()
        page.locator("[data-tab=sequence]").click()
        assert page.locator("#sequence").is_visible()
        assert not errors
        assert all(url.startswith("file:") for url in requests)
        browser.close()


@pytest.mark.browser
def test_motion_accessibility_mobile_and_empty_search(tmp_path):
    from playwright.sync_api import sync_playwright
    from dbdep.reports import render

    p = tmp_path / "viewer.html"
    p.write_text(render(ecommerce()), encoding="utf-8")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(
            viewport={"width": 375, "height": 900},
            reduced_motion="reduce",
            is_mobile=True,
            has_touch=True,
        )
        page.goto(p.resolve().as_uri())
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        assert page.locator("#search").evaluate("(e)=>getComputedStyle(e).fontSize") == "16px"
        page.locator("#search").fill("no-such-object")
        assert page.locator(".node").count() == 0
        assert "No matching objects" in page.locator("#cap").inner_text()
        page.locator("#search").fill("")
        page.locator("#zoom-in").focus()
        assert (
            page.locator("#zoom-in").evaluate("(e)=>getComputedStyle(e).transitionDuration") == "0s"
        )
        browser.close()


@pytest.mark.browser
def test_review_tabs_have_findings_and_phases():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.goto((ROOT / "examples/rendered/high-traffic/report.html").as_uri())
        page.locator("[data-tab=findings]").click()
        assert "DDM006" in page.locator("#finding-list").inner_text()
        page.locator("#risk").select_option("high")
        assert all("HIGH" in x for x in page.locator(".finding").all_inner_texts())
        page.locator("[data-tab=sequence]").click()
        assert page.locator(".phase").count() == 5
        browser.close()


@pytest.mark.browser
def test_large_graph_caps_dom_but_keeps_complete_model(tmp_path):
    from dbdep.model import Builder
    from dbdep.reports import render
    from playwright.sync_api import sync_playwright

    builder = Builder()
    ev = builder.evidence("large.sql", b"")
    previous = None
    for i in range(1000):
        node = builder.node("table", "public" if i < 900 else "sales", f"t{i:04}", ev)
        if previous:
            builder.edge(node, previous, "query_reference", ev)
        previous = node
    model = builder.finish()
    page_path = tmp_path / "large.html"
    page_path.write_text(render(model, root=model["nodes"][0]["id"]), encoding="utf-8")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.goto(page_path.as_uri())
        assert page.locator(".node").count() == 350
        assert "sales: 100" in page.locator("#cap").inner_text()
        assert page.locator(".path").count() == 40
        assert "Showing 40 of 999 paths" in page.locator("#detail").inner_text()
        assert (
            page.evaluate(
                "JSON.parse(document.getElementById('dbdep-state').textContent).model.nodes.length"
            )
            == 1000
        )
        page.locator("#search").fill("t0999")
        page.locator(".node").press("Enter")
        assert "sales.t0999" in page.locator("#detail").inner_text()
        browser.close()
