#!/usr/bin/env python3
"""Verify regenerated models and every JSON/HTML/Markdown inventory."""

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from dbdep.cli import demo  # noqa: E402 -- standalone source-checkout entrypoint
from dbdep.model import validate  # noqa: E402
from dbdep.reports import embedded_state  # noqa: E402


def main():
    with tempfile.TemporaryDirectory() as d:
        demo(d)
        for name in ["ecommerce", "analytics", "high-traffic"]:
            curated = ROOT / "examples/rendered" / name
            fresh = Path(d) / name
            for file in [
                "model.dbdep.json",
                "review.json",
                "report.html",
                "report.md",
                "graph.mmd",
                "graph.dot",
            ]:
                assert (curated / file).read_bytes() == (fresh / file).read_bytes(), (
                    f"Regeneration differs: {name}/{file}"
                )
            m = json.loads((curated / "model.dbdep.json").read_text())
            assert not validate(m, strict=True)
            assert embedded_state((curated / "report.html").read_text())["model"] == m
            md = (curated / "report.md").read_text()
            assert all(n["id"] in md for n in m["nodes"])
            assert all(e["id"] in md for e in m["edges"])
            assert all(f["id"] in md for f in m["findings"])
            print(
                f"{name}: reproducible and consistent ({len(m['nodes'])} nodes, {len(m['edges'])} edges)"
            )


if __name__ == "__main__":
    main()
