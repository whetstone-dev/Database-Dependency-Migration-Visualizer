#!/usr/bin/env python3
"""Create our own loopback PostgreSQL cluster, execute shipped fixtures, then stop.

This development utility does not accept any external database connection.
"""

import argparse
import os
import shutil
import socket
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--pg-bin", type=Path, help="Directory with initdb/pg_ctl; defaults to PATH")
    p.add_argument("--update-fixtures", action="store_true")
    a = p.parse_args()

    def binary(name):
        path = (
            a.pg_bin / (name + ".exe" if os.name == "nt" else name)
            if a.pg_bin
            else shutil.which(name)
        )
        if not path or not Path(path).is_file():
            raise ValueError("PostgreSQL initdb/pg_ctl missing; supply --pg-bin")
        return str(path)

    base = ROOT / "tmp"
    base.mkdir(exist_ok=True)
    if not base.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Fixture tmp path escapes repository")
    with tempfile.TemporaryDirectory(prefix="fixture-", dir=base) as tmp:
        directory = Path(tmp).resolve()
        if not directory.is_relative_to(base.resolve()):
            raise ValueError("Fixture directory escaped checked tmp root")
        data = directory / "data"
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]

        def run(command):
            # Windows postgres descendants can inherit captured pipe handles.
            # A local log avoids communicate() waiting for descendant EOF.
            with (directory / "commands.log").open("a", encoding="utf-8") as command_log:
                r = subprocess.run(
                    command,
                    stdin=subprocess.DEVNULL,
                    stdout=command_log,
                    stderr=command_log,
                    timeout=60,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                )
            if r.returncode:
                raise ValueError(
                    "Disposable PostgreSQL setup failed; inspect local PostgreSQL prerequisites"
                )

        run(
            [
                binary("initdb"),
                "-D",
                str(data),
                "-A",
                "trust",
                "-U",
                "dbdep_fixture",
                "--encoding=UTF8",
                "--no-locale",
            ]
        )
        started = False
        try:
            run(
                [
                    binary("pg_ctl"),
                    "-D",
                    str(data),
                    "-l",
                    str(directory / "server.log"),
                    "-o",
                    f"-h 127.0.0.1 -p {port}",
                    "-w",
                    "start",
                ]
            )
            started = True
            import psycopg
            from psycopg import sql

            fixture_databases = [
                ("dbdep_analytics", ["analytics/schema.sql"]),
                (
                    "dbdep_examples",
                    [
                        "analytics/schema.sql",
                        "ecommerce/schema.sql",
                        "tricky-identifiers/schema.sql",
                    ],
                ),
                ("dbdep_dynamic", ["dynamic-sql-unknown/schema.sql"]),
                ("dbdep_multi", ["multi-schema/schema.sql"]),
                ("dbdep_before", ["diff/before.sql"]),
                ("dbdep_after", ["diff/after.sql"]),
            ]

            with psycopg.connect(
                host="127.0.0.1",
                port=port,
                user="dbdep_fixture",
                dbname="postgres",
                autocommit=True,
            ) as c:
                for database, _ in fixture_databases:
                    c.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
                c.execute("CREATE ROLE dbdep_readonly LOGIN")
            for db, fixtures in fixture_databases:
                with psycopg.connect(
                    host="127.0.0.1", port=port, user="dbdep_fixture", dbname=db, autocommit=True
                ) as c:
                    for fixture in fixtures:
                        c.execute((ROOT / "examples" / fixture).read_text(encoding="utf-8"))
            print(
                "Executed all seven shipped schema/diff fixture files in isolated databases; no migration proposals executed."
            )
            from dbdep.catalog import capture
            from dbdep.model import canonical, digest

            readonly = f"host=127.0.0.1 port={port} user=dbdep_readonly dbname="
            if a.update_fixtures:
                captured = capture(readonly + "dbdep_analytics")
                out = ROOT / "examples/analytics/catalog.json"
                out.write_text(canonical(captured), encoding="utf-8", newline="\n")
                receipt = {
                    "server_version_num": captured["queries"]["server_version"]["rows"][0][
                        "version"
                    ],
                    "captured_at": captured["captured_at"],
                    "capture_sha256": digest(out.read_bytes()),
                    "schema_sha256": digest((ROOT / "examples/analytics/schema.sql").read_bytes()),
                    "command": "python scripts/fixture_cluster.py --pg-bin <PostgreSQL-bin> --update-fixtures",
                    "capture_role": "dbdep_readonly: LOGIN, no user-table SELECT grants",
                    "scope": "script-created isolated loopback fixture cluster",
                    "sql_executed": "shipped schema/diff fixtures only, never a migration proposal",
                }
                (ROOT / "examples/analytics/capture-provenance.json").write_text(
                    canonical(receipt), encoding="utf-8"
                )
            env = os.environ.copy()
            env["DBDEP_TEST_DSN"] = readonly + "dbdep_examples"
            result = subprocess.run(
                [sys.executable, "-m", "pytest", "tests/test_live.py", "-q"], cwd=ROOT, env=env
            )
            return result.returncode
        finally:
            if started:
                run([binary("pg_ctl"), "-D", str(data), "-m", "fast", "-w", "stop"])


if __name__ == "__main__":
    raise SystemExit(main())
