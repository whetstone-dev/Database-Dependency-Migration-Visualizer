from test_engine import ecommerce


def test_data_update_without_semantic_analysis_is_unknown(tmp_path):
    from dbdep.rules import review

    p = tmp_path / "backfill.sql"
    p.write_text("UPDATE public.customers SET name = email")
    r = review(ecommerce(), p)
    assert r["risk_level"] == "unknown"
    assert "DDM013" in {f["rule_id"] for f in r["model"]["findings"]}
    assert r["plan"]
