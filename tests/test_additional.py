import copy

import pytest

from test_engine import api, ecommerce


def test_graph_cycles_and_multiple_paths():
    from dbdep.model import Builder

    b = Builder()
    ev = b.evidence("cycle.sql", b"")
    a, c, d = [b.node("table", "public", n, ev) for n in ["a", "c", "d"]]
    b.edge(c, a, "query_reference", ev)
    b.edge(d, c, "query_reference", ev)
    b.edge(a, d, "query_reference", ev)
    b.edge(d, a, "query_reference", ev)
    r = api().impact(b.finish(), a["id"])
    assert len(r["affected"]) == 2 and len(r["paths"][d["id"]]) == 1


def test_catalog_edge_identity_survives_oid_drift():
    from dbdep.model import Builder

    b = Builder()
    ev = b.evidence("x.sql", b"")
    a, c = [b.node("table", "public", n, ev) for n in ["a", "c"]]
    b.edge(
        c,
        a,
        "catalog_dependency",
        ev,
        properties={
            "dependency_type": "n",
            "via": "pg_rewrite",
            "catalog_address": "pg_rewrite:1:0->pg_class:2:1",
        },
    )
    m = b.finish()
    b2 = Builder()
    b2.model = copy.deepcopy(m)
    b2.nodes = {n["id"]: n for n in m["nodes"]}
    b2.edge(
        c,
        a,
        "catalog_dependency",
        ev,
        properties={
            "dependency_type": "n",
            "via": "pg_rewrite",
            "catalog_address": "pg_rewrite:99:0->pg_class:50:1",
        },
    )
    m2 = b2.finish()
    assert m["edges"][0]["id"] == m2["edges"][0]["id"]
    assert not api().diff(m, m2)["edges_added"]


def test_impact_operation_produces_deterministic_findings():
    r = api().impact(ecommerce(), "public.customers.id", "alter-type", "uuid")
    assert "DDM002" in {f["rule_id"] for f in r["findings"]}
    assert r["risk_level"] == "high"


@pytest.mark.parametrize("size", [100, 1000, 5000])
def test_large_graph_is_complete_and_html_caps_rendering(size):
    from dbdep.model import Builder
    from dbdep.reports import render, embedded_state

    b = Builder()
    ev = b.evidence("synthetic.sql", b"")
    previous = None
    for i in range(size):
        n = b.node("table", "public", f"t{i:05}", ev)
        if previous:
            b.edge(n, previous, "query_reference", ev)
        previous = n
    m = b.finish()
    assert len(api().impact(m, "public.t00000")["affected"]) == size - 1
    assert len(embedded_state(render(m))["model"]["nodes"]) == size
