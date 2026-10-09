#!/usr/bin/env python3
"""Provision shipped fixtures on the explicitly isolated CI localhost service."""

import os
from pathlib import Path


def main():
    if os.environ.get("CI") != "true":
        raise ValueError(
            "This setup is restricted to the CI service; use fixture_cluster.py locally"
        )
    import psycopg
    from psycopg.conninfo import conninfo_to_dict

    dsn = os.environ["DBDEP_FIXTURE_OWNER_DSN"]
    options = conninfo_to_dict(dsn)
    if options.get("host") != "127.0.0.1" or options.get("dbname") != "dbdep_examples":
        raise ValueError("Fixture service must be the dedicated localhost database")
    root = Path(__file__).resolve().parents[1]
    with psycopg.connect(dsn, autocommit=True) as conn:
        for name in ["analytics", "ecommerce", "tricky-identifiers"]:
            conn.execute((root / "examples" / name / "schema.sql").read_text())
        conn.execute("CREATE ROLE dbdep_readonly LOGIN")


if __name__ == "__main__":
    main()
