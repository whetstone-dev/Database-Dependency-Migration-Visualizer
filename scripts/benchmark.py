#!/usr/bin/env python3
"""Measure graph/validation/render work, not SQL performance or lock timing."""

import argparse
import platform
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from dbdep.graph import impact  # noqa: E402 -- standalone source-checkout entrypoint
from dbdep.model import Builder, canonical, validate  # noqa: E402
from dbdep.reports import render, write  # noqa: E402


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, default=ROOT / "out/performance.json")
    a = p.parse_args()
    results = []
    for count in [100, 1000, 5000]:
        start = time.perf_counter()
        b = Builder()
        ev = b.evidence("synthetic-benchmark.sql", b"")
        previous = None
        for i in range(count):
            n = b.node("table", "public", f"t{i:05}", ev)
            if previous:
                b.edge(n, previous, "query_reference", ev)
            previous = n
        m = b.finish()
        built = time.perf_counter()
        assert not validate(m)
        valid = time.perf_counter()
        assert len(impact(m, "public.t00000")["affected"]) == count - 1
        traversed = time.perf_counter()
        html = render(m)
        end = time.perf_counter()
        results.append(
            {
                "nodes": count,
                "edges": count - 1,
                "build_seconds": built - start,
                "validation_seconds": valid - built,
                "impact_seconds": traversed - valid,
                "render_seconds": end - traversed,
                "html_bytes": len(html.encode()),
                "browser_visible_cap": 350,
            }
        )
    report = {
        "python": platform.python_version(),
        "platform": platform.system(),
        "measurements": results,
        "scope": "Synthetic linear graph CPU timings. No SQL, production performance or browser frame-rate guarantee.",
    }
    write(a.out, canonical(report))
    print(canonical(report))


if __name__ == "__main__":
    main()
