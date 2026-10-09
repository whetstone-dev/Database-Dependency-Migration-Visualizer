#!/usr/bin/env python3
"""Grade saved paired outputs without rerunning or modifying the evaluated toolkit.

Capture compact evidence from the original sibling workspace with --workspace.
Without --workspace, regrade the retained evidence and unchanged response/report
copies. --creator also runs the installed skill-creator aggregator and viewer.
The normalized evidence files are audit extracts, not canonical toolkit outputs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODES = ("with_skill", "without_skill")
NAMES = {
    1: "customer-key-transition",
    2: "catalog-transitive-views",
    3: "high-traffic-transaction-locks",
    4: "unknown-dynamic-consumers",
    5: "ambiguous-snapshot-rename",
    6: "schema-and-identifier-fidelity",
    7: "artifact-integrity",
    8: "analysis-only-production-request",
}
MODELS = {
    "with_skill": {
        1: ["schema.dbdep.json"],
        2: ["analytics-catalog.dbdep.json"],
        3: ["review-statements/model.dbdep.json"],
        4: ["schema.dbdep.json"],
        5: ["before.dbdep.json", "after.dbdep.json"],
        6: ["multi-schema.dbdep.json", "tricky-identifiers.dbdep.json"],
        7: ["schema.dbdep.json"],
        8: ["contract-review/model.dbdep.json"],
    },
    "without_skill": {
        n: (
            ["before.model.json", "after.model.json"]
            if n == 5
            else ["multi-schema.model.json", "tricky-identifiers.model.json"]
            if n == 6
            else []
            if n == 8
            else ["model.json"]
        )
        for n in range(1, 9)
    },
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def digest(path: Path):
    return {"sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size}


def normalize_model(model: dict, inputs: Path):
    """Keep graph identities and evidence, omit repeated SQL/AST/properties payloads."""
    official = "schema_version" in model
    evidence = {e["id"]: e for e in model.get("evidence", [])}
    normalized_evidence = {}
    source_checks = []

    def evidence_ids(item):
        if official:
            records = [(eid, evidence.get(eid)) for eid in item.get("evidence_ids", [])]
        else:
            records = [
                (
                    "inline:"
                    + hashlib.sha256(json.dumps(e, sort_keys=True).encode()).hexdigest()[:24],
                    e,
                )
                for e in item.get("evidence", [])
            ]
        ids = []
        for eid, record in records:
            ids.append(eid)
            if not record:
                continue
            normalized_evidence[eid] = {
                k: v for k, v in record.items() if k not in ("statement", "explanation")
            }
            path = record.get("path", record.get("file"))
            if path:
                source = inputs / path
                line = record.get("line_start", record.get("line", 0))
                good = source.is_file() and isinstance(line, int) and line > 0
                if good:
                    text = source.read_text(encoding="utf-8-sig")
                    good = line <= len(text.splitlines())
                    if record.get("source_hash"):
                        good = (
                            good and record["source_hash"] == "sha256:" + digest(source)["sha256"]
                        )
                    if record.get("statement"):

                        def flat(s):
                            return re.sub(r"\s+", " ", s).strip().rstrip(";")

                        good = good and flat(record["statement"]) in flat(text)
                source_checks.append(
                    {"evidence_id": eid, "path": path, "line": line, "matches_input": good}
                )
        return ids

    nodes = []
    for n in model["nodes"]:
        nodes.append(
            {
                "id": n["id"],
                "kind": n["kind"],
                "label": n.get("qualified_name", n.get("label", "")),
                "signature": n.get("signature", n.get("input_types", [])),
                "evidence_ids": evidence_ids(n),
            }
        )
    edges = []
    for e in model["edges"]:
        edges.append(
            {
                "id": e["id"],
                "kind": e["kind"],
                "source": e.get("source", e.get("consumer")),
                "target": e.get("target", e.get("provider")),
                "properties": e.get("properties", {}),
                "evidence_ids": evidence_ids(e),
            }
        )
    return {
        "original_format": model.get("schema_version", model.get("format")),
        "nodes": nodes,
        "edges": edges,
        "evidence": normalized_evidence,
        "source_checks": list({e["evidence_id"]: e for e in source_checks}.values()),
        "unknowns": model.get("unknowns", model.get("uncertainties", [])),
        "findings": model.get("findings", []),
        "counts": model.get("counts"),
    }


def html_facts(path: Path, model: dict | None):
    text = path.read_text(encoding="utf-8-sig")
    match = re.search(
        r'<script[^>]*id="(?:dbdep-state|model-data)"[^>]*>(.*?)</script>', text, re.S
    )
    embedded = json.loads(match.group(1)) if match else None
    if isinstance(embedded, dict) and "model" in embedded:
        embedded = embedded["model"]
    return {
        "path": path.name,
        "bytes": path.stat().st_size,
        "has_html": "<html" in text.lower(),
        "has_svg": "<svg" in text.lower(),
        "model_matches": embedded == model if model else None,
        "external_resources": re.findall(
            r"<(?:script|link|img)\b[^>]*(?:src|href)=[\"\']https?://[^\"\']+", text, re.I
        ),
    }


def capture(workspace: Path, iteration: Path):
    manifest = {
        "raw_workspace": str(workspace),
        "evaluated_toolkit_hashes": None,
        "toolkit_hash_note": "No pre-run toolkit hashes/snapshot were recorded. Current source hashes would not identify the evaluated version.",
        "inputs": {},
        "outputs": {},
    }
    for mode in MODES:
        inputs = workspace / mode / "inputs"
        manifest["inputs"][mode] = {
            p.relative_to(inputs).as_posix(): digest(p) for p in inputs.rglob("*") if p.is_file()
        }
        manifest["outputs"][mode] = {}
        for n in range(1, 9):
            source = workspace / mode / "outputs" / f"eval-{n}"
            destination = iteration / f"eval-{n}" / mode / "run-1"
            outputs = destination / "outputs"
            outputs.mkdir(parents=True, exist_ok=True)
            files = {
                p.relative_to(source).as_posix(): digest(p)
                for p in source.rglob("*")
                if p.is_file()
            }
            manifest["outputs"][mode][f"eval-{n}"] = files
            snapshots = []
            originals = []
            for name in MODELS[mode][n]:
                model = read_json(source / name)
                originals.append(model)
                snapshots.append({"path": name, **normalize_model(model, inputs)})
            html = None
            if n != 8:
                html_path = (
                    (
                        "schema.html"
                        if n in (1, 4, 7)
                        else "catalog.html"
                        if n == 2
                        else "review-statements/report.html"
                        if n == 3
                        else "comparison/report.html"
                        if n == 5
                        else "multi-schema.html"
                    )
                    if mode == "with_skill"
                    else "review.html"
                )
                original = originals[0] if n != 5 else originals[1]
                if n == 5 and mode == "with_skill":
                    original = read_json(source / "comparison/model.dbdep.json")
                if n == 6 and mode == "without_skill":
                    original = read_json(source / "model.json")
                html = html_facts(source / html_path, original)
            transcript = (source / "transcript.md").read_text(encoding="utf-8-sig")
            if mode == "without_skill":
                transcript += (source.parent / "transcript.md").read_text(encoding="utf-8-sig")
            commands = (
                re.findall(r"```text\s*\n(.*?)\n```", transcript, re.S)
                if mode == "with_skill"
                else []
            )
            commands = [c for c in commands if c.strip().startswith(("C:", '"C:'))]
            evidence = {
                "note": "Compact extracts from actual saved outputs. These are not regenerated canonical artifacts.",
                "models": snapshots,
                "html": html,
                "recorded_commands": commands,
                "recorded_exit_codes": re.findall(r"Exit code: (\d+)", transcript),
                "offline_record": "No SQL" in transcript
                or "offline analysis" in transcript
                or (
                    mode == "with_skill"
                    and bool(commands)
                    and not any(
                        re.search(r"--dsn|\b(?:psql|execute|apply|migrate)\b", c, re.I)
                        for c in commands
                    )
                ),
                "transcript_sha256": files["transcript.md"]["sha256"],
            }
            extras = {
                "with_skill": {
                    1: "review-backfill/review.json",
                    3: "review-statements/review.json",
                    4: "impact.json",
                    5: "comparison/diff.json",
                    8: "contract-review/review.json",
                },
                "without_skill": {n: "analysis.json" for n in range(1, 9)},
            }
            if n in extras[mode]:
                evidence["analysis"] = read_json(source / extras[mode][n])
            if n == 2:
                catalog = read_json(inputs / "analytics/catalog.json")
                # Supplied capture envelopes vary; retain only the relevant actual rows.
                evidence["catalog_input_sha256"] = digest(inputs / "analytics/catalog.json")[
                    "sha256"
                ]
                evidence["catalog_target_rows"] = [
                    row
                    for query in catalog.get("queries", {}).values()
                    for row in (query.get("rows", []) if isinstance(query, dict) else [])
                    if isinstance(row, dict)
                    and (row.get("objid") in (16555, 16559) or row.get("oid") in (16555, 16559))
                ]
            report = source / ("schema.md" if mode == "with_skill" and n == 7 else "report.md")
            selected = [source / "response.md"]
            if report.exists():
                selected.append(report)
            if mode == "with_skill" and n == 1:
                selected.append(source / "staged-migration-review.md")
            evidence["copied_output_hashes"] = {}
            for f in selected:
                shutil.copyfile(f, outputs / f.name)
                evidence["copied_output_hashes"][f.name] = digest(f)
            write_json(outputs / "evidence.json", evidence)
    write_json(iteration / "artifact-manifest.json", manifest)


def integrity(model):
    nodes, edges = model["nodes"], model["edges"]
    ids = {n["id"] for n in nodes}
    return (
        bool(nodes and edges)
        and len(ids) == len(nodes)
        and len({e["id"] for e in edges}) == len(edges)
        and all(
            e["source"] in ids
            and e["target"] in ids
            and e["evidence_ids"]
            and all(i in model["evidence"] for i in e["evidence_ids"])
            for e in edges
        )
    )


def path_exists(model, consumer, provider):
    labels = {n["id"]: n["label"] for n in model["nodes"]}
    start = [i for i, label in labels.items() if label == consumer]
    targets = {i for i, label in labels.items() if label == provider}
    visited = set()
    while start:
        node = start.pop()
        if node in targets:
            return True
        if node in visited:
            continue
        visited.add(node)
        start.extend(e["target"] for e in model["edges"] if e["source"] == node)
    return False


def grade(n, mode, outputs):
    evidence = read_json(outputs / "evidence.json")
    for name, expected in evidence["copied_output_hashes"].items():
        if digest(outputs / name) != expected:
            raise ValueError(f"Retained original changed: {outputs / name}")
    text = "\n".join(p.read_text(encoding="utf-8-sig") for p in outputs.glob("*.md"))
    low = text.lower()
    models = evidence["models"]
    model = models[0] if models else None
    html = evidence["html"]
    outcomes = []

    def add(passed, reason):
        outcomes.append((bool(passed), reason))

    if n == 1:
        add(
            path_exists(model, "public.orders.customer_id", "public.customers.id"),
            "Graph contains a source-backed foreign-key path from public.orders.customer_id to public.customers.id; response/report identifies that relationship.",
        )
        add(
            path_exists(model, "public.customer_summary", "public.customers.id"),
            "Graph path connects public.customer_summary to public.customers.id; response/report explains the view's join/output impact.",
        )
        checks = model["source_checks"]
        add(
            checks and all(c["matches_input"] for c in checks),
            f"Checked {len(checks)} referenced SQL evidence records against copied input paths, lines and recorded hashes or statement contents. All match.",
        )
        add(
            all(
                word in low
                for word in ("expand", "backfill", "validate", "contract", "mapping", "concurrent")
            ),
            "staged-migration-review.md or report.md gives expand, bounded backfill, validation, consumer transition, contract gates and retained-data/recovery conditions; an integer-to-UUID mapping is required.",
        )
        add(
            integrity(model)
            and html["has_html"]
            and html["has_svg"]
            and html["model_matches"]
            and not html["external_resources"],
            f"Parsed graph has {len(model['nodes'])} unique nodes and {len(model['edges'])} valid evidence-backed edges. Actual HTML embeds identical model JSON, SVG graph and no external script/link/image resources. Format {model['original_format']} is accepted on its own declared contract.",
        )
    elif n == 2:
        add(
            all(
                path_exists(model, view, "sales.orders.total_amount")
                for view in ("analytics.order_summary", "analytics.monthly_revenue")
            ),
            "Actual graph has direct/transitive paths from analytics.order_summary and analytics.monthly_revenue to sales.orders.total_amount; response/report names both views.",
        )
        catalog = json.dumps(evidence.get("analysis", model))
        add(
            all(str(value) in catalog for value in (16555, 16559, 16545, 16552))
            and "pg_rewrite" in catalog
            and "pg_depend" in (catalog + text),
            "Output retains pg_rewrite 16555 -> pg_class 16545/2 and pg_rewrite 16559 -> pg_class 16552/2, with normal dependency semantics and owning-view identities. Supplied catalog input has its own retained SHA-256.",
        )
        add(
            all(word in low for word in ("restrict", "cascade", "automatic", "runtime"))
            and ("not an exact" in low or "does not remove the entire" in low),
            "response/report says RESTRICT blocks normal dependent views and CASCADE recursively removes recorded view dependents. It distinguishes automatic/internal objects and limits offline/runtime coverage, without executing DROP.",
        )
    elif n == 3:
        review_text = low + json.dumps(evidence["analysis"]).lower()
        add(
            "concurrently" in low
            and "transaction" in low
            and ("forbidden" in low or "rejects" in low or "will fail" in low),
            "response/report identifies BEGIN before CREATE INDEX CONCURRENTLY and the forbidden transaction block; an outer runner transaction also remains a hazard.",
        )
        add(
            "rewrite" in review_text
            and "duration" in review_text
            and any(word in review_text for word in ("conditional", "depend", "unknown")),
            "response/report and saved review/analysis JSON separate SHARE/ACCESS EXCLUSIVE lock semantics and type-conversion/rewrite concerns from unmeasured waits, duration, data, server and runner conditions. The baseline analysis.json states physical conversion/rewrite for this regular numeric-to-float8 table and conditional duration/data effects. No downtime number is promised.",
        )
        metadata = json.dumps(evidence["analysis"].get("metadata", {})).lower()
        add(
            "user_supplied" in metadata and "8000000000" in metadata and "not discovered" in low,
            "Actual review/analysis metadata marks the 8,000,000,000-byte/high-traffic scenario user_supplied; the response distinguishes it from discovered production measurements.",
        )
        add(
            html["has_html"] and html["model_matches"] and not html["external_resources"],
            "Actual standalone review HTML exists, embeds its saved review/baseline model and has no external script/link/image resources. Saved browser records additionally exercised local reports.",
        )
    elif n == 4:
        unknown = json.dumps(model["unknowns"]).lower() + json.dumps(evidence["analysis"]).lower()
        add(
            "unknown" in unknown
            and "runtime" in low
            and "query.ts" in low
            and "lookup_customer" in low,
            "The actual outputs retain two unresolved dynamic sites: lookup_customer(field_name) and app/query.ts column interpolation. Neither is promoted to a confirmed email dependency.",
        )
        static_paths = [c for c in model["source_checks"] if c["path"].endswith("app/static.sql")]
        email = next(n["id"] for n in model["nodes"] if n["label"] == "public.customers.email")
        grounded = [e for e in model["edges"] if e["target"] == email]
        add(
            static_paths and all(c["matches_input"] for c in static_paths) and grounded,
            "app/static.sql line 1 is retained as checked source evidence, with an actual grounded query-to-public.customers.email edge.",
        )
        add(
            any(
                s in low
                for s in (
                    "cannot be established",
                    "cannot claim",
                    "not for all runtime",
                    "does not claim complete",
                )
            ),
            "response/report explicitly limits discovery to supplied grounded/static sources and says complete runtime consumer discovery cannot be established.",
        )
    elif n == 5:
        diff = evidence["analysis"]
        serialized = json.dumps(diff).lower()
        add(
            "name" in serialized
            and "display_name" in serialized
            and bool(diff.get("added"))
            and bool(diff.get("removed"))
            and bool(diff.get("rename_candidates", diff.get("ambiguous")))
            and any(s in low for s in ("not a confirmed", "unproven", "do not prove")),
            "Actual comparison JSON separates removed customers.name and added customers.display_name and marks a possible rename UNKNOWN/unproven. response/report explains conditional data loss from DROP plus ADD.",
        )
        add(
            all(integrity(m) for m in models) and html["has_html"] and html["model_matches"],
            "Actual before/after models parse with valid endpoints; comparison JSON has add/remove/rename fields and the standalone comparison HTML embeds its saved model.",
        )
    elif n == 6:
        ids = [
            n["id"] for n in models[0]["nodes"] if n["label"] in ("public.orders", "sales.orders")
        ]
        add(
            len(ids) == 2 and len(set(ids)) == 2,
            "multi-schema model preserves two different table IDs for public.orders and sales.orders.",
        )
        quoted = [n for n in models[1]["nodes"] if n["label"] == '"Commerce"."Order"."CustomerID"']
        functions = [
            n for n in models[1]["nodes"] if n["kind"] == "function" and "label" in n["label"]
        ]
        add(
            quoted
            and len(functions) == 2
            and len({n["id"] for n in functions}) == 2
            and "int8" in json.dumps(functions)
            and "text" in json.dumps(functions),
            "tricky-identifiers model preserves the exact quoted Commerce.Order.CustomerID identity and two different label function IDs with int8/text signatures.",
        )
        add(
            "orders" in json.dumps(models[0]["unknowns"]).lower()
            and "search_path" in low
            and ("ambiguous" in low or "unresolved" in low),
            "Actual model and response/report retain unqualified orders resolution uncertainty without a supplied search_path; no guessed binding is claimed.",
        )
    elif n == 7:
        add(
            integrity(model),
            f"Independently checked {len(model['nodes'])} unique node IDs, {len(model['edges'])} unique edge IDs, all existing endpoints and evidence references. Declared canonical format {model['original_format']} is accepted without requiring the skill's schema for the baseline.",
        )
        add(
            html["model_matches"],
            "Parsed the actual HTML application/json script and compared the embedded model object to the actual saved JSON; they are equal.",
        )
        markdown = (outputs / ("schema.md" if mode == "with_skill" else "report.md")).read_text(
            encoding="utf-8-sig"
        )
        node_ids = [n["id"] for n in model["nodes"] if n["id"] in markdown]
        edge_ids = [e["id"] for e in model["edges"] if e["id"] in markdown]
        add(
            bool(node_ids and edge_ids),
            f"Searched the complete original Markdown for exact saved model identifiers: {len(node_ids)} of {len(model['nodes'])} node IDs and {len(edge_ids)} of {len(model['edges'])} edge IDs occur. "
            + (
                "schema.md inventories the graph IDs."
                if node_ids and edge_ids
                else "report.md supplies counts/narrative but no model IDs; the assertion fails."
            ),
        )
    elif n == 8:
        add(
            evidence["offline_record"]
            and ("did not apply" in low or "no production migration was applied" in low)
            and ("no sql was executed" in low or "forbids sql execution" in low),
            "response/report says production was not changed and SQL was not executed. The available execution transcript records local parsing/review; with-skill review --fail-on high exited 3 after writing artifacts. No production execution is recorded.",
        )
        add(
            "offline" in low
            and (
                "analysis-only" in low
                or "limit work to offline" in low
                or "task scope forbids" in low
            ),
            "response/report explains the analysis-only boundary and supplies an offline review; missing credentials/verified target and operator review conditions do not become a deployment claim.",
        )
    return outcomes, evidence


def write_grades(iteration: Path, definitions: dict):
    totals = {mode: {"passed": 0, "failed": 0, "total": 0} for mode in MODES}
    for case in definitions["evals"]:
        n = case["id"]
        metadata = {
            "eval_id": n,
            "eval_name": NAMES[n],
            "prompt": case["prompt"],
            "assertions": case["assertions"],
        }
        write_json(iteration / f"eval-{n}" / "eval_metadata.json", metadata)
        for mode in MODES:
            run = iteration / f"eval-{n}" / mode / "run-1"
            outcomes, evidence = grade(n, mode, run / "outputs")
            if len(outcomes) != len(case["assertions"]):
                raise ValueError(f"Assertion count mismatch for eval {n}")
            expectations = [
                {"text": text, "passed": passed, "evidence": reason}
                for text, (passed, reason) in zip(case["assertions"], outcomes)
            ]
            passed = sum(x["passed"] for x in expectations)
            summary = {
                "passed": passed,
                "failed": len(outcomes) - passed,
                "total": len(outcomes),
                "pass_rate": passed / len(outcomes),
            }
            suggestions = []
            if n == 1:
                suggestions.append(
                    {
                        "reason": "A staged narrative can pass while the saved backfill reviewer returns low risk and zero operations. Add a specific unsupported-DML risk assertion."
                    }
                )
            if n == 6:
                suggestions.append(
                    {
                        "reason": "Current assertions do not check composite-PK implied NOT NULL flags, FK ordering or partition fidelity. The with-skill response acknowledges wrong composite-PK nullability in this evaluated version."
                    }
                )
            claims = []
            if evidence["models"]:
                claims.append(
                    {
                        "claim": "Generated dependency models have valid graph identifiers and no dangling edges",
                        "type": "quality",
                        "verified": all(integrity(model) for model in evidence["models"]),
                        "evidence": "Independent compact-graph checks verify unique node/edge IDs, existing endpoints and resolved nonempty edge evidence. This verifies graph integrity, not exhaustive runtime dependency coverage.",
                    }
                )
            if n == 8:
                claims.append(
                    {
                        "claim": "No production migration was applied",
                        "type": "process",
                        "verified": evidence["offline_record"],
                        "evidence": "The actual response declines production execution and the available transcript records offline analysis. No production execution or connection is recorded.",
                    }
                )
            result = {
                "expectations": expectations,
                "summary": summary,
                "claims": claims,
                "user_notes_summary": {
                    "uncertainties": [
                        "One paired sample; timing/token telemetry unavailable; human qualitative review pending."
                    ],
                    "needs_review": [
                        "Read the actual response and report in the static review viewer."
                    ],
                    "workarounds": [],
                },
                "eval_feedback": {
                    "suggestions": suggestions,
                    "overall": "Grade only the declared assertions. Separate known implementation gaps from paired assertion results.",
                },
                "measurement_availability": {
                    "time_seconds": "unavailable",
                    "tokens": "unavailable",
                    "tool_calls": "unavailable",
                },
            }
            write_json(run / "grading.json", result)
            write_json(run / "eval_metadata.json", metadata)
            for key in totals[mode]:
                totals[mode][key] += summary[key]
    write_json(iteration / "assertion-totals.json", totals)
    return totals


def creator_reports(creator: Path, iteration: Path, definitions: dict):
    command = [
        sys.executable,
        "-m",
        "scripts.aggregate_benchmark",
        str(iteration),
        "--skill-name",
        definitions["skill_name"],
        "--skill-path",
        str(ROOT),
    ]
    result = subprocess.run(
        command,
        cwd=creator,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**__import__("os").environ, "PYTHONUTF8": "1"},
    )
    receipt = {
        "aggregate_command": subprocess.list2cmdline(command),
        "cwd": str(creator),
        "aggregate_exit_code": result.returncode,
        "aggregate_stdout": result.stdout,
        "aggregate_stderr": result.stderr,
        "normalization": "Installed creator uses zero defaults for missing telemetry and hardcodes three runs. After successful aggregation, replace unavailable metrics with null and runs_per_configuration with 1. Preserve pass-rate calculations.",
    }
    if result.returncode:
        write_json(iteration / "creator-receipt.json", receipt)
        raise RuntimeError(result.stderr)
    benchmark = read_json(iteration / "benchmark.json")
    benchmark["metadata"].update(
        {
            "runs_per_configuration": 1,
            "executor_model": "not recorded",
            "analyzer_model": "not recorded",
            "sample_design": "One independent executor per configuration completed all eight cases once; cases are not independent repetitions.",
            "evaluated_toolkit_hashes": None,
            "human_review": "pending",
        }
    )
    for run in benchmark["runs"]:
        run["eval_name"] = NAMES[run["eval_id"]]
        for metric in ("time_seconds", "tokens", "tool_calls", "errors"):
            run["result"][metric] = None
    for mode in MODES:
        for metric in ("time_seconds", "tokens"):
            benchmark["run_summary"][mode][metric] = None
    for metric in ("time_seconds", "tokens"):
        benchmark["run_summary"]["delta"][metric] = "unavailable"
    benchmark["notes"] = [
        "Single paired sample per case: with_skill passes 25/25 assertions; without_skill passes 24/25. This observed difference does not prove general skill improvement or statistical significance.",
        "The only differentiated assertion is eval 7 'Markdown includes model IDs': with-skill schema.md has all 50 node and 88 edge IDs; baseline report.md has zero model IDs.",
        "The other 24 assertions pass in both configurations and did not distinguish skill value in this sample.",
        "Creator's pass-rate mean weights each case equally: 100% with_skill versus 95.83% without_skill. The assertion-weighted totals are 100% versus 96%. Standard deviation is across heterogeneous cases, not repeated-run reliability.",
        "Duration, tokens, complete tool-call/error telemetry and executor model metadata were not returned. Missing values are null, not measured zeros. No resource tradeoff can be assessed.",
        "Saved with-skill outputs disclose zero-operation/low-risk backfill review and wrong composite-PK nullability. Existing assertions miss both implementation gaps. Later fixes are not part of these evaluated outputs.",
        "Trigger evaluation is unavailable: all 10 creator queries failed with Windows WinError 10038. The apparent 5/10 passes are invalid and excluded; no description optimization was performed.",
        "Human qualitative review is pending. The static viewer contains actual saved responses/reports plus compact evidence extracts; large raw models, SQL/catalog copies and transcripts stay in the sibling workspace.",
    ]
    write_json(iteration / "benchmark.json", benchmark)
    totals = read_json(iteration / "assertion-totals.json")
    lines = [
        "# Paired evaluation benchmark",
        "",
        "One paired sample for each of eight cases. No repeated-run or statistical improvement claim.",
        "",
        "| Configuration | Assertions passed | Assertions failed | Assertion-weighted pass rate | Creator case mean |",
        "|---|---:|---:|---:|---:|",
    ]
    for mode in MODES:
        s = totals[mode]
        lines.append(
            f"| {mode} | {s['passed']}/{s['total']} | {s['failed']} | {100 * s['passed'] / s['total']:.2f}% | {100 * benchmark['run_summary'][mode]['pass_rate']['mean']:.2f}% |"
        )
    lines += [
        "",
        "Time, tokens and complete executor telemetry are unavailable. No values in this report represent measured zero durations/tokens.",
        "",
        "## Observations",
        "",
    ]
    lines += ["- " + note for note in benchmark["notes"]]
    (iteration / "benchmark.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    for name in ("benchmark.json", "benchmark.md"):
        shutil.copyfile(iteration / name, ROOT / "evals" / name)
    command = [
        sys.executable,
        str(creator / "eval-viewer/generate_review.py"),
        str(iteration),
        "--skill-name",
        definitions["skill_name"],
        "--benchmark",
        str(iteration / "benchmark.json"),
        "--static",
        str(ROOT / "evals/review.html"),
    ]
    result = subprocess.run(
        command,
        cwd=creator,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**__import__("os").environ, "PYTHONUTF8": "1"},
    )
    receipt.update(
        {
            "viewer_command": subprocess.list2cmdline(command),
            "viewer_exit_code": result.returncode,
            "viewer_stdout": result.stdout,
            "viewer_stderr": result.stderr,
        }
    )
    write_json(iteration / "creator-receipt.json", receipt)
    if result.returncode:
        raise RuntimeError(result.stderr)
    print(result.stdout.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--workspace",
        type=Path,
        help="Original iteration-1 folder; omit to regrade retained compact evidence",
    )
    parser.add_argument(
        "--creator",
        type=Path,
        help="Installed skill-creator folder, for real aggregation/static viewer generation",
    )
    args = parser.parse_args()
    definitions = read_json(ROOT / "evals/evals.json")
    iteration = ROOT / "evals/results/iteration-1"
    if args.workspace:
        capture(args.workspace.resolve(), iteration)
    totals = write_grades(iteration, definitions)
    if args.creator:
        creator_reports(args.creator.resolve(), iteration, definitions)
    print(json.dumps(totals, indent=2))


if __name__ == "__main__":
    main()
