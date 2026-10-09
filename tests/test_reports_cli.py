import json
import subprocess
import sys

from test_engine import ROOT, api, ecommerce


def cli(*args):
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts/dbdep.py"), *map(str, args)],
        capture_output=True,
        text=True,
    )


def test_cli_entrypoint_exists():
    assert (ROOT / "scripts/dbdep.py").exists(), "Working CLI is missing"


def test_offline_pipeline_and_output_consistency(tmp_path):
    model = tmp_path / "test.dbdep.json"
    result = cli(
        "inspect",
        "--ddl",
        ROOT / "examples/ecommerce/schema.sql",
        "--repo",
        ROOT / "examples/ecommerce/app",
        "--out",
        model,
    )
    assert result.returncode == 0, result.stderr
    for command, ext in [("render", "html"), ("docs", "md"), ("mermaid", "mmd"), ("dot", "dot")]:
        result = cli(command, model, "--out", tmp_path / ("report." + ext))
        assert result.returncode == 0, result.stderr
    assert cli("validate", model, "--strict", "--json").returncode == 0
    from dbdep.reports import embedded_state

    m = json.loads(model.read_text())
    html = (tmp_path / "report.html").read_text()
    assert embedded_state(html)["model"] == m
    md = (tmp_path / "report.md").read_text()
    assert all(n["id"] in md for n in m["nodes"])
    assert all(e["id"] in md for e in m["edges"])
    assert len(m["evidence"]) == embedded_state(html)["summary"]["evidence"]


def test_render_rejects_invalid_graph_before_writing(tmp_path):
    p = tmp_path / "bad.json"
    p.write_text("{}")
    result = cli("render", p, "--out", tmp_path / "bad.html")
    assert result.returncode == 2 and not (tmp_path / "bad.html").exists()


def test_policy_gate_still_delivers_review_artifacts(tmp_path):
    p = tmp_path / "baseline.json"
    p.write_text(api().canonical(ecommerce()))
    result = cli(
        "review",
        "--baseline",
        p,
        "--migration",
        ROOT / "examples/high-traffic/migrations/007.sql",
        "--out",
        tmp_path / "review",
        "--fail-on",
        "high",
        "--json",
    )
    assert result.returncode == 3, result.stderr
    assert (tmp_path / "review/report.html").exists()
    assert json.loads(result.stdout)["policy_passed"] is False


def test_html_escapes_untrusted_names_and_no_external_assets(tmp_path):
    p = tmp_path / "x.sql"
    p.write_text('CREATE TABLE "</script><img src=x onerror=alert(1)>" (id int)')
    from dbdep.reports import render, embedded_state

    model = api().inspect_ddl(p)
    html = render(model)
    assert "</script><img" not in html
    assert "<script src=" not in html and "https://cdn" not in html
    assert embedded_state(html)["model"] == model
    assert "Content-Security-Policy" in html


def test_offline_inspection_does_not_use_network(monkeypatch):
    import socket

    def forbidden(*args, **kwargs):
        raise AssertionError("Offline analysis attempted network access")

    monkeypatch.setattr(socket, "socket", forbidden)
    assert ecommerce()["nodes"]


def test_doctor_diff_impact_and_apply_rejected(tmp_path):
    assert cli("doctor", "--json").returncode == 0
    p = tmp_path / "m.json"
    p.write_text(api().canonical(ecommerce()))
    result = cli(
        "impact",
        p,
        "--object",
        "public.customers.id",
        "--operation",
        "alter-type",
        "--to",
        "uuid",
        "--json",
    )
    assert result.returncode == 0 and json.loads(result.stdout)["affected"]
    assert cli("diff", p, p, "--out", tmp_path / "diff").returncode == 0
    assert cli("apply", p).returncode == 2
