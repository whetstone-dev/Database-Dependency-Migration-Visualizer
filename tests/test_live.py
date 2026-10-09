"""Only runs against an explicitly provided disposable fixture database."""

import os

import pytest

from test_engine import api


@pytest.mark.live
def test_read_only_capture_and_actual_catalog_associations():
    dsn = os.environ.get("DBDEP_TEST_DSN")
    if not dsn:
        pytest.skip("No explicitly isolated DBDEP_TEST_DSN supplied")
    from dbdep.catalog import capture, inspect_catalog

    m = inspect_catalog(capture(dsn))
    assert not api().validate(m)
    assert api().impact(m, "sales.orders.total_amount")["affected"]
    assert any(e["properties"].get("via") == "pg_rewrite" for e in m["edges"])
    assert any(e["kind"] == "sequence_ownership" for e in m["edges"])
    assert any(e["kind"] == "trigger_association" for e in m["edges"])
    assert any(e["kind"] == "foreign_key" for e in m["edges"])
    assert any(e["kind"] == "partition" for e in m["edges"])
    assert any(n["properties"].get("internal") for n in m["nodes"])


@pytest.mark.live
def test_fixture_reader_cannot_read_business_rows():
    dsn = os.environ.get("DBDEP_TEST_DSN")
    if not dsn:
        pytest.skip("No explicitly isolated DBDEP_TEST_DSN supplied")
    import psycopg

    with psycopg.connect(dsn) as conn:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("SELECT id FROM public.customers")
