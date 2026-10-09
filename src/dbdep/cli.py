"""Analysis-only CLI. Exit 2: invalid input; exit 3: requested policy gate failed."""

import argparse
import copy
import importlib.metadata
import json
import os
import sys
from pathlib import Path

from . import __version__
from .graph import diff, impact, select
from .model import Builder, canonical, resources, validate
from .reports import bundle, dot, markdown, mermaid, render, require_valid, summary, write
from .rules import review
from .sql import inspect_ddl


def load_model(path):
    model = json.loads(Path(path).read_text(encoding="utf-8"))
    require_valid(model)
    return model


def parser():
    p = argparse.ArgumentParser(
        description="PostgreSQL dependency analysis; never execute migrations"
    )
    p.add_argument("--version", action="version", version=__version__)
    sub = p.add_subparsers(dest="command", required=True)
    inspect = sub.add_parser(
        "inspect",
        aliases=["snapshot"],
        help="Offline DDL/catalogs or explicitly requested read-only discovery",
    )
    group = inspect.add_mutually_exclusive_group(required=True)
    group.add_argument("--ddl", type=Path)
    group.add_argument("--catalog", type=Path)
    group.add_argument(
        "--dsn-env", help="Name of environment variable containing an authorized DSN"
    )
    inspect.add_argument("--mode", choices=["read-only"])
    inspect.add_argument("--repo", type=Path)
    inspect.add_argument("--pg-version", default="18", choices=["14", "15", "16", "17", "18"])
    inspect.add_argument("--capture-out", type=Path)
    inspect.add_argument("--out", type=Path, required=True)
    inspect.add_argument("--json", action="store_true")
    v = sub.add_parser("validate")
    v.add_argument("model", type=Path)
    v.add_argument(
        "--strict",
        action="store_true",
        help="Also require canonical ordering; unknown coverage is valid",
    )
    v.add_argument("--json", action="store_true")
    for command in ["render", "docs", "mermaid", "dot"]:
        s = sub.add_parser(command)
        s.add_argument("model", type=Path)
        s.add_argument("--out", type=Path, required=True)
        if command == "render":
            s.add_argument("--object", help="Initial impact root")
    i = sub.add_parser("impact")
    i.add_argument("model", type=Path)
    i.add_argument("--object", required=True)
    i.add_argument(
        "--operation",
        choices=["drop-column", "rename-column", "alter-type", "drop-table", "replace-view"],
    )
    i.add_argument("--to")
    i.add_argument("--out", type=Path)
    i.add_argument("--json", action="store_true")
    r = sub.add_parser("review")
    r.add_argument("--baseline", type=Path)
    r.add_argument("--migration", type=Path, required=True)
    r.add_argument("--metadata", type=Path)
    r.add_argument("--pg-version", default="18", choices=["14", "15", "16", "17", "18"])
    r.add_argument("--transaction-mode", choices=["statements", "single"], default="statements")
    r.add_argument("--fail-on", choices=["high", "medium", "unknown"])
    r.add_argument("--out", type=Path, required=True)
    r.add_argument("--json", action="store_true")
    d = sub.add_parser("diff")
    d.add_argument("before", type=Path)
    d.add_argument("after", type=Path)
    d.add_argument("--out", type=Path, required=True)
    d.add_argument("--json", action="store_true")
    demo = sub.add_parser("demo")
    demo.add_argument("out", type=Path)
    demo.add_argument("--json", action="store_true")
    doctor = sub.add_parser("doctor")
    doctor.add_argument("--json", action="store_true")
    return p


def comparison_model(before, after, changes):
    b = Builder(after["engine"]["version"])
    b.model = copy.deepcopy(after)
    b.nodes = {n["id"]: n for n in b.model["nodes"]}
    b.edges = {e["id"]: e for e in b.model["edges"]}
    # Scope sources by snapshot when combining two versions of the same file.
    for model in [b.model, copy.deepcopy(before)]:
        for e in model["evidence"]:
            field = "path" if "path" in e else "query_id"
            e[field] = model["snapshot"]["id"] + "/" + e[field]
        if model is not b.model:
            for n in model["nodes"]:
                if n["id"] in changes["removed"]:
                    b.nodes[n["id"]] = n
            for e in model["edges"]:
                if e["source"] in b.nodes and e["target"] in b.nodes:
                    b.edges[e["id"]] = e
            known = {e["id"] for e in b.model["evidence"]}
            b.model["evidence"].extend(e for e in model["evidence"] if e["id"] not in known)
    return b.finish()


def demo(directory):
    ex = resources() / "examples"
    m = inspect_ddl(ex / "ecommerce/schema.sql", ex / "ecommerce/app")
    r = review(m, ex / "ecommerce/migrations/003_contract_legacy_id.sql")
    root = select(m, "public.customers.id")["id"]
    a = bundle(Path(directory) / "ecommerce", r["model"], r, root=root)
    from .catalog import inspect_catalog

    m = inspect_catalog(json.loads((ex / "analytics/catalog.json").read_text(encoding="utf-8")))
    r = review(m, ex / "analytics/drop.sql")
    b = bundle(
        Path(directory) / "analytics",
        r["model"],
        r,
        root=select(m, "sales.orders.total_amount")["id"],
    )
    m = inspect_ddl(ex / "ecommerce/schema.sql", ex / "ecommerce/app")
    meta = json.loads((ex / "high-traffic/metadata.json").read_text(encoding="utf-8"))
    r = review(m, ex / "high-traffic/migrations/007.sql", metadata=meta)
    c = bundle(
        Path(directory) / "high-traffic",
        r["model"],
        r,
        root=select(m, "public.orders.total_amount")["id"],
    )
    return {"ecommerce": a, "analytics": b, "high-traffic": c}


def run(args):
    command = args.command
    if command in {"inspect", "snapshot"}:
        if args.ddl:
            if args.capture_out:
                raise ValueError("--capture-out requires live discovery")
            model = inspect_ddl(args.ddl, args.repo, args.pg_version)
        else:
            if args.repo:
                raise ValueError(
                    "Catalog plus repository merging is unavailable; use a separate offline inspection"
                )
            from .catalog import capture, inspect_catalog

            if args.catalog:
                data = json.loads(args.catalog.read_text(encoding="utf-8"))
            else:
                if args.mode != "read-only":
                    raise ValueError("Explicit live discovery requires --mode read-only")
                dsn = os.environ.get(args.dsn_env)
                if not dsn:
                    raise ValueError("The requested DSN environment variable is unset")
                data = capture(dsn)
                if args.capture_out:
                    write(args.capture_out, canonical(data))
            model = inspect_catalog(data)
            if args.dsn_env:
                model["engine"]["source_mode"] = "live_read_only"
        require_valid(model)
        write(args.out, canonical(model))
        return {"model": str(args.out.resolve()), "summary": summary(model)}, 0
    if command == "validate":
        model = json.loads(args.model.read_text(encoding="utf-8"))
        errors = validate(model, args.strict)
        return {"valid": not errors, "errors": errors}, 2 if errors else 0
    if command in {"render", "docs", "mermaid", "dot"}:
        model = load_model(args.model)
        if command == "render":
            content = render(model, root=select(model, args.object)["id"] if args.object else None)
        else:
            content = {"docs": markdown, "mermaid": mermaid, "dot": dot}[command](model)
        write(args.out, content)
        return {"artifact": str(args.out.resolve())}, 0
    if command == "impact":
        result = impact(load_model(args.model), args.object, args.operation, args.to)
        if args.out:
            write(args.out, canonical(result))
        return result, 0
    if command == "review":
        baseline = load_model(args.baseline) if args.baseline else None
        metadata = json.loads(args.metadata.read_text(encoding="utf-8")) if args.metadata else None
        r = review(baseline, args.migration, args.pg_version, metadata, args.transaction_mode)
        delivered = bundle(
            args.out, r["model"], r, root=r["impacts"][0]["root"] if r["impacts"] else None
        )
        levels = {f["risk_level"] for f in r["model"]["findings"]}
        failed = bool(
            args.fail_on
            and (
                (args.fail_on == "high" and "high" in levels)
                or (args.fail_on == "medium" and levels & {"high", "medium"})
                or (args.fail_on == "unknown" and levels & {"unknown", "high", "medium"})
            )
        )
        return {
            **delivered,
            "risk_level": r["risk_level"],
            "policy_passed": not failed,
            "review_only": True,
        }, 3 if failed else 0
    if command == "diff":
        before, after = load_model(args.before), load_model(args.after)
        changes = diff(before, after)
        bundle(args.out, comparison_model(before, after, changes), changes=changes)
        write(args.out / "before.dbdep.json", canonical(before))
        write(args.out / "after.dbdep.json", canonical(after))
        return changes, 0
    if command == "demo":
        return demo(args.out), 0
    if command == "doctor":
        versions = {}
        for dependency in ["pglast", "jsonschema", "psycopg", "playwright"]:
            try:
                versions[dependency] = importlib.metadata.version(dependency)
            except importlib.metadata.PackageNotFoundError:
                versions[dependency] = None
        valid = (
            all(versions[d] for d in ["pglast", "jsonschema"])
            and (resources() / "assets/viewer/viewer.js").exists()
        )
        return {
            "ready": bool(valid),
            "version": __version__,
            "python": sys.version.split()[0],
            "dependencies": versions,
            "postgresql": {"grammar": "18", "live_adapter": "14-18", "runtime_coverage": "partial"},
            "offline": True,
            "migration_execution": False,
        }, 0 if valid else 2
    raise ValueError("Unsupported command")


def main():
    args = parser().parse_args()
    try:
        result, code = run(args)
        print(
            canonical(result)
            if getattr(args, "json", False)
            else json.dumps(result, ensure_ascii=True)
        )
        return code
    except (ValueError, OSError, KeyError, TypeError) as exc:
        if isinstance(exc, OSError):
            message = "Cannot read/write the requested local artifact; check paths and permissions"
        elif isinstance(exc, (KeyError, TypeError)):
            message = "Malformed input structure; inspect the local input contract"
        else:
            message = str(exc)
        print(json.dumps({"error": message, "exit_code": 2}), file=sys.stderr)
        return 2
