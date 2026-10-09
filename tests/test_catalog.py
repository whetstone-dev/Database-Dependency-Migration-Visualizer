import json

import pytest

from test_engine import ROOT, api


def test_catalog_adapter_exists():
    assert (ROOT / "src/dbdep/catalog.py").exists(), "Read-only catalog adapter is missing"


def test_real_catalog_view_chain():
    from dbdep.catalog import inspect_catalog

    fixture = ROOT / "examples/analytics/catalog.json"
    assert fixture.exists(), "Capture a genuine catalog fixture from disposable PostgreSQL"
    model = inspect_catalog(json.loads(fixture.read_text()))
    assert api().validate(model) == []
    result = api().impact(model, "sales.orders.total_amount")
    names = {n["name"] for n in model["nodes"] if n["id"] in result["affected"]}
    assert {"order_summary", "monthly_revenue"} <= names
    assert all(e["origin"] == "postgres_catalog" for e in model["edges"])
    rewrite = [e for e in model["edges"] if e["properties"].get("via") == "pg_rewrite"]
    assert rewrite and all(e["properties"]["catalog_address"] for e in rewrite)


def test_allowlist_has_no_ddl_business_tables_or_arbitrary_routines():
    from dbdep.catalog import QUERIES
    from pglast import parser

    for qid, sql in QUERIES.items():
        stmts = json.loads(parser.parse_sql_json(sql))["stmts"]
        assert len(stmts) == 1 and "SelectStmt" in stmts[0]["stmt"], qid
        from dbdep.sql import walk, strings

        assert all(r.get("schemaname") == "pg_catalog" for r in walk(stmts, "RangeVar")), qid
        assert all(
            strings(f["funcname"])[-1] in {"current_setting", "pg_get_expr"}
            for f in walk(stmts, "FuncCall")
        ), qid


def test_catalog_diff_ignores_oid_drift():
    from dbdep.catalog import inspect_catalog

    capture = json.loads((ROOT / "examples/analytics/catalog.json").read_text())
    a = inspect_catalog(capture)
    import copy

    b = copy.deepcopy(a)
    for n in b["nodes"]:
        if "oid" in n["properties"]:
            n["properties"]["oid"] += 100000
    assert not api().diff(a, b)["modified"]


def test_capture_does_not_expose_driver_exception():
    from dbdep.catalog import capture

    with pytest.raises(ValueError, match="no connection details"):
        capture("postgresql://user:topsecret@127.0.0.1:1/missing?connect_timeout=1")
