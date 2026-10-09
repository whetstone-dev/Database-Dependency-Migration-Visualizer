import json
from pathlib import Path

from jsonschema import Draft202012Validator

from dbdep.rules import review
from test_engine import ecommerce

ROOT = Path(__file__).resolve().parents[1]


def test_review_envelope_and_findings_have_valid_schema(tmp_path):
    migration = tmp_path / "migration.sql"
    migration.write_text("ALTER TABLE public.customers ALTER COLUMN id TYPE uuid", encoding="utf-8")
    report = review(ecommerce(), migration)
    for name, value in [
        ("findings", report["model"]["findings"]),
        ("report", {k: v for k, v in report.items() if k != "model"}),
    ]:
        schema = json.loads((ROOT / f"schemas/{name}.schema.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        assert list(Draft202012Validator(schema).iter_errors(value)) == []


def test_every_migration_unknown_blocks_unknown_policy(tmp_path):
    from dbdep.cli import parser, run
    from dbdep.model import canonical

    baseline = tmp_path / "baseline.dbdep.json"
    baseline.write_text(canonical(ecommerce()), encoding="utf-8")
    migration = tmp_path / "replace.sql"
    migration.write_text(
        "CREATE OR REPLACE VIEW public.customer_summary AS SELECT id FROM public.customers;",
        encoding="utf-8",
    )
    args = parser().parse_args(
        [
            "review",
            "--baseline",
            str(baseline),
            "--migration",
            str(migration),
            "--out",
            str(tmp_path / "review"),
            "--fail-on",
            "unknown",
        ]
    )
    result, exit_code = run(args)
    assert exit_code == 3
    assert result["policy_passed"] is False
    assert (tmp_path / "review/report.html").exists()
