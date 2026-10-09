from test_engine import ROOT, api


def test_composite_primary_key_implies_not_null():
    m = api().inspect_ddl(ROOT / "examples/tricky-identifiers/schema.sql")
    assert api().select(m, '"Commerce"."Order"."CustomerID"')["properties"]["nullable"] is False
    assert api().select(m, '"Commerce"."Order".region')["properties"]["nullable"] is False
