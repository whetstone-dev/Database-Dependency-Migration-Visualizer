import copy

import pytest

from dbdep.model import validate
from dbdep.rules import review
from test_engine import ROOT, ecommerce


@pytest.mark.parametrize("target", ["constraint", "finding", "unknown", "alias"])
def test_semantic_reference_validator_rejects_missing_objects(target):
    model = copy.deepcopy(
        review(ecommerce(), ROOT / "examples/ecommerce/migrations/003_contract_legacy_id.sql")[
            "model"
        ]
    )
    if target == "constraint":
        next(e for e in model["edges"] if "constraint" in e["properties"])["properties"][
            "constraint"
        ] = "absent"
    elif target == "finding":
        model["findings"][0]["object_ids"] = ["absent"]
    elif target == "unknown":
        model["unknowns"][0]["object_id"] = "absent"
    else:
        model["findings"][0]["evidence"] = ["absent"]
    assert validate(model)
