import copy
import json

from test_engine import api, ecommerce
from test_reports_cli import cli


def test_schema_error_never_echoes_dsn_password(tmp_path):
    m = copy.deepcopy(ecommerce())
    m["engine"]["version"] = "postgresql://user:unique-secret@host/db"
    p = tmp_path / "bad.json"
    p.write_text(json.dumps(m))
    result = cli("validate", p, "--json")
    assert result.returncode == 2
    assert "unique-secret" not in result.stdout + result.stderr


def test_malicious_type_cannot_add_operations():
    import pytest

    with pytest.raises(ValueError):
        api().impact(
            ecommerce(), "public.customers.id", "alter-type", "uuid; DROP TABLE public.customers"
        )


def test_review_metadata_does_not_persist_extra_secret_values(tmp_path):
    from dbdep.rules import review

    p = tmp_path / "m.sql"
    p.write_text("CREATE INDEX x ON public.orders(id)")
    import pytest

    with pytest.raises(ValueError):
        review(ecommerce(), p, metadata={"public.orders": {"password": "unique-secret"}})


def test_validator_diagnostics_do_not_echo_secrets_in_invalid_references():
    import copy
    from dbdep.model import validate
    from test_engine import ecommerce

    model = copy.deepcopy(ecommerce())
    secret = "postgresql://user:private-value@host/db"
    model["edges"][0]["id"] = secret
    model["edges"][0]["target"] = "absent"
    model["edges"][0]["evidence_ids"] = [secret]
    model["evidence"][0]["path"] = secret
    model["evidence"][1]["path"] = secret
    model["evidence"][1]["source_hash"] = "sha256:" + "0" * 64
    errors = validate(model)
    assert errors
    assert "private-value" not in str(errors)
