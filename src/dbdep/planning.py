"""Review-only operational plans. Deliberately no SQL execution or rollback promise."""


def plan(findings):
    if not findings:
        return []
    phases = [
        (
            "expand",
            "Add nullable replacement columns or compatible interfaces; design UUID mapping and new keys before changing identifier types.",
            "Confirm PostgreSQL version, backups, ownership, consumers and feasible mapping. Review privileges and lock budget.",
            "Rehearse DDL on a disposable database with representative data. Verify identity/sequence/default semantics.",
            "Stop deployment before consumers depend on the new fields; keep old fields available.",
        ),
        (
            "backfill",
            "Backfill bounded, resumable batches using reviewed transformation logic and coordinated dual writers.",
            "Prove mapping uniqueness, handle concurrent writes and define throttling. Numeric identifiers do not have a general UUID cast.",
            "Check mapping completeness, uniqueness, NULL rates and FK consistency under concurrent traffic.",
            "Pause batches and preserve old data; restore from tested backup only under an approved recovery procedure.",
        ),
        (
            "validate",
            "Validate CHECK/FK constraints where NOT VALID is supported. Build concurrent indexes outside transaction blocks when appropriate.",
            "Confirm constraint support, partition restrictions, existing violations and resource budget. Concurrent index failure can leave an invalid index.",
            "Check constraint validation and pg_index.indisvalid/indisready, compare old/new results and observe lock waits.",
            "Investigate failed validation or invalid indexes; repair/retry through separate authorized tooling.",
        ),
        (
            "transition",
            "Deploy compatible readers/writers and transition dependent FKs, views, functions, API/ORM contracts and downstream jobs.",
            "Obtain explicit consumer ownership and deployment-order evidence. Account for UNKNOWN and dynamic SQL paths.",
            "Observe application errors and old-field usage through an agreed window. Static graph paths do not prove runtime coverage.",
            "Revert application reads only while both representations remain consistent; otherwise prefer roll-forward.",
        ),
        (
            "contract",
            "Remove legacy objects only after verified transition and a separate destructive-change review.",
            "Confirm no remaining consumers, validated keys, tested backups and signed-off CASCADE consequences. Schedule lock acquisition.",
            "Reinspect schema, compare snapshots and run application integration checks. Do not promise zero downtime.",
            "Drops can lose data. Reverse DDL does not restore it; use tested recovery or roll-forward with an operator.",
        ),
    ]
    return [
        {
            "phase": p,
            "action": a,
            "preconditions": pre,
            "verification": v,
            "recovery": r,
            "review_only": True,
        }
        for p, a, pre, v, r in phases
    ]
