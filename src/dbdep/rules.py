"""Deterministic migration hazards, supported by AST/catalog evidence."""

import copy

from .graph import impact
from .model import Builder, canonical, digest, display
from .planning import plan
from .sql import Inspector, read_statements, strings, typename


class Review:
    def __init__(self, baseline, version="18", metadata=None, transaction_mode="statements"):
        self.b = Builder(version)
        if baseline:
            self.b.model = copy.deepcopy(baseline)
            self.b.nodes = {n["id"]: n for n in self.b.model["nodes"]}
            self.b.edges = {e["id"]: e for e in self.b.model["edges"]}
        self.baseline = baseline
        self.inspector = Inspector(version)
        self.inspector.b = self.b
        self.metadata = {}
        for table, values in (metadata or {}).items():
            if not isinstance(values, dict) or set(values) - {
                "size_bytes",
                "traffic",
                "origin",
                "explanation",
            }:
                raise ValueError(
                    "Metadata accepts table size_bytes, traffic, origin and explanation only"
                )
            if values.get("origin", "user_supplied") != "user_supplied":
                raise ValueError("Operational scenario metadata must be labeled user_supplied")
            if "size_bytes" in values and (
                type(values["size_bytes"]) is not int or values["size_bytes"] < 0
            ):
                raise ValueError("Metadata size_bytes must be a nonnegative integer")
            if values.get("traffic", "unknown") not in {"low", "medium", "high", "unknown"}:
                raise ValueError("Metadata traffic must be low, medium, high or unknown")
            from .graph import select

            if baseline:
                select(baseline, table)
            self.metadata[table] = {k: values[k] for k in ["size_bytes", "traffic"] if k in values}
        if metadata:
            self.metadata_evidence = self.b.evidence(
                "user-metadata",
                canonical(metadata).encode(),
                status="INFERRED",
                origin="user_supplied",
                explanation="User-supplied operational scenario, not discovered measurements. Free-form explanation is hashed only.",
            )
        else:
            self.metadata_evidence = None
        self.transaction = transaction_mode == "single"
        self.external_transaction = self.transaction
        self.operations = []
        self.impacts = []
        self.migration_evidence = set()

    def coverage_findings(self):
        """Every migration coverage gap affects risk, irrespective of prose."""
        for unknown in self.b.model["unknowns"]:
            for ev in sorted(set(unknown["evidence_ids"]) & self.migration_evidence):
                self.finding(
                    "DDM013",
                    ev,
                    unknown["explanation"],
                    "Supply qualified supported SQL or catalog evidence; retain this coverage gap.",
                    "unknown",
                    ["unresolved_dependencies"],
                    [unknown["object_id"]] if unknown.get("object_id") else [],
                )

    def finding(
        self,
        rule,
        ev,
        reason,
        remediation,
        risk="medium",
        dimensions=None,
        nodes=None,
        definite=False,
    ):
        data = {
            "rule_id": rule,
            "origin": "migration_diff",
            "status": "UNKNOWN" if rule == "DDM013" else "PARSED",
            "confidence": "direct" if definite else "conditional",
            "severity": "error"
            if risk == "high"
            else "warning"
            if risk in {"medium", "unknown"}
            else "info",
            "risk_level": risk,
            "risk_dimensions": dimensions or ["compatibility"],
            "reason": reason,
            "remediation": remediation,
            "evidence_ids": [ev],
            "evidence": [ev],
            "object_ids": sorted(set(nodes or [])),
        }
        data["id"] = "finding:" + digest(canonical(data))[7:31]
        if not any(f["id"] == data["id"] for f in self.b.model["findings"]):
            self.b.model["findings"].append(data)

    def target(self, rv, ev, column=None):
        rel = self.inspector.relation(rv, ev)
        if column and rel:
            col = self.inspector.column(rel, column)
            if not col:
                self.b.unknown(f"Unresolved migration column {column}", ev, rel["id"])
            return col
        return rel

    def altered(self, node, ev, operation):
        if not node:
            return
        snapshot = self.b.finish()
        result = impact(snapshot, node["id"])
        result["operation"] = operation
        self.impacts.append(result)
        dependents = [self.b.nodes[n] for n in result["affected"]]
        view_fns = [
            n["id"]
            for n in dependents
            if n["kind"] in {"view", "materialized_view", "function", "procedure", "query"}
        ]
        if view_fns:
            self.finding(
                "DDM008",
                ev,
                "Known views/routines/SQL consumers reference this object. Catalog paths and parsed source references have distinct guarantees; untracked routine bodies remain UNKNOWN.",
                "Review the supplied dependency paths and verify runtime consumers; never claim all function calls were discovered.",
                "high",
                ["compatibility", "unresolved_dependencies"],
                view_fns,
            )
        cits = [n["id"] for n in dependents if n["kind"] in {"constraint", "index", "trigger"}]
        if cits:
            self.finding(
                "DDM014",
                ev,
                "Constraints/indexes/column-specific triggers depend on the changed object via the displayed edge kinds.",
                "Rebuild or transition affected objects with verified order and constraint validation.",
                "high",
                ["compatibility", "deployment_order"],
                cits,
            )
        if node["kind"] == "column" and any(
            k in node["properties"] for k in ["identity", "default", "generated"]
        ):
            self.finding(
                "DDM015",
                ev,
                "Changed column has identity/default/generated semantics; sequence names and implicit casts may need catalog resolution.",
                "Preserve ownership, generation, default behavior and sequence state in a reviewed replacement design.",
                "high",
                ["compatibility", "deployment_order"],
                [node["id"]],
            )

    def operational(self, rv, ev):
        name = display(rv.get("schemaname", "public"), rv["relname"])
        meta = self.metadata.get(name, {})
        if not ("size_bytes" in meta and "traffic" in meta):
            self.finding(
                "DDM012",
                ev,
                "Table size/traffic/runtime statistics are unavailable. Lock mode can be described but duration and downtime are unknown.",
                "Collect labeled metadata and rehearse representative workload; do not invent row counts or timing.",
                "unknown",
                ["locking", "rewrite", "unresolved_dependencies"],
            )

    def cascade(self, behavior, ev, node):
        if behavior == "DROP_CASCADE":
            ids = impact(self.b.finish(), node["id"])["affected"] if node else []
            self.finding(
                "DDM010",
                ev,
                "CASCADE can remove recorded dependent objects. The impact paths include potential static consumers too; those are not PostgreSQL's exact cascade deletion closure.",
                "Review catalog dependency types/internal ownership and explicitly approve each removal. Prefer RESTRICT while investigating.",
                "high",
                ["data_loss", "unresolved_dependencies"],
                ids,
                definite=True,
            )

    def process(self, kind, body, ev):
        self.migration_evidence.add(ev)
        f = self.finding
        if kind == "TransactionStmt":
            k = body["kind"]
            if k in {"TRANS_STMT_BEGIN", "TRANS_STMT_START"}:
                self.transaction = True
            elif k in {"TRANS_STMT_COMMIT", "TRANS_STMT_ROLLBACK"}:
                self.transaction = self.external_transaction
            return
        if kind in {"SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt"}:
            if kind != "SelectStmt":
                self.b.unknown(
                    "DML transformation correctness is not covered by the hazard engine; data changes are never executed or proven.",
                    ev,
                )
            return
        if kind == "IndexStmt":
            rv = body["relation"]
            node = self.target(rv, ev)
            if body.get("concurrent"):
                if self.transaction:
                    f(
                        "DDM006",
                        ev,
                        "CREATE INDEX CONCURRENTLY is forbidden inside a transaction block, including an externally declared single-transaction runner.",
                        "Run the reviewed concurrent index operation outside transaction blocks; inspect invalid-index aftermath on failure.",
                        "high",
                        ["deployment_order", "locking"],
                        definite=True,
                    )
            else:
                f(
                    "DDM005",
                    ev,
                    "Regular CREATE INDEX takes SHARE lock and blocks writes. Impact depends on table size, workload and lock waits; no duration is predicted.",
                    "Consider CREATE INDEX CONCURRENTLY outside transaction blocks; check version/partition restrictions and invalid indexes.",
                    "medium",
                    ["locking"],
                    [node["id"]] if node else [],
                )
            self.operational(rv, ev)
        elif kind == "DropStmt":
            if body.get("removeType") != "OBJECT_TABLE":
                self.b.unknown(
                    "Non-table DROP hazards are not fully assessed; catalog impact is partial.", ev
                )
            for item in body.get("objects", []):
                names = strings(item.get("List", {}).get("items", []))
                node = (
                    self.target(
                        {
                            "relname": names[-1],
                            **({"schemaname": names[-2]} if len(names) > 1 else {}),
                        },
                        ev,
                    )
                    if names
                    and body.get("removeType")
                    in {"OBJECT_TABLE", "OBJECT_VIEW", "OBJECT_MATVIEW", "OBJECT_SEQUENCE"}
                    else None
                )
                if body.get("removeType") == "OBJECT_TABLE":
                    f(
                        "DDM001",
                        ev,
                        "DROP TABLE destroys stored data and can affect dependent objects and consumers.",
                        "Inventory dependents and verify recovery before removing a table.",
                        "high",
                        ["data_loss", "compatibility"],
                        [node["id"]] if node else [],
                        definite=True,
                    )
                    f(
                        "DDM011",
                        ev,
                        "Destructive contract lacks evidence of completed application transition.",
                        "Use expand/backfill/validate/transition/contract and require a consumer transition gate.",
                        "high",
                        ["deployment_order"],
                    )
                self.cascade(body.get("behavior"), ev, node)
                self.altered(node, ev, "drop")
        elif kind == "RenameStmt":
            node = (
                self.target(
                    body["relation"],
                    ev,
                    body.get("subname") if body.get("renameType") == "OBJECT_COLUMN" else None,
                )
                if body.get("relation")
                else None
            )
            if body.get("renameType") == "OBJECT_COLUMN":
                f(
                    "DDM009",
                    ev,
                    "Column rename leaves textual application SQL and API/ORM consumers using the old name. PostgreSQL recorded dependencies can retain identity; that does not update source strings.",
                    "Deploy compatible readers/writers, update SQL references and verify ORM/API/runtime coverage.",
                    "high",
                    ["compatibility", "deployment_order"],
                    [node["id"]] if node else [],
                )
                self.altered(node, ev, "rename-column")
            else:
                self.b.unknown(
                    "Non-column rename compatibility is not assessed.",
                    ev,
                    node["id"] if node else None,
                )
        elif kind == "AlterTableStmt":
            rv = body["relation"]
            for item in body.get("cmds", []):
                c = item["AlterTableCmd"]
                op = c["subtype"]
                node = self.target(rv, ev, c.get("name"))
                ids = [node["id"]] if node else []
                self.operations.append(
                    {
                        "operation": op,
                        "object_id": node["id"] if node else None,
                        "evidence_ids": [ev],
                    }
                )
                if op == "AT_DropColumn":
                    f(
                        "DDM001",
                        ev,
                        "DROP COLUMN destroys column data and affects known dependency/source references.",
                        "Preserve data and transition consumers before a separately reviewed destructive contract.",
                        "high",
                        ["data_loss", "compatibility"],
                        ids,
                        True,
                    )
                    f(
                        "DDM011",
                        ev,
                        "Destructive contract lacks evidence of completed application transition.",
                        "Require expand/backfill/validate/transition gates before contract.",
                        "high",
                        ["deployment_order"],
                        ids,
                    )
                    self.cascade(c.get("behavior"), ev, node)
                elif op == "AT_AlterColumnType":
                    target_type = typename(c["def"]["ColumnDef"]["typeName"])
                    old = node["properties"].get("type", "unknown") if node else "unknown"
                    incompatible = (
                        old in {"int2", "int4", "int8", "bigint", "integer"}
                        and target_type == "uuid"
                    )
                    f(
                        "DDM002",
                        ev,
                        f"Type transition {old} to {target_type}. "
                        + (
                            "BIGINT/integer identifiers have no general semantics-preserving UUID cast. "
                            if incompatible
                            else "Conversion compatibility requires type/cast and data verification. "
                        )
                        + f"PostgreSQL {self.b.model['engine']['version']} ALTER COLUMN TYPE generally takes ACCESS EXCLUSIVE; rewrite/index rebuild depends on cast, typmod and USING expression. Rewrite and lock duration are conditional.",
                        "Design and verify a mapping/replacement column. Check USING, defaults, FKs, views, indexes and actual cast support in a disposable database.",
                        "high" if incompatible or old != target_type else "medium",
                        ["compatibility", "locking", "rewrite"],
                        ids,
                    )
                elif op == "AT_SetNotNull":
                    f(
                        "DDM003",
                        ev,
                        "SET NOT NULL needs proof of no NULLs and lock acquisition. A valid CHECK proving non-nullness can avoid the table scan on supported versions; duration remains unknown.",
                        "On PostgreSQL 14-18 consider CHECK (column IS NOT NULL) NOT VALID, VALIDATE CONSTRAINT, then SET NOT NULL after checking version/partition behavior.",
                        "medium",
                        ["locking", "compatibility"],
                        ids,
                    )
                elif op == "AT_AddColumn":
                    col = c["def"]["ColumnDef"]
                    for d in col.get("constraints", []):
                        d = d["Constraint"]
                        if d["contype"] == "CONSTR_DEFAULT":
                            expr = d.get("raw_expr", {})
                            constant = "A_Const" in expr or (
                                "TypeCast" in expr and "A_Const" in expr["TypeCast"].get("arg", {})
                            )
                            modern = int(self.b.model["engine"]["version"].split(".")[0]) >= 11
                            reason = (
                                "Constant default qualifies for the PostgreSQL 11+ fast default path; ALTER TABLE still acquires ACCESS EXCLUSIVE, so lock wait/duration are not zero."
                                if constant and modern
                                else "Volatile or unclassified default, or pre-11 PostgreSQL: fast default cannot be assumed. random()/nextval() can require per-row evaluation and rewriting; volatility of arbitrary functions is unknown."
                            )
                            f(
                                "DDM004",
                                ev,
                                reason,
                                "Check default volatility and version; consider nullable expansion followed by bounded backfill.",
                                "medium" if constant and modern else "high",
                                ["locking", "rewrite"],
                            )
                        if d["contype"] in {"CONSTR_IDENTITY", "CONSTR_GENERATED"}:
                            f(
                                "DDM015",
                                ev,
                                "New identity/generated column introduces generation and sequence/expression semantics.",
                                "Verify generation, ownership and version-specific behavior before deployment.",
                                "medium",
                                ["compatibility"],
                            )
                        elif d["contype"] not in {"CONSTR_DEFAULT", "CONSTR_NULL"}:
                            self.b.unknown(
                                "New column constraint compatibility/validation is not fully assessed.",
                                ev,
                            )
                elif op == "AT_AddConstraint":
                    constraint = c["def"]["Constraint"]
                    if constraint["contype"] in {"CONSTR_FOREIGN", "CONSTR_CHECK"}:
                        f(
                            "DDM007",
                            ev,
                            "CHECK/FK constraint is "
                            + (
                                "already NOT VALID; existing rows still require validation."
                                if constraint.get("skip_validation")
                                else "validated immediately by default; validation can scan existing rows and acquire locks."
                            ),
                            "For supported CHECK/FK constraints, use NOT VALID and separate VALIDATE CONSTRAINT after checking partition/version restrictions. NOT VALID is not universal for UNIQUE/PRIMARY KEY.",
                            "medium",
                            ["locking", "deployment_order"],
                            ids,
                        )
                    else:
                        self.b.unknown(
                            "Added UNIQUE/PRIMARY KEY/exclusion constraint scans, index construction and locking require independent review.",
                            ev,
                        )
                elif op in {
                    "AT_ColumnDefault",
                    "AT_AddIdentity",
                    "AT_SetIdentity",
                    "AT_DropIdentity",
                    "AT_SetExpression",
                    "AT_DropExpression",
                }:
                    f(
                        "DDM015",
                        ev,
                        "Default/identity/generated expression semantics change; existing and future rows can behave differently.",
                        "Verify default casts, sequence ownership/state and generated expression consumers.",
                        "medium",
                        ["compatibility"],
                        ids,
                    )
                elif op not in {"AT_DropNotNull", "AT_ValidateConstraint"}:
                    self.b.unknown(
                        f"Migration operation {op} is not covered by the hazard engine.",
                        ev,
                        node["id"] if node else None,
                    )
                if op in {"AT_DropColumn", "AT_AlterColumnType"}:
                    self.altered(node, ev, op)
                self.operational(rv, ev)
        elif kind in {
            "CreateStmt",
            "CreateSchemaStmt",
            "ViewStmt",
            "CreateFunctionStmt",
            "CreateSeqStmt",
            "CreateEnumStmt",
            "CreateTrigStmt",
            "CreateExtensionStmt",
        }:
            self.b.unknown(
                f"Migration {kind} is parsed but target schema replay/replacement compatibility is not implemented.",
                ev,
            )
        else:
            self.b.unknown(f"Unsupported migration statement {kind}", ev)


def review(baseline, path, version="18", metadata=None, transaction_mode="statements"):
    r = Review(baseline, version, metadata, transaction_mode)
    for kind, body, ev in read_statements(path, r.b, "migration_diff"):
        r.process(kind, body, ev)
    r.coverage_findings()
    model = r.b.finish()
    risks = {f["risk_level"] for f in model["findings"]}
    return {
        "schema_version": "1.0.0",
        "review_only": True,
        "model": model,
        "operations": r.operations,
        "impacts": r.impacts,
        "plan": plan(model["findings"]),
        "risk_level": "high"
        if "high" in risks
        else "unknown"
        if "unknown" in risks
        else "medium"
        if risks
        else "low",
        "metadata": {
            "origin": "user_supplied",
            "status": "INFERRED",
            "evidence_ids": [r.metadata_evidence] if r.metadata_evidence else [],
            "tables": r.metadata,
        },
        "limitations": [
            "SQL is never executed. Baseline is not replayed into a target schema.",
            "Runtime consumers, table statistics and deployment completion require independent evidence.",
        ],
    }


def assess_operation(model, node, operation, target_type=None):
    from .sql import statements

    r = Review(model)
    ev = r.b.evidence(
        "user-operation",
        canonical([node["id"], operation, target_type]).encode(),
        origin="user_supplied",
    )
    rv = {"schemaname": node["schema"], "relname": node["parent"] or node["name"]}
    if operation in {"alter-type", "drop-column", "rename-column"} and node["kind"] != "column":
        raise ValueError("This operation requires a column selector")
    if operation == "alter-type":
        if not target_type:
            raise ValueError("alter-type requires --to <PostgreSQL type>")
        try:
            stmt = statements("SELECT NULL::" + target_type)
            body = stmt[0]["stmt"]["SelectStmt"]
            if (
                len(stmt) != 1
                or len(body["targetList"]) != 1
                or set(body) - {"targetList", "op", "limitOption"}
            ):
                raise ValueError()
            cast = body["targetList"][0]["ResTarget"]["val"]["TypeCast"]
            if cast["arg"] != {"A_Const": {"isnull": True, "location": 7}}:
                raise ValueError()
            t = cast["typeName"]
        except (ValueError, KeyError, IndexError) as exc:
            raise ValueError("Malformed target type; supply one PostgreSQL type") from exc
        r.process(
            "AlterTableStmt",
            {
                "relation": rv,
                "cmds": [
                    {
                        "AlterTableCmd": {
                            "subtype": "AT_AlterColumnType",
                            "name": node["name"],
                            "def": {"ColumnDef": {"typeName": t}},
                        }
                    }
                ],
            },
            ev,
        )
    elif operation == "drop-column":
        r.process(
            "AlterTableStmt",
            {
                "relation": rv,
                "cmds": [{"AlterTableCmd": {"subtype": "AT_DropColumn", "name": node["name"]}}],
            },
            ev,
        )
    elif operation == "rename-column":
        r.process(
            "RenameStmt",
            {"relation": rv, "renameType": "OBJECT_COLUMN", "subname": node["name"]},
            ev,
        )
    elif operation == "drop-table":
        if node["kind"] not in {"table", "partitioned_table"}:
            raise ValueError("drop-table requires a table selector")
        r.finding(
            "DDM001",
            ev,
            "Dropping this table destroys stored data and affects dependents.",
            "Preserve data and review all dependencies before destructive contract.",
            "high",
            ["data_loss", "compatibility"],
            [node["id"]],
            True,
        )
        r.altered(node, ev, operation)
    elif operation == "replace-view":
        if node["kind"] not in {"view", "materialized_view"}:
            raise ValueError("replace-view requires a view selector")
        r.b.unknown(
            "Replacement view SQL is unavailable; compatibility and column shape remain unknown.",
            ev,
            node["id"],
        )
        r.finding(
            "DDM013",
            ev,
            "Replacement definition is missing; no compatibility proof is possible.",
            "Review the actual replacement SQL and output-column contract.",
            "unknown",
            ["compatibility", "unresolved_dependencies"],
            [node["id"]],
        )
        r.altered(node, ev, operation)
    else:
        raise ValueError("Unsupported impact operation")
    r.coverage_findings()
    findings = r.b.finish()["findings"]
    levels = {f["risk_level"] for f in findings}
    return {
        "findings": findings,
        "risk_level": "high"
        if "high" in levels
        else "unknown"
        if "unknown" in levels
        else "medium"
        if levels
        else "low",
        "plan": plan(findings),
        "operation_evidence": r.b.model["evidence"],
    }
