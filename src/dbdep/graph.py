"""Reverse dependencies, bounded identity resolution and snapshot comparison."""

from collections import defaultdict, deque

from pglast import parser

from .model import canonical


def select(model, selector):
    for n in model["nodes"]:
        if n["id"] == selector:
            return n
    try:
        parts = parser.parse_sql_json("SELECT " + selector)
        import json

        stmts = json.loads(parts)["stmts"]
        body = stmts[0]["stmt"]["SelectStmt"]
        fields = body["targetList"][0]["ResTarget"]["val"]["ColumnRef"]["fields"]
        names = [f["String"]["sval"] for f in fields]
        if (
            len(stmts) != 1
            or len(body["targetList"]) != 1
            or not 1 <= len(names) <= 3
            or set(body) - {"targetList", "limitOption", "op"}
        ):
            raise ValueError()
    except (ValueError, KeyError, IndexError, parser.ParseError) as exc:
        raise ValueError("Malformed selector; use schema.table.column or a stable node ID") from exc
    matches = []
    for n in model["nodes"]:
        parts = [n["schema"], *([n["parent"]] if n["parent"] else []), n["name"]]
        if parts[-len(names) :] == names:
            matches.append(n)
    if len(matches) != 1:
        raise ValueError("Object selector is ambiguous or absent; use a stable node ID")
    return matches[0]


def impact(model, selector, operation=None, to=None):
    root = select(model, selector)["id"]
    reverse = defaultdict(list)
    for e in model["edges"]:
        reverse[e["target"]].append(e)
    paths = {root: []}
    q = deque([root])
    while q:
        target = q.popleft()
        for e in sorted(reverse[target], key=lambda x: x["id"]):
            src = e["source"]
            if src not in paths:
                paths[src] = [e["id"], *paths[target]]
                q.append(src)
    affected = sorted(set(paths) - {root})
    direct = sorted({e["source"] for e in reverse[root]} - {root})
    categories = {"recorded_catalog": [], "static_reference": [], "inferred": []}
    by_edge = {e["id"]: e for e in model["edges"]}
    for n in affected:
        statuses = {by_edge[e]["status"] for e in paths[n]}
        category = (
            "inferred"
            if statuses & {"INFERRED", "UNKNOWN"}
            else "static_reference"
            if "PARSED" in statuses
            else "recorded_catalog"
        )
        categories[category].append(n)
    result = {
        "root": root,
        "operation": operation,
        "to": to,
        "direct": direct,
        "affected": affected,
        "paths": {k: v for k, v in sorted(paths.items()) if k != root},
        "categories": categories,
        "unknowns": model["unknowns"],
        "explanation": "Reverse paths show potential impact. They do not prove execution failure or exhaustive runtime coverage.",
    }
    if operation:
        from .rules import assess_operation

        result.update(assess_operation(model, select(model, selector), operation, to))
    return result


def diff(before, after):
    bn, an = ({n["id"]: n for n in m["nodes"]} for m in [before, after])
    added, removed = sorted(an.keys() - bn.keys()), sorted(bn.keys() - an.keys())

    def comparable(n):
        return {
            k: v
            for k, v in n.items()
            if k not in {"evidence_ids", "status", "origin", "confidence"} and k != "properties"
        } | {
            "properties": {
                k: v
                for k, v in n["properties"].items()
                if k not in {"oid", "catalog_address", "reltuples", "relpages"}
            }
        }

    modified = sorted(k for k in bn.keys() & an.keys() if comparable(bn[k]) != comparable(an[k]))

    def edge_key(e):
        return canonical(
            [
                e["source"],
                e["target"],
                e["kind"],
                {k: v for k, v in e["properties"].items() if k != "catalog_address"},
            ]
        )

    be, ae = ({edge_key(e): e["id"] for e in m["edges"]} for m in [before, after])
    candidates = []
    for r in removed:
        for a in added:
            if (
                bn[r]["kind"] == an[a]["kind"] == "column"
                and bn[r]["schema"] == an[a]["schema"]
                and bn[r]["parent"] == an[a]["parent"]
                and bn[r]["properties"].get("type") == an[a]["properties"].get("type")
            ):
                candidates.append(
                    {
                        "removed": r,
                        "added": a,
                        "status": "UNKNOWN",
                        "explanation": "Possible rename; add/drop remains the observed change. Human confirmation required.",
                    }
                )
    return {
        "schema_version": "1.0.0",
        "before": before["snapshot"]["id"],
        "after": after["snapshot"]["id"],
        "added": added,
        "removed": removed,
        "modified": modified,
        "matched": sorted(bn.keys() & an.keys()),
        "edges_added": sorted(ae[k] for k in ae.keys() - be.keys()),
        "edges_removed": sorted(be[k] for k in be.keys() - ae.keys()),
        "rename_candidates": candidates,
    }
