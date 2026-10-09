# Independent creator grading audit

This audit follows the installed skill-creator agents/grader.md workflow. One independent grader read all sixteen executor responses and their execution receipts, then examined the actual canonical JSON, review/comparison records, source evidence, stored graph paths and HTML envelopes. grade-artifacts.mjs derives its checks from saved artifacts without importing either dependency engine, connecting to a database or executing proposal SQL. It uses Ajv for the frozen schema and Node built-ins for hashing, identifiers, path traversal and cross-artifact equality.

## Results

{
  "new_skill": {
    "passed": 25,
    "failed": 0,
    "total": 25,
    "runs": 8,
    "commands": 48
  },
  "old_skill": {
    "passed": 25,
    "failed": 0,
    "total": 25,
    "runs": 8,
    "commands": 49
  }
}

Each configuration has eight cases and one actual run per case. All twenty-five original assertions pass for both configurations. This establishes assertion parity on the supplied fixtures; it does not establish stronger performance, production readiness, exhaustive consumers or superiority of either implementation. The two executors each share one context across eight cases, so trials are not independent model samples and ordering contamination is possible. All recorded commands are retained, including the corrected new case-7 checker failure and the old case-6 intentional ambiguous-selector failure.

## Material issues not covered by the assertions

1. Both frozen case-3 review JSON plans instruct UUID mapping during a numeric(12,2)-to-double-precision/index migration. The original assertions test transaction prohibition, conditional locking, provenance and HTML, but do not test plan relevance. The old response explicitly warns about the generic plan. The new response proposes a sensible amount/index review sequence but does not disclose the contradictory UUID guidance in its linked generated report. A pass on the four assertions must not hide this safety and communication defect. The parent reports a later checkout fix; that state is outside this frozen evaluation and is not credited here.
2. Case 1 was not a strictly equal review proposal comparison. The new runner used the additional ecommerce/migrations/003_contract_legacy_id.sql (not listed as a case-1 input), including a child-column drop. The old runner authored a one-statement hypothetical UUID type alteration. Their baseline impact graphs agree, but their finding totals and review scope are not directly comparable. The new runner’s concrete uuid-plan.md and the old response both address orders and addresses, key/default semantics, writer coordination, validation, consumer transition and retained-data recovery. Neither executes or validates that plan against real production data.
3. Case 6 requires partitioning and composite foreign keys in its prompt, but no original assertion checks them. The independent audit verified the child-to-parent partition edge and both ordered FK column mappings; future assertions should require them. The fixture tests built-in routine types only; tricky quoted user-defined argument type names and cross-adapter spelling remain outside this evaluation.
4. Artifact consistency checks can replicate the same semantic error across JSON/HTML/Markdown. The grader additionally inspected source-backed FK/view/query paths, catalog pg_depend addresses/query hashes, ambiguous rename status and absent fabricated dynamic edges. An independent PostgreSQL binding oracle, malformed-model negatives, hostile embedded inputs and runtime-caller evidence would make the evaluation more discriminating.
5. HTML structure, offline resource declarations, CSP and embedded-state equality were inspected. Neither executor performed browser interaction, accessibility or visual testing in these runs. Separate parent-owned browser validation does not retroactively become evaluation evidence.
6. Catalog evidence is genuine supplied snapshot metadata and retains captured time/query hashes, but the evaluation does not discover a live server or establish capture freshness. No migration SQL was executed. Process no-execution claims are supported by retained argv/logs and the analysis-only interface; independent sandbox network/process telemetry was not supplied.
7. Both case-2 responses mislabel the pg_depend evidence source_hash as the SQL/source-query hash. The quoted sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 is the independently reproduced fingerprint of the canonical query payload (rows plus sql_hash). The actual captured query-text sql_hash is sha256:49abd0415a10073d639817a880d5dde3f3932083d8924626255a0f298414b9be. Grounded rows and model evidence are correct, so the original catalog-evidence assertion passes, but the extra factual hash-label claim fails in both grading files. Add an assertion requiring this provenance distinction. A later instruction clarification in the final checkout is outside this frozen evaluation.
8. Neither per-case assistant duration nor token telemetry is available. Grading files omit timing and execution_metrics. Recorded tool-command wall times, where present, cannot be substituted for complete model-run latency or tokens.

## Frozen source and provenance

The new_skill snapshot is version 0.3.0, archive SHA-256 7c3dbb162346a78a7074988c8d214045fffc8cdf3d5a1cb7be7375777e44c0fd; all 88 pre-run source hashes still match the frozen files. All 260 historical source hashes and 15 copied input hashes also match their pre-run manifests. Historical old_skill is separately archived v0.2.0, archive SHA-256 ddee0c5d1ac771f727c758203745e20c33a21a0c5d2edb3e24237f035d98284b, using the Python implementation; its generated bytecode caches are runtime byproducts rather than edited source and are separately disclosed by old-skill-run-audit.json. Final checkout/docs/UI/planner fixes and eventual release artifacts must carry their own verification receipt and must not be represented as the exact frozen bytes tested here. No user_notes.md file was found in any output directory. The retained responses themselves provide coverage limits and workarounds.

## Reproducible artifact checks

Run with the repository dependency installation available:

```powershell
node ../database-dependency-migration-workspace/iteration-2/grade-artifacts.mjs .
```

During grader helper development, encoded CSP apostrophes, virtual metadata paths, snapshot-scoped paths and HTML envelope field names were normalized to the actual formats; these were grader interpretation corrections and no executor output was edited. The final checks below are the corrected substantive checks. The helper regenerates only grading.json files and this analysis. It reads and leaves executor outputs/source manifests unchanged. 103 independent artifact/provenance/process checks were performed; 0 failed. This count is not the number of creator assertions or model-tool calls.

| Configuration | Case | Assertions | Models inspected | Recorded commands | Nonzero exits |
|---|---:|---:|---:|---:|---|
| new_skill | 1 | 5/5 | 2 | 12 | none |
| new_skill | 2 | 3/3 | 2 | 7 | none |
| new_skill | 3 | 4/4 | 2 | 4 | none |
| new_skill | 4 | 3/3 | 1 | 5 | none |
| new_skill | 5 | 2/2 | 5 | 6 | none |
| new_skill | 6 | 3/3 | 2 | 8 | none |
| new_skill | 7 | 3/3 | 1 | 6 | 1 |
| new_skill | 8 | 2/2 | 0 | 0 | none |
| old_skill | 1 | 5/5 | 2 | 9 | none |
| old_skill | 2 | 3/3 | 2 | 7 | none |
| old_skill | 3 | 4/4 | 2 | 4 | none |
| old_skill | 4 | 3/3 | 1 | 5 | none |
| old_skill | 5 | 2/2 | 5 | 6 | none |
| old_skill | 6 | 3/3 | 2 | 11 | 2 |
| old_skill | 7 | 3/3 | 1 | 5 | none |
| old_skill | 8 | 2/2 | 1 | 2 | none |

Artifact counts and SHA-256 receipts from the independent inspection:

```json
[
  {
    "id": 1,
    "config": "new_skill",
    "summary": {
      "passed": 5,
      "failed": 0,
      "total": 5,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "ecommerce.dbdep.json",
        "counts": {
          "nodes": 52,
          "edges": 98,
          "evidence": 12,
          "findings": 0,
          "unknowns": 8
        },
        "sha256": "11e2fe89fbc9bfec6e76434d83cf05e7aee7a09c4f1cf4a6b95821a7ce46d524",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "review/model.dbdep.json",
        "counts": {
          "nodes": 52,
          "edges": 98,
          "evidence": 14,
          "findings": 10,
          "unknowns": 8
        },
        "sha256": "5ec7de35b27a679f7abeb4c79b6455129c2c9fec5dbae02c40836c30b9075bb9",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 12,
    "nonzero": [],
    "response_sha256": "1b5f0a33776db018145238d74e20221199e0f0502359c9815c0f5d8bb373038d",
    "notes_present": false
  },
  {
    "id": 2,
    "config": "new_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "catalog.dbdep.json",
        "counts": {
          "nodes": 22,
          "edges": 29,
          "evidence": 43,
          "findings": 0,
          "unknowns": 1
        },
        "sha256": "fdf2724d5a3de182c0e694547e8d4d3bbff0f7f1a65c7199daf2ef1196632fdf",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "schema.dbdep.json",
        "counts": {
          "nodes": 11,
          "edges": 12,
          "evidence": 5,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "37b55f3fce622120147226302683f42ef76ab5064bff8a4f38047bf746a016d1",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 7,
    "nonzero": [],
    "response_sha256": "c17273fd715d8718c72b7fdb68d2bf643f2318f365057e4185b020dd6ddfe590",
    "notes_present": false
  },
  {
    "id": 3,
    "config": "new_skill",
    "summary": {
      "passed": 4,
      "failed": 0,
      "total": 4,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "baseline.dbdep.json",
        "counts": {
          "nodes": 50,
          "edges": 88,
          "evidence": 10,
          "findings": 0,
          "unknowns": 8
        },
        "sha256": "b89f4e1da445a062cb846c10283b5aef878d95ad944f06281705367bef0bbc73",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "review/model.dbdep.json",
        "counts": {
          "nodes": 50,
          "edges": 88,
          "evidence": 16,
          "findings": 4,
          "unknowns": 8
        },
        "sha256": "2aa570212e5879ddb4e0667e8f0ee144c80bd32a0c00cf264966d89832a4ff0f",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 4,
    "nonzero": [],
    "response_sha256": "cd00bf976a20b741a82af7a5a6762b65e2f9ef4e38f670828c6d2d515add84a1",
    "notes_present": false
  },
  {
    "id": 4,
    "config": "new_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "model.dbdep.json",
        "counts": {
          "nodes": 6,
          "edges": 7,
          "evidence": 4,
          "findings": 0,
          "unknowns": 2
        },
        "sha256": "45cd3da673f8e14805023cbc74022813e39b16cbae6ad85b2a9d828b3819966b",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 5,
    "nonzero": [],
    "response_sha256": "137d51cd38ad498e184d7d66d31620f845945ecdca5dca2842b38011e1260885",
    "notes_present": false
  },
  {
    "id": 5,
    "config": "new_skill",
    "summary": {
      "passed": 2,
      "failed": 0,
      "total": 2,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "after.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "14eb65309c04e39e0a176091dfe6c7eb77b0a6aede27485a126dbd23cb603e2f",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "before.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "777da891502df5585ba953615f047f4344dccac875b9c78a46d1bd80fec6b922",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "comparison/after.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "14eb65309c04e39e0a176091dfe6c7eb77b0a6aede27485a126dbd23cb603e2f",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "comparison/before.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "777da891502df5585ba953615f047f4344dccac875b9c78a46d1bd80fec6b922",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "comparison/model.dbdep.json",
        "counts": {
          "nodes": 5,
          "edges": 5,
          "evidence": 2,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "55849af3fd7bcfb80caece9e035771b66f431e63fb6d45aa4eb363b32b22579a",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 6,
    "nonzero": [],
    "response_sha256": "eee848f08bca2e5eebfe3d43b356eeff812989085a4b460f2fc5034bef22cd77",
    "notes_present": false
  },
  {
    "id": 6,
    "config": "new_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "multi-schema.dbdep.json",
        "counts": {
          "nodes": 8,
          "edges": 6,
          "evidence": 4,
          "findings": 0,
          "unknowns": 2
        },
        "sha256": "96aa7e37247b4e425e5c687ed07f445341b0461994ee7ae92354603bd6bb8bc6",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "tricky-identifiers.dbdep.json",
        "counts": {
          "nodes": 14,
          "edges": 19,
          "evidence": 7,
          "findings": 0,
          "unknowns": 3
        },
        "sha256": "2e8c34be8a4fa92e8cf9456936f481a2816c78788d5959005b4374cbd0cf3ee5",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 8,
    "nonzero": [],
    "response_sha256": "addeb450e86ad7f83ae486b5098416af76d08b18202a97d3370a4970cd716a24",
    "notes_present": false
  },
  {
    "id": 7,
    "config": "new_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "ecommerce.dbdep.json",
        "counts": {
          "nodes": 50,
          "edges": 88,
          "evidence": 10,
          "findings": 0,
          "unknowns": 8
        },
        "sha256": "b89f4e1da445a062cb846c10283b5aef878d95ad944f06281705367bef0bbc73",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 6,
    "nonzero": [
      1
    ],
    "response_sha256": "7c4a97754e1ed9725f403612dae7db0dd43c3aeaec5d9690e792c760c2b50c84",
    "notes_present": false
  },
  {
    "id": 8,
    "config": "new_skill",
    "summary": {
      "passed": 2,
      "failed": 0,
      "total": 2,
      "pass_rate": 1
    },
    "models": [],
    "commands": 0,
    "nonzero": [],
    "response_sha256": "460ff76c2cdca9134cc8cc6506c10ef269dac933f8bef4f66f5839a7c73fdcee",
    "notes_present": false
  },
  {
    "id": 1,
    "config": "old_skill",
    "summary": {
      "passed": 5,
      "failed": 0,
      "total": 5,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "review/model.dbdep.json",
        "counts": {
          "nodes": 52,
          "edges": 98,
          "evidence": 13,
          "findings": 5,
          "unknowns": 8
        },
        "sha256": "756e08b213014cea0f645664c0a03a4ba6c72ee4a04cd6a1b6b8b1b171a739b8",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "schema.dbdep.json",
        "counts": {
          "nodes": 52,
          "edges": 98,
          "evidence": 12,
          "findings": 0,
          "unknowns": 8
        },
        "sha256": "11e2fe89fbc9bfec6e76434d83cf05e7aee7a09c4f1cf4a6b95821a7ce46d524",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 9,
    "nonzero": [],
    "response_sha256": "3069341af4f2be37be22a24ab014f153f5499e15f3de1fa16fa2190ef3641846",
    "notes_present": false
  },
  {
    "id": 2,
    "config": "old_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "catalog.dbdep.json",
        "counts": {
          "nodes": 22,
          "edges": 29,
          "evidence": 43,
          "findings": 0,
          "unknowns": 1
        },
        "sha256": "9e6c2a0aff5eda084a5bba5f38e2afe44d264d25825832984005bae22d817d54",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "ddl.dbdep.json",
        "counts": {
          "nodes": 11,
          "edges": 12,
          "evidence": 5,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "37b55f3fce622120147226302683f42ef76ab5064bff8a4f38047bf746a016d1",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 7,
    "nonzero": [],
    "response_sha256": "d0ca8570e6d99a79af79aedf477f23c5d12e8abef7ebfda3505f3544152ba77a",
    "notes_present": false
  },
  {
    "id": 3,
    "config": "old_skill",
    "summary": {
      "passed": 4,
      "failed": 0,
      "total": 4,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "baseline.dbdep.json",
        "counts": {
          "nodes": 50,
          "edges": 88,
          "evidence": 10,
          "findings": 0,
          "unknowns": 8
        },
        "sha256": "b89f4e1da445a062cb846c10283b5aef878d95ad944f06281705367bef0bbc73",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "review/model.dbdep.json",
        "counts": {
          "nodes": 50,
          "edges": 88,
          "evidence": 16,
          "findings": 4,
          "unknowns": 8
        },
        "sha256": "2aa570212e5879ddb4e0667e8f0ee144c80bd32a0c00cf264966d89832a4ff0f",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 4,
    "nonzero": [],
    "response_sha256": "48f51bb97fd7489b215a3f3ac28d0bc339fb3b393c5cc3f011311215a7f12c5e",
    "notes_present": false
  },
  {
    "id": 4,
    "config": "old_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "schema.dbdep.json",
        "counts": {
          "nodes": 6,
          "edges": 7,
          "evidence": 4,
          "findings": 0,
          "unknowns": 2
        },
        "sha256": "45cd3da673f8e14805023cbc74022813e39b16cbae6ad85b2a9d828b3819966b",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 5,
    "nonzero": [],
    "response_sha256": "5ebb0d8bb11cbc6b7d50c7b07e9db089005260002c04dbb91c0e7e9401046042",
    "notes_present": false
  },
  {
    "id": 5,
    "config": "old_skill",
    "summary": {
      "passed": 2,
      "failed": 0,
      "total": 2,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "after.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "14eb65309c04e39e0a176091dfe6c7eb77b0a6aede27485a126dbd23cb603e2f",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "before.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "777da891502df5585ba953615f047f4344dccac875b9c78a46d1bd80fec6b922",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "comparison/after.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "14eb65309c04e39e0a176091dfe6c7eb77b0a6aede27485a126dbd23cb603e2f",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "comparison/before.dbdep.json",
        "counts": {
          "nodes": 4,
          "edges": 4,
          "evidence": 1,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "777da891502df5585ba953615f047f4344dccac875b9c78a46d1bd80fec6b922",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "comparison/model.dbdep.json",
        "counts": {
          "nodes": 5,
          "edges": 5,
          "evidence": 2,
          "findings": 0,
          "unknowns": 0
        },
        "sha256": "55849af3fd7bcfb80caece9e035771b66f431e63fb6d45aa4eb363b32b22579a",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 6,
    "nonzero": [],
    "response_sha256": "9fd71a8923f50420390ace2974e625af4f699f57ad9ee62c51b21876bb25dc60",
    "notes_present": false
  },
  {
    "id": 6,
    "config": "old_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "multi-schema.dbdep.json",
        "counts": {
          "nodes": 8,
          "edges": 6,
          "evidence": 4,
          "findings": 0,
          "unknowns": 2
        },
        "sha256": "96aa7e37247b4e425e5c687ed07f445341b0461994ee7ae92354603bd6bb8bc6",
        "integrity": true,
        "provenance": true
      },
      {
        "file": "tricky-identifiers.dbdep.json",
        "counts": {
          "nodes": 14,
          "edges": 19,
          "evidence": 7,
          "findings": 0,
          "unknowns": 3
        },
        "sha256": "babd8b84eefd803769276b9270569014ce9d695db0c7b2a0319908e95f089e9e",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 11,
    "nonzero": [
      2
    ],
    "response_sha256": "ea06abe40bdba78d2b334d5592b9e7e93267ecbbbbd9ffb6180b6f5da215f9fb",
    "notes_present": false
  },
  {
    "id": 7,
    "config": "old_skill",
    "summary": {
      "passed": 3,
      "failed": 0,
      "total": 3,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "schema.dbdep.json",
        "counts": {
          "nodes": 50,
          "edges": 88,
          "evidence": 10,
          "findings": 0,
          "unknowns": 8
        },
        "sha256": "b89f4e1da445a062cb846c10283b5aef878d95ad944f06281705367bef0bbc73",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 5,
    "nonzero": [],
    "response_sha256": "70ef4f324518386294c19895c88bba751bb0cb24fc55f77167a18ccbe063d5bb",
    "notes_present": false
  },
  {
    "id": 8,
    "config": "old_skill",
    "summary": {
      "passed": 2,
      "failed": 0,
      "total": 2,
      "pass_rate": 1
    },
    "models": [
      {
        "file": "review/model.dbdep.json",
        "counts": {
          "nodes": 0,
          "edges": 0,
          "evidence": 2,
          "findings": 7,
          "unknowns": 2
        },
        "sha256": "4b7e2efae65010580654049aa24ceecb96d6898953eb0f8e745b382e1b7da87a",
        "integrity": true,
        "provenance": true
      }
    ],
    "commands": 2,
    "nonzero": [],
    "response_sha256": "9f96dc7b687de7a0cf7140ad7e0ac5590b0f1fce0211d9f4abcff2f5fb6eadb5",
    "notes_present": false
  }
]
```

