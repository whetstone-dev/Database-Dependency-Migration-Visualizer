# Review report contract

The renderer emits snapshot identity and counts, deterministic findings, coverage/unknowns, phased plan, affected paths, object inventory, edge inventory and evidence inventory. `src/dbdep/reports.py` implements this contract; do not hand-edit generated reports. See `schemas/report.schema.json` for the machine-readable review envelope.
