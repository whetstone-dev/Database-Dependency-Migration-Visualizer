"""Canonical identity, evidence and semantic validation."""

import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

from jsonschema import Draft202012Validator

STATUSES = ["OBSERVED", "PARSED", "INFERRED", "UNKNOWN"]
ORIGINS = [
    "postgres_catalog",
    "sql_file",
    "migration_diff",
    "application_source",
    "user_supplied",
    "heuristic",
]
KINDS = [
    "schema",
    "table",
    "partitioned_table",
    "view",
    "materialized_view",
    "column",
    "sequence",
    "index",
    "constraint",
    "type",
    "function",
    "procedure",
    "trigger",
    "query",
    "extension",
]
EDGE_KINDS = [
    "contains",
    "foreign_key",
    "catalog_dependency",
    "query_reference",
    "trigger_association",
    "type_reference",
    "partition",
    "inheritance",
    "expression_reference",
    "sequence_ownership",
]


def resources():
    root = Path(__file__).resolve().parents[2]
    return (
        root if (root / "schemas/dbdep.schema.json").exists() else Path(sys.prefix) / "share/dbdep"
    )


def canonical(value):
    return json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True, allow_nan=False) + "\n"


def digest(value):
    if not isinstance(value, bytes):
        value = str(value).encode("utf-8")
    return "sha256:" + hashlib.sha256(value).hexdigest()


def identity(kind, schema, name, parent="", signature=""):
    parts = [schema, kind, parent, name, signature]
    return "postgresql:local/" + "/".join(quote(p, safe="") for p in parts)


def quoted(name):
    if re.fullmatch(r"[a-z_][a-z_0-9$]*", name):
        return name
    return '"' + name.replace('"', '""') + '"'


def display(schema, name, parent=""):
    return ".".join(quoted(p) for p in [schema, parent, name] if p)


def safe_path(path):
    path = Path(path)
    try:
        return path.resolve().relative_to(Path.cwd().resolve()).as_posix()
    except ValueError:
        return path.name


def fingerprint(model):
    sources = sorted(
        {(e.get("path", e.get("query_id", "")), e["source_hash"]) for e in model["evidence"]}
    )
    return digest(canonical({"sources": sources, "version": model["engine"]["version"]}))


class Builder:
    def __init__(self, version="18", source_mode="offline_ddl"):
        self.model = {
            "schema_version": "1.0.0",
            "engine": {"name": "postgresql", "version": str(version), "source_mode": source_mode},
            "snapshot": {"id": "", "created_at": None, "source_fingerprint": ""},
            "coverage": {
                "catalog_available": False,
                "repository_scan": False,
                "exhaustive": False,
                "unresolved": 0,
                "capabilities": [],
            },
            "nodes": [],
            "edges": [],
            "evidence": [],
            "findings": [],
            "unknowns": [],
        }
        self.nodes = {}
        self.edges = {}

    def evidence(self, source, raw, start=0, length=0, status="PARSED", origin="sql_file", **extra):
        source_hash = digest(raw)
        data = {
            "origin": origin,
            "status": status,
            "confidence": "direct",
            "source_hash": source_hash,
            "explanation": "Syntax establishes a static reference, not runtime reachability.",
            **extra,
        }
        if origin != "postgres_catalog":
            data.update(
                path=safe_path(source),
                line_start=raw[:start].count(b"\n") + 1,
                line_end=raw[: start + length].count(b"\n") + 1,
                byte_start=start,
                byte_length=length,
            )
        data["id"] = "ev:" + digest(canonical(data))[7:31]
        if not any(e["id"] == data["id"] for e in self.model["evidence"]):
            self.model["evidence"].append(data)
        return data["id"]

    def node(
        self,
        kind,
        schema,
        name,
        evidence,
        parent="",
        signature="",
        properties=None,
        status="PARSED",
        origin="sql_file",
    ):
        key = identity(kind, schema, name, parent, signature)
        if key in self.nodes:
            n = self.nodes[key]
            n["evidence_ids"] = sorted(set(n["evidence_ids"] + [evidence]))
            if properties:
                n["properties"].update(properties)
            return n
        n = {
            "id": key,
            "kind": kind,
            "schema": schema,
            "name": name,
            "parent": parent,
            "signature": signature,
            "qualified_name": display(schema, name, parent),
            "origin": origin,
            "status": status,
            "confidence": "direct",
            "evidence_ids": [evidence],
            "properties": properties or {},
        }
        self.nodes[key] = n
        return n

    def edge(
        self, source, target, kind, evidence, status="PARSED", origin="sql_file", properties=None
    ):
        source = source["id"] if isinstance(source, dict) else source
        target = target["id"] if isinstance(target, dict) else target
        if source == target:
            return
        props = properties or {}
        stable_props = {k: v for k, v in props.items() if k != "catalog_address"}
        key = "edge:" + digest(canonical([source, target, kind, status, stable_props]))[7:31]
        if key in self.edges:
            self.edges[key]["evidence_ids"] = sorted(
                set(self.edges[key]["evidence_ids"] + [evidence])
            )
        else:
            self.edges[key] = {
                "id": key,
                "source": source,
                "target": target,
                "kind": kind,
                "origin": origin,
                "status": status,
                "confidence": "direct",
                "evidence_ids": [evidence],
                "explanation": "Source depends on or references target; impact traverses reverse edges. Runtime effects require review.",
                "properties": props,
            }

    def unknown(self, explanation, evidence, object_id=None):
        u = {
            "id": "unknown:" + digest(canonical([explanation, evidence, object_id]))[7:31],
            "status": "UNKNOWN",
            "origin": "heuristic",
            "confidence": "unknown",
            "explanation": explanation,
            "evidence_ids": [evidence],
            "object_id": object_id,
        }
        if not any(x["id"] == u["id"] for x in self.model["unknowns"]):
            self.model["unknowns"].append(u)

    def finish(self):
        self.model["nodes"] = sorted(self.nodes.values(), key=lambda x: x["id"])
        self.model["edges"] = sorted(self.edges.values(), key=lambda x: x["id"])
        for key in ["evidence", "unknowns", "findings"]:
            self.model[key].sort(key=lambda x: x["id"])
        self.model["coverage"]["unresolved"] = len(self.model["unknowns"])
        fp = fingerprint(self.model)
        self.model["snapshot"]["source_fingerprint"] = fp
        self.model["snapshot"]["id"] = "snapshot:" + fp[7:31]
        return self.model


def validate(model, strict=False):
    schema = json.loads((resources() / "schemas/dbdep.schema.json").read_text(encoding="utf-8"))
    errors = [
        f"{'/'.join(map(str, e.absolute_path))}: JSON Schema {e.validator} check failed"
        for e in Draft202012Validator(schema).iter_errors(model)
    ]
    if errors:
        return sorted(errors)
    ids = {}
    for key in ["nodes", "edges", "evidence", "findings", "unknowns"]:
        vals = [x["id"] for x in model[key]]
        ids[key] = set(vals)
        if len(ids[key]) != len(vals):
            errors.append(f"Duplicate IDs in {key}")
        if strict and vals != sorted(vals):
            errors.append(f"Unsorted {key}")
    for edge in model["edges"]:
        if edge["source"] not in ids["nodes"] or edge["target"] not in ids["nodes"]:
            errors.append("Dangling edge endpoint")
        constraint = edge["properties"].get("constraint")
        if constraint is not None and constraint not in ids["nodes"]:
            errors.append("Dangling constraint reference")
    for finding in model["findings"]:
        if set(finding["object_ids"]) - ids["nodes"]:
            errors.append("Dangling finding object reference")
        if set(finding["evidence"]) != set(finding["evidence_ids"]):
            errors.append("Inconsistent finding evidence aliases")
    for unknown in model["unknowns"]:
        if unknown["object_id"] is not None and unknown["object_id"] not in ids["nodes"]:
            errors.append("Dangling unknown object reference")
    for key in ["nodes", "edges", "findings", "unknowns"]:
        for obj in model[key]:
            for eid in obj["evidence_ids"]:
                if eid not in ids["evidence"]:
                    errors.append("Missing evidence reference")
    hashes = {}
    for e in model["evidence"]:
        source = e.get("path", e.get("query_id"))
        if source in hashes and hashes[source] != e["source_hash"]:
            errors.append("Inconsistent source hash for an evidence source")
        hashes[source] = e["source_hash"]
        if e.get("line_end", 1) < e.get("line_start", 1):
            errors.append("Invalid evidence range")
    if fingerprint(model) != model["snapshot"]["source_fingerprint"]:
        errors.append("Source fingerprint mismatch")
    if model["coverage"]["unresolved"] != len(model["unknowns"]):
        errors.append("Unknown count mismatch")
    if re.search(r"postgres(?:ql)?://|password\s*=", canonical(model), re.I):
        errors.append("Credential-bearing connection string is forbidden")
    return sorted(set(errors))
