"""Validated reports derive from the canonical model, never hand-authored data."""

import base64
import hashlib
import html
import json
import re
from pathlib import Path

from .model import canonical, resources, validate


def require_valid(model):
    errors = validate(model)
    if errors:
        raise ValueError("Invalid canonical model: " + "; ".join(errors[:8]))


def summary(model):
    return {
        "nodes": len(model["nodes"]),
        "edges": len(model["edges"]),
        "evidence": len(model["evidence"]),
        "unknowns": len(model["unknowns"]),
        "findings": len(model["findings"]),
        "severity_counts": {
            s: sum(f["severity"] == s for f in model["findings"])
            for s in ["info", "warning", "error"]
        },
    }


def render(model, review=None, changes=None, root=None):
    require_valid(model)
    state = {
        "model": model,
        "summary": summary(model),
        "plan": review.get("plan", []) if review else [],
        "changes": changes,
        "root": root,
    }
    data = canonical(state).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    viewer = resources() / "assets/viewer"
    css = (viewer / "viewer.css").read_text(encoding="utf-8")
    js = (viewer / "viewer.js").read_text(encoding="utf-8")

    def csp_hash(s):
        return base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()

    csp = f"default-src 'none'; script-src 'sha256-{csp_hash(js)}'; style-src 'sha256-{csp_hash(css)}'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"
    fallback = f"{len(model['nodes'])} nodes, {len(model['edges'])} edges, {len(model['findings'])} findings, {len(model['unknowns'])} unknowns. PostgreSQL {html.escape(model['engine']['version'])}. Source depends on target; blast radius follows reverse edges. Use report.md or the canonical JSON without JavaScript."
    template = (viewer / "template.html").read_text(encoding="utf-8")
    for token, replacement in [
        ("__CSP__", html.escape(csp, quote=True)),
        ("__CSS__", css),
        ("__FALLBACK__", fallback),
        ("__STATE__", data),
        ("__JS__", js),
    ]:
        template = template.replace(token, replacement)
    return template


def embedded_state(document):
    match = re.search(
        r'<script id="dbdep-state" type="application/json">(.*?)</script>', document, re.S
    )
    if not match:
        raise ValueError("HTML has no canonical embedded state")
    return json.loads(match.group(1))


def md_safe(value):
    return (
        str(value)
        .replace("|", "\\|")
        .replace("\n", " ")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("`", "&#96;")
    )


def markdown(model, review=None, changes=None):
    require_valid(model)
    s = summary(model)
    lines = [
        "# PostgreSQL dependency review",
        "",
        "Analysis only. No SQL was executed by the analyzer.",
        "",
        f"Snapshot `{model['snapshot']['id']}`. PostgreSQL {model['engine']['version']}, {model['engine']['source_mode']}.",
        f"Nodes: {s['nodes']}. Edges: {s['edges']}. Evidence: {s['evidence']}. Findings: {s['findings']}. Unknowns: {s['unknowns']}.",
        "",
        "Arrows mean source depends on/references target. Impact walks reverse edges. Paths describe potential impact; they do not prove runtime failure or complete consumer coverage.",
        "",
        "## Findings",
        "",
    ]
    for f in model["findings"]:
        lines += [
            f"### {f['rule_id']} ({f['severity']}, {f['risk_level']}, {f['status']})",
            "",
            md_safe(f["reason"]),
            "",
            md_safe(f["remediation"]),
            "",
            f"Finding ID: `{f['id']}`. Dimensions: {', '.join(f['risk_dimensions'])}. Evidence: {', '.join(f['evidence_ids'])}.",
            "",
        ]
    lines += [
        "## Coverage and unknowns",
        "",
        "OBSERVED means supplied catalog metadata. PARSED means syntax-aware source evidence. INFERRED means unproven. UNKNOWN means unavailable or unsupported. Static analysis is not exhaustive.",
        "",
    ]
    for u in model["unknowns"]:
        lines += [
            f"- UNKNOWN: {md_safe(u['explanation'])} Evidence: {', '.join(u['evidence_ids'])}."
        ]
    if review:
        lines += ["", "## Migration sequence", ""]
        for phase in review["plan"]:
            lines += [
                f"### {phase['phase']}",
                "",
                phase["action"],
                "",
                "Preconditions: " + phase["preconditions"],
                "",
                "Verification: " + phase["verification"],
                "",
                "Recovery: " + phase["recovery"],
                "",
            ]
        for i in review.get("impacts", []):
            lines += ["Affected root: `" + i["root"] + "`.", ""]
            lines += [f"- `{n}` via {', '.join(i['paths'][n])}" for n in i["affected"]]
    if changes:
        lines += ["", "## Snapshot changes", "", "```json", canonical(changes).rstrip(), "```"]
    lines += [
        "",
        "## Object inventory",
        "",
        "| ID | Object | Kind | Status | Evidence |",
        "|---|---|---|---|---|",
    ]
    for n in model["nodes"]:
        lines += [
            f"| {n['id']} | {md_safe(n['qualified_name'])} | {n['kind']} | {n['status']} | {', '.join(n['evidence_ids'])} |"
        ]
    lines += [
        "",
        "## Edge inventory",
        "",
        "| ID | Source | Target | Kind | Status |",
        "|---|---|---|---|---|",
    ]
    for e in model["edges"]:
        lines += [f"| {e['id']} | {e['source']} | {e['target']} | {e['kind']} | {e['status']} |"]
    lines += [
        "",
        "## Evidence inventory",
        "",
        "| ID | Origin | Location | Hash |",
        "|---|---|---|---|",
    ]
    for e in model["evidence"]:
        location = (
            f"{e['path']}:{e['line_start']}-{e['line_end']}"
            if "path" in e
            else f"{e['query_id']} at {e['captured_at']} ({e.get('catalog_address', '')})"
        )
        lines += [f"| {e['id']} | {e['origin']} | {md_safe(location)} | {e['source_hash']} |"]
    return "\n".join(lines) + "\n"


def mermaid(model):
    require_valid(model)
    ids = {n["id"]: f"n{i}" for i, n in enumerate(model["nodes"])}
    lines = ["flowchart LR", "  %% Source depends on target; traverse reverse for impact"]
    for n in model["nodes"]:
        label = html.escape(n["qualified_name"], quote=True).replace("\n", " ")
        lines.append(f'  {ids[n["id"]]}["{label}"]')
    for e in model["edges"]:
        lines.append(f"  {ids[e['source']]} -->|{e['kind']}| {ids[e['target']]}")
    return "\n".join(lines) + "\n"


def dot(model):
    require_valid(model)
    lines = [
        "digraph dependencies {",
        "  // Source depends on target; reverse traversal gives impact",
    ]
    for n in model["nodes"]:
        lines.append(f"  {json.dumps(n['id'])} [label={json.dumps(n['qualified_name'])}];")
    for e in model["edges"]:
        lines.append(
            f"  {json.dumps(e['source'])} -> {json.dumps(e['target'])} [label={json.dumps(e['kind'])}];"
        )
    return "\n".join(lines) + "\n}\n"


def write(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8", newline="\n")


def bundle(directory, model, review=None, changes=None, root=None):
    require_valid(model)
    p = Path(directory)
    write(p / "model.dbdep.json", canonical(model))
    write(p / "report.md", markdown(model, review, changes))
    write(p / "report.html", render(model, review, changes, root))
    write(p / "graph.mmd", mermaid(model))
    write(p / "graph.dot", dot(model))
    if review:
        write(p / "review.json", canonical({k: v for k, v in review.items() if k != "model"}))
    if changes:
        write(p / "diff.json", canonical(changes))
    return {"directory": str(p.resolve()), "summary": summary(model)}
