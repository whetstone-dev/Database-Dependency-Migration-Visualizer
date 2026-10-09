"""Independent review reproducers: missing dependencies must never look safe."""

import pytest

from dbdep import engine
from dbdep.rules import review


def snapshot(tmp_path, sql):
    path = tmp_path / "schema.sql"
    path.write_text(sql, encoding="utf-8")
    return engine.inspect_ddl(path)


def test_simple_dml_targets_and_written_columns_are_consumers(tmp_path):
    schema = tmp_path / "schema.sql"
    schema.write_text("CREATE TABLE public.t(id int, a int);", encoding="utf-8")
    repo = tmp_path / "app"
    repo.mkdir()
    (repo / "writes.sql").write_text(
        "INSERT INTO public.t(a) VALUES(1); "
        "UPDATE public.t AS target SET a=1 WHERE target.id=2; "
        "DELETE FROM public.t WHERE a>0;",
        encoding="utf-8",
    )
    model = engine.inspect_ddl(schema, repo)
    queries = {n["id"] for n in model["nodes"] if n["kind"] == "query"}
    assert len(queries) == 3
    assert queries <= set(engine.impact(model, "public.t")["affected"])
    assert queries <= set(engine.impact(model, "public.t.a")["affected"])
    assert engine.validate(model) == []


@pytest.mark.parametrize(
    "migration",
    [
        "CREATE OR REPLACE VIEW public.v AS SELECT b AS a FROM public.t;",
        "ALTER TABLE public.t RENAME TO renamed;",
        "DROP INDEX public.t_a_idx;",
        "DROP VIEW public.v;",
        "ALTER TABLE public.t ADD CONSTRAINT u UNIQUE(a);",
        "ALTER TABLE public.t ADD COLUMN required int NOT NULL;",
        "ALTER FUNCTION public.f(int) RENAME TO renamed;",
    ],
)
def test_unassessed_migrations_have_unknown_findings_and_plan(tmp_path, migration):
    model = snapshot(
        tmp_path,
        "CREATE TABLE public.t(a int,b int); "
        "CREATE VIEW public.v AS SELECT a FROM public.t; "
        "CREATE INDEX t_a_idx ON public.t(a);",
    )
    path = tmp_path / "migration.sql"
    path.write_text(migration, encoding="utf-8")
    result = review(model, path, metadata={"public.t": {"size_bytes": 1000, "traffic": "low"}})
    assert any(f["rule_id"] == "DDM013" for f in result["model"]["findings"])
    assert result["risk_level"] in {"unknown", "high"}
    assert result["plan"]


def test_ambiguous_custom_type_is_unknown_and_has_no_direct_edge(tmp_path):
    model = snapshot(
        tmp_path,
        "CREATE TYPE s1.mood AS ENUM('ok'); CREATE TYPE s2.mood AS ENUM('bad'); "
        "CREATE TABLE public.t(a mood);",
    )
    col = engine.select(model, "public.t.a")
    assert not any(
        e["source"] == col["id"] and e["kind"] == "type_reference" for e in model["edges"]
    )
    assert any(
        "Ambiguous" in u["explanation"] and "type" in u["explanation"] for u in model["unknowns"]
    )


def test_distinct_unnamed_checks_have_stable_synthetic_identity(tmp_path):
    before = snapshot(tmp_path, "CREATE TABLE public.t(a int CHECK(a>0) CHECK(a<10));")
    after = snapshot(tmp_path, "CREATE TABLE public.t(a int CHECK(a<10));")
    checks = [n for n in before["nodes"] if n["properties"].get("constraint_type") == "check"]
    assert len(checks) == 2
    assert all(n["properties"]["name_inferred"] for n in checks)
    changes = engine.diff(before, after)
    assert len(changes["removed"]) == 1
    assert len(set(n["id"] for n in checks) & {n["id"] for n in after["nodes"]}) == 1


def test_multiple_unnamed_fks_on_same_column_remain_distinct(tmp_path):
    prefix = "CREATE TABLE p(id int PRIMARY KEY); CREATE TABLE q(id int PRIMARY KEY); "
    before = snapshot(tmp_path, prefix + "CREATE TABLE t(a int REFERENCES p(id) REFERENCES q(id));")
    after = snapshot(tmp_path, prefix + "CREATE TABLE t(a int REFERENCES q(id));")
    keys = [n for n in before["nodes"] if n["properties"].get("constraint_type") == "foreign_key"]
    assert len(keys) == 2
    removed = engine.diff(before, after)["removed"]
    assert len(removed) == 1
    assert removed[0] in {n["id"] for n in keys}


def test_redundant_unnamed_fks_keep_occurrence_identity(tmp_path):
    prefix = "CREATE TABLE p(id int PRIMARY KEY); "
    before = snapshot(tmp_path, prefix + "CREATE TABLE t(a int REFERENCES p(id) REFERENCES p(id));")
    after = snapshot(tmp_path, prefix + "CREATE TABLE t(a int REFERENCES p(id));")
    assert (
        len([n for n in before["nodes"] if n["properties"].get("constraint_type") == "foreign_key"])
        == 2
    )
    assert len(engine.diff(before, after)["removed"]) == 1
