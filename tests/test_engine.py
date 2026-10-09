import copy
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def api():
    from dbdep import engine

    return engine


def ecommerce():
    return api().inspect_ddl(
        ROOT / "examples/ecommerce/schema.sql", ROOT / "examples/ecommerce/app"
    )


def test_missing_toolkit_has_callable_inspection():
    assert (ROOT / "src/dbdep/engine.py").exists(), "The supporting engine is missing"


def test_ecommerce_fk_view_queries_and_reverse_direction():
    m = ecommerce()
    assert api().validate(m) == []
    impact = api().impact(m, "public.customers.id")
    names = {n["name"] for n in m["nodes"] if n["id"] in impact["affected"]}
    assert {"customer_summary", "orders_customer_id_fkey", "addresses_customer_id_fkey"} <= names
    assert any("customers.sql" in x for x in impact["affected"])
    assert any(e["kind"] == "foreign_key" for e in m["edges"])
    assert all(e["evidence_ids"] for e in m["edges"])
    assert impact["root"] not in impact["affected"]


def test_reproducibility_and_provenance():
    m = ecommerce()
    assert api().canonical(m) == api().canonical(ecommerce())
    assert all(e["source_hash"].startswith("sha256:") for e in m["evidence"])
    assert any(e.get("line_start", 0) > 1 for e in m["evidence"])


@pytest.mark.parametrize(
    "mutation", ["duplicate", "dangling", "evidence", "enum", "version", "hash"]
)
def test_validator_rejects_invalid_model(mutation):
    m = copy.deepcopy(ecommerce())
    if mutation == "duplicate":
        m["nodes"].append(m["nodes"][0])
    if mutation == "dangling":
        m["edges"][0]["target"] = "missing"
    if mutation == "evidence":
        m["edges"][0]["evidence_ids"] = ["missing"]
    if mutation == "enum":
        m["nodes"][0]["status"] = "CERTAIN"
    if mutation == "version":
        m["schema_version"] = "99.0.0"
    if mutation == "hash":
        m["evidence"][0]["source_hash"] = "sha256:nope"
    assert api().validate(m)


def test_quoted_composite_partition_and_overloads():
    m = api().inspect_ddl(ROOT / "examples/tricky-identifiers/schema.sql")
    assert api().validate(m) == []
    assert api().select(m, '"Commerce"."Order"."CustomerID"')["kind"] == "column"
    assert len([n for n in m["nodes"] if n["kind"] == "function" and n["name"] == "label"]) == 2
    assert any(e["kind"] == "partition" for e in m["edges"])
    fk = next(n for n in m["nodes"] if n["properties"].get("constraint_type") == "foreign_key")
    assert len(fk["properties"]["columns"]) == 2


def test_ambiguous_unqualified_name_is_unknown():
    m = api().inspect_ddl(ROOT / "examples/multi-schema/schema.sql")
    assert any("ambiguous" in u["explanation"].lower() for u in m["unknowns"])
    assert len([n for n in m["nodes"] if n["name"] == "orders" and n["kind"] == "table"]) == 2


def test_dynamic_sql_is_unknown_and_grounded_query_is_retained():
    m = api().inspect_ddl(
        ROOT / "examples/dynamic-sql-unknown/schema.sql", ROOT / "examples/dynamic-sql-unknown/app"
    )
    assert any("routine" in u["explanation"].lower() for u in m["unknowns"])
    assert any("host" in u["explanation"].lower() for u in m["unknowns"])
    assert api().impact(m, "public.customers.email")["affected"]
    assert m["coverage"]["exhaustive"] is False


def test_diff_does_not_confirm_rename():
    d = api().diff(
        api().inspect_ddl(ROOT / "examples/diff/before.sql"),
        api().inspect_ddl(ROOT / "examples/diff/after.sql"),
    )
    assert d["added"] and d["removed"] and d["rename_candidates"]
    assert all(x["status"] == "UNKNOWN" for x in d["rename_candidates"])


def test_invalid_sql_and_selector(tmp_path):
    p = tmp_path / "bad.sql"
    p.write_text("CREATE TABLE ???", encoding="utf-8")
    with pytest.raises(ValueError):
        api().inspect_ddl(p)
    with pytest.raises(ValueError):
        api().select(ecommerce(), "public.customers.id; DROP TABLE x")


def test_no_sql_literal_or_password_persisted(tmp_path):
    p = tmp_path / "safe.sql"
    p.write_text(
        "CREATE TABLE t(id int, token text DEFAULT 'very-secret'); SELECT id FROM t WHERE token='very-secret';",
        encoding="utf-8",
    )
    assert "very-secret" not in json.dumps(api().inspect_ddl(p))
