import pytest

from test_engine import api, ecommerce


def review(tmp_path, sql, model=None, **options):
    from dbdep.rules import review

    p = tmp_path / "migration.sql"
    p.write_text(sql, encoding="utf-8")
    return review(ecommerce() if model is None else model, p, **options)


@pytest.mark.parametrize(
    "rule,positive,negative",
    [
        ("DDM001", "ALTER TABLE public.customers DROP COLUMN email", "SELECT 1"),
        ("DDM002", "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid", "SELECT 1"),
        (
            "DDM003",
            "ALTER TABLE public.customers ALTER COLUMN name SET NOT NULL",
            "ALTER TABLE public.customers ALTER COLUMN name DROP NOT NULL",
        ),
        (
            "DDM004",
            "ALTER TABLE public.customers ADD COLUMN code int DEFAULT 1",
            "ALTER TABLE public.customers ADD COLUMN code int",
        ),
        (
            "DDM005",
            "CREATE INDEX customer_name ON public.customers(name)",
            "CREATE INDEX CONCURRENTLY customer_name ON public.customers(name)",
        ),
        (
            "DDM006",
            "BEGIN; CREATE INDEX CONCURRENTLY customer_name ON public.customers(name); COMMIT;",
            "CREATE INDEX CONCURRENTLY customer_name ON public.customers(name)",
        ),
        (
            "DDM007",
            "ALTER TABLE public.orders ADD CONSTRAINT c CHECK (total_amount > 0)",
            "ALTER TABLE public.orders VALIDATE CONSTRAINT c",
        ),
        (
            "DDM008",
            "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
            "ALTER TABLE public.products ALTER COLUMN price TYPE float8",
        ),
        (
            "DDM009",
            "ALTER TABLE public.customers RENAME COLUMN email TO email_address",
            "ALTER TABLE public.customers RENAME TO clients",
        ),
        ("DDM010", "DROP TABLE public.customers CASCADE", "DROP TABLE public.products RESTRICT"),
        (
            "DDM011",
            "ALTER TABLE public.orders DROP COLUMN customer_id",
            "ALTER TABLE public.orders ADD COLUMN extra text",
        ),
        ("DDM012", "CREATE INDEX customer_name ON public.customers(name)", "SELECT 1"),
        ("DDM013", "DO $$ BEGIN NULL; END $$", "SELECT 1"),
        (
            "DDM014",
            "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
            "ALTER TABLE public.customers ALTER COLUMN name TYPE varchar",
        ),
        (
            "DDM015",
            "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid",
            "ALTER TABLE public.customers ALTER COLUMN name TYPE varchar",
        ),
    ],
)
def test_each_rule_has_positive_and_negative_case(tmp_path, rule, positive, negative):
    assert rule in {f["rule_id"] for f in review(tmp_path, positive)["model"]["findings"]}
    assert rule not in {f["rule_id"] for f in review(tmp_path, negative)["model"]["findings"]}


def test_review_report_is_valid_and_phased(tmp_path):
    r = review(tmp_path, "ALTER TABLE public.customers ALTER COLUMN id TYPE uuid")
    assert api().validate(r["model"]) == []
    assert [p["phase"] for p in r["plan"]] == [
        "expand",
        "backfill",
        "validate",
        "transition",
        "contract",
    ]
    assert all(p["preconditions"] and p["verification"] and p["recovery"] for p in r["plan"])
    f = next(f for f in r["model"]["findings"] if f["rule_id"] == "DDM002")
    assert f["risk_level"] == "high" and "bigint" in f["reason"].lower()
    assert "uuid" in f["reason"]


def test_fast_constant_default_vs_volatile_and_old_version(tmp_path):
    r = review(tmp_path, "ALTER TABLE public.customers ADD COLUMN x int DEFAULT 1")
    f = next(f for f in r["model"]["findings"] if f["rule_id"] == "DDM004")
    assert "fast" in f["reason"].lower() and f["risk_level"] == "medium"
    r = review(tmp_path, "ALTER TABLE public.customers ADD COLUMN x float DEFAULT random()")
    assert (
        next(f for f in r["model"]["findings"] if f["rule_id"] == "DDM004")["risk_level"] == "high"
    )
    m = ecommerce()
    m["engine"]["version"] = "10"
    r = review(tmp_path, "ALTER TABLE public.customers ADD COLUMN x int DEFAULT 1", model=m)
    assert (
        next(f for f in r["model"]["findings"] if f["rule_id"] == "DDM004")["risk_level"] == "high"
    )


def test_rollback_to_savepoint_does_not_end_transaction(tmp_path):
    r = review(
        tmp_path,
        "BEGIN; SAVEPOINT s; ROLLBACK TO SAVEPOINT s; CREATE INDEX CONCURRENTLY x ON public.orders(id); COMMIT;",
    )
    assert "DDM006" in {f["rule_id"] for f in r["model"]["findings"]}


def test_external_transaction_context_and_missing_baseline(tmp_path):
    r = review(
        tmp_path, "CREATE INDEX CONCURRENTLY x ON public.orders(id)", transaction_mode="single"
    )
    assert "DDM006" in {f["rule_id"] for f in r["model"]["findings"]}
    from dbdep.rules import review as run

    p = tmp_path / "migration.sql"
    p.write_text("ALTER TABLE unseen DROP COLUMN id")
    r = run(None, p)
    assert r["model"]["unknowns"] and "DDM001" in {f["rule_id"] for f in r["model"]["findings"]}


def test_literals_comments_do_not_trigger_rules(tmp_path):
    r = review(
        tmp_path,
        "SELECT 'BEGIN; CREATE INDEX CONCURRENTLY x ON t(id);'; -- DROP TABLE customers CASCADE",
    )
    assert not r["model"]["findings"]


def test_not_valid_supported_only_check_foreign(tmp_path):
    r = review(
        tmp_path,
        "ALTER TABLE public.orders ADD CONSTRAINT positive CHECK (total_amount > 0) NOT VALID",
    )
    f = next(f for f in r["model"]["findings"] if f["rule_id"] == "DDM007")
    assert "already NOT VALID" in f["reason"]
    r = review(tmp_path, "ALTER TABLE public.orders ADD CONSTRAINT uid UNIQUE(id)")
    assert "DDM007" not in {f["rule_id"] for f in r["model"]["findings"]}
