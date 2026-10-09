/** Deterministic migration hazards grounded in PostgreSQL AST/catalog evidence. */
import { impact, select } from "./graph.mjs";
import { Builder, canonical, digest, display, compare } from "./model.mjs";
import { plan } from "./planning.mjs";
import { normalize_target_type } from "./types.mjs";
import {
  Inspector,
  read_statements,
  strings,
  typename,
  statements,
} from "./sql.mjs";

const levels = (findings) => {
  const risks = new Set(findings.map((f) => f.risk_level));
  return risks.has("high")
    ? "high"
    : risks.has("unknown")
      ? "unknown"
      : risks.size
        ? "medium"
        : "low";
};
export class Review {
  constructor(
    baseline,
    version = "18",
    metadata = null,
    transaction_mode = "statements",
  ) {
    this.b = new Builder(version);
    if (baseline) {
      this.b.model = structuredClone(baseline);
      this.b.nodes = new Map(this.b.model.nodes.map((n) => [n.id, n]));
      this.b.edges = new Map(this.b.model.edges.map((e) => [e.id, e]));
    }
    this.baseline = baseline;
    this.inspector = new Inspector(version);
    this.inspector.b = this.b;
    this.metadata = {};
    for (const [table, values] of Object.entries(metadata ?? {})) {
      if (
        !values ||
        Array.isArray(values) ||
        typeof values !== "object" ||
        Object.keys(values).some(
          (k) =>
            !["size_bytes", "traffic", "origin", "explanation"].includes(k),
        )
      )
        throw new Error(
          "Metadata accepts table size_bytes, traffic, origin and explanation only",
        );
      if ((values.origin ?? "user_supplied") !== "user_supplied")
        throw new Error(
          "Operational scenario metadata must be labeled user_supplied",
        );
      if (
        "size_bytes" in values &&
        (!Number.isSafeInteger(values.size_bytes) || values.size_bytes < 0)
      )
        throw new Error("Metadata size_bytes must be a nonnegative integer");
      if (
        !["low", "medium", "high", "unknown"].includes(
          values.traffic ?? "unknown",
        )
      )
        throw new Error(
          "Metadata traffic must be low, medium, high or unknown",
        );
      if (baseline) select(baseline, table);
      this.metadata[table] = Object.fromEntries(
        ["size_bytes", "traffic"]
          .filter((k) => k in values)
          .map((k) => [k, values[k]]),
      );
    }
    this.metadata_evidence =
      metadata && Object.keys(metadata).length
        ? this.b.evidence(
            "user-metadata",
            Buffer.from(canonical(metadata)),
            0,
            0,
            "INFERRED",
            "user_supplied",
            {
              explanation:
                "User-supplied operational scenario, not discovered measurements. Free-form explanation is hashed only.",
            },
          )
        : null;
    if (!["single", "statements"].includes(transaction_mode))
      throw new Error("Transaction mode must be statements or single");
    this.transaction = transaction_mode === "single";
    this.external_transaction = this.transaction;
    this.operations = [];
    this.impacts = [];
    this.migration_evidence = new Set();
  }
  coverage_findings() {
    for (const unknown of this.b.model.unknowns)
      for (const ev of [...new Set(unknown.evidence_ids)]
        .filter((ev) => this.migration_evidence.has(ev))
        .sort(compare))
        this.finding(
          "DDM013",
          ev,
          unknown.explanation,
          "Supply qualified supported SQL or catalog evidence; retain this coverage gap.",
          "unknown",
          ["unresolved_dependencies"],
          unknown.object_id ? [unknown.object_id] : [],
        );
  }
  finding(
    rule,
    ev,
    reason,
    remediation,
    risk = "medium",
    dimensions = null,
    nodes = null,
    definite = false,
  ) {
    const data = {
      rule_id: rule,
      origin: "migration_diff",
      status: rule === "DDM013" ? "UNKNOWN" : "PARSED",
      confidence: definite ? "direct" : "conditional",
      severity:
        risk === "high"
          ? "error"
          : ["medium", "unknown"].includes(risk)
            ? "warning"
            : "info",
      risk_level: risk,
      risk_dimensions: dimensions?.length ? dimensions : ["compatibility"],
      reason,
      remediation,
      evidence_ids: [ev],
      evidence: [ev],
      object_ids: [...new Set(nodes ?? [])].sort(compare),
    };
    data.id = "finding:" + digest(canonical(data)).slice(7, 31);
    if (!this.b.model.findings.some((f) => f.id === data.id))
      this.b.model.findings.push(data);
  }
  target(rv, ev, column = null) {
    const rel = this.inspector.relation(rv, ev);
    if (column && rel) {
      const col = this.inspector.column(rel, column);
      if (!col)
        this.b.unknown(`Unresolved migration column ${column}`, ev, rel.id);
      return col;
    }
    return rel;
  }
  altered(node, ev, operation) {
    if (!node) return;
    const result = impact(this.b.finish(), node.id);
    result.operation = operation;
    this.impacts.push(result);
    const dependents = result.affected.map((id) => this.b.nodes.get(id));
    const viewFns = dependents
      .filter((n) =>
        [
          "view",
          "materialized_view",
          "function",
          "procedure",
          "query",
        ].includes(n.kind),
      )
      .map((n) => n.id);
    if (viewFns.length)
      this.finding(
        "DDM008",
        ev,
        "Known views/routines/SQL consumers reference this object. Catalog paths and parsed source references have distinct guarantees; untracked routine bodies remain UNKNOWN.",
        "Review the supplied dependency paths and verify runtime consumers; never claim all function calls were discovered.",
        "high",
        ["compatibility", "unresolved_dependencies"],
        viewFns,
      );
    const cits = dependents
      .filter((n) => ["constraint", "index", "trigger"].includes(n.kind))
      .map((n) => n.id);
    if (cits.length)
      this.finding(
        "DDM014",
        ev,
        "Constraints/indexes/column-specific triggers depend on the changed object via the displayed edge kinds.",
        "Rebuild or transition affected objects with verified order and constraint validation.",
        "high",
        ["compatibility", "deployment_order"],
        cits,
      );
    if (
      node.kind === "column" &&
      ["identity", "default", "generated"].some((k) => k in node.properties)
    )
      this.finding(
        "DDM015",
        ev,
        "Changed column has identity/default/generated semantics; sequence names and implicit casts may need catalog resolution.",
        "Preserve ownership, generation, default behavior and sequence state in a reviewed replacement design.",
        "high",
        ["compatibility", "deployment_order"],
        [node.id],
      );
  }
  operational(rv, ev) {
    const meta =
      this.metadata[display(rv.schemaname ?? "public", rv.relname)] ?? {};
    if (!("size_bytes" in meta && "traffic" in meta))
      this.finding(
        "DDM012",
        ev,
        "Table size/traffic/runtime statistics are unavailable. Lock mode can be described but duration and downtime are unknown.",
        "Collect labeled metadata and rehearse representative workload; do not invent row counts or timing.",
        "unknown",
        ["locking", "rewrite", "unresolved_dependencies"],
      );
  }
  cascade(behavior, ev, node) {
    if (behavior !== "DROP_CASCADE") return;
    const ids = node ? impact(this.b.finish(), node.id).affected : [];
    this.finding(
      "DDM010",
      ev,
      "CASCADE can remove recorded dependent objects. The impact paths include potential static consumers too; those are not PostgreSQL's exact cascade deletion closure.",
      "Review catalog dependency types/internal ownership and explicitly approve each removal. Prefer RESTRICT while investigating.",
      "high",
      ["data_loss", "unresolved_dependencies"],
      ids,
      true,
    );
  }
  process(kind, body, ev, target_type = null) {
    this.migration_evidence.add(ev);
    const f = this.finding.bind(this);
    if (kind === "TransactionStmt") {
      if (["TRANS_STMT_BEGIN", "TRANS_STMT_START"].includes(body.kind))
        this.transaction = true;
      else if (["TRANS_STMT_COMMIT", "TRANS_STMT_ROLLBACK"].includes(body.kind))
        this.transaction = this.external_transaction || Boolean(body.chain);
      else if (body.kind === "TRANS_STMT_PREPARE") {
        this.transaction = this.external_transaction;
        this.b.unknown(
          "PREPARE TRANSACTION ends the local transaction but leaves a prepared transaction. Two-phase configuration, outcome and runner compatibility are not verified.",
          ev,
        );
      } else if (
        ["TRANS_STMT_COMMIT_PREPARED", "TRANS_STMT_ROLLBACK_PREPARED"].includes(
          body.kind,
        )
      ) {
        // These operate on a separate prepared transaction, never the active local one.
        this.b.unknown(
          "COMMIT/ROLLBACK PREPARED requires external prepared-transaction evidence and is forbidden inside a local transaction block. It does not end the local transaction.",
          ev,
        );
      }
      return;
    }
    if (
      ["SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt"].includes(kind)
    ) {
      if (kind !== "SelectStmt")
        this.b.unknown(
          "DML transformation correctness is not covered by the hazard engine; data changes are never executed or proven.",
          ev,
        );
      return;
    }
    if (kind === "IndexStmt") {
      const rv = body.relation,
        node = this.target(rv, ev);
      if (body.concurrent) {
        if (this.transaction)
          f(
            "DDM006",
            ev,
            "CREATE INDEX CONCURRENTLY is forbidden inside a transaction block, including an externally declared single-transaction runner.",
            "Run the reviewed concurrent index operation outside transaction blocks; inspect invalid-index aftermath on failure.",
            "high",
            ["deployment_order", "locking"],
            null,
            true,
          );
      } else
        f(
          "DDM005",
          ev,
          "Regular CREATE INDEX takes SHARE lock and blocks writes. Impact depends on table size, workload and lock waits; no duration is predicted.",
          "Consider CREATE INDEX CONCURRENTLY outside transaction blocks; check version/partition restrictions and invalid indexes.",
          "medium",
          ["locking"],
          node ? [node.id] : [],
        );
      this.operational(rv, ev);
    } else if (kind === "DropStmt") {
      if (body.removeType !== "OBJECT_TABLE")
        this.b.unknown(
          "Non-table DROP hazards are not fully assessed; catalog impact is partial.",
          ev,
        );
      for (const item of body.objects ?? []) {
        const names = strings(item.List?.items ?? []);
        const node =
          names.length &&
          [
            "OBJECT_TABLE",
            "OBJECT_VIEW",
            "OBJECT_MATVIEW",
            "OBJECT_SEQUENCE",
          ].includes(body.removeType)
            ? this.target(
                {
                  relname: names.at(-1),
                  ...(names.length > 1 ? { schemaname: names.at(-2) } : {}),
                },
                ev,
              )
            : null;
        if (body.removeType === "OBJECT_TABLE") {
          f(
            "DDM001",
            ev,
            "DROP TABLE destroys stored data and can affect dependent objects and consumers.",
            "Inventory dependents and verify recovery before removing a table.",
            "high",
            ["data_loss", "compatibility"],
            node ? [node.id] : [],
            true,
          );
          f(
            "DDM011",
            ev,
            "Destructive contract lacks evidence of completed application transition.",
            "Use expand/backfill/validate/transition/contract and require a consumer transition gate.",
            "high",
            ["deployment_order"],
          );
        }
        this.cascade(body.behavior, ev, node);
        this.altered(node, ev, "drop");
      }
    } else if (kind === "RenameStmt") {
      const node = body.relation
        ? this.target(
            body.relation,
            ev,
            body.renameType === "OBJECT_COLUMN" ? body.subname : null,
          )
        : null;
      if (body.renameType === "OBJECT_COLUMN") {
        f(
          "DDM009",
          ev,
          "Column rename leaves textual application SQL and API/ORM consumers using the old name. PostgreSQL recorded dependencies can retain identity; that does not update source strings.",
          "Deploy compatible readers/writers, update SQL references and verify ORM/API/runtime coverage.",
          "high",
          ["compatibility", "deployment_order"],
          node ? [node.id] : [],
        );
        this.altered(node, ev, "rename-column");
      } else
        this.b.unknown(
          "Non-column rename compatibility is not assessed.",
          ev,
          node?.id ?? null,
        );
    } else if (kind === "AlterTableStmt") {
      const rv = body.relation;
      for (const item of body.cmds ?? []) {
        const c = item.AlterTableCmd,
          op = c.subtype,
          node = this.target(rv, ev, c.name),
          ids = node ? [node.id] : [];
        this.operations.push({
          operation: op,
          object_id: node?.id ?? null,
          evidence_ids: [ev],
        });
        if (op === "AT_DropColumn") {
          f(
            "DDM001",
            ev,
            "DROP COLUMN destroys column data and affects known dependency/source references.",
            "Preserve data and transition consumers before a separately reviewed destructive contract.",
            "high",
            ["data_loss", "compatibility"],
            ids,
            true,
          );
          f(
            "DDM011",
            ev,
            "Destructive contract lacks evidence of completed application transition.",
            "Require expand/backfill/validate/transition gates before contract.",
            "high",
            ["deployment_order"],
            ids,
          );
          this.cascade(c.behavior, ev, node);
        } else if (op === "AT_AlterColumnType") {
          const targetType = typename(c.def.ColumnDef.typeName),
            old = node?.properties.type ?? "unknown";
          const incompatible =
            ["int2", "int4", "int8", "bigint", "integer"].includes(old) &&
            targetType === "uuid";
          const reason =
            `Type transition ${old} to ${target_type ?? targetType}. ` +
            (incompatible
              ? "BIGINT/integer identifiers have no general semantics-preserving UUID cast. "
              : "Conversion compatibility requires type/cast and data verification. ") +
            `PostgreSQL ${this.b.model.engine.version} ALTER COLUMN TYPE generally takes ACCESS EXCLUSIVE; rewrite/index rebuild depends on cast, typmod and USING expression. Rewrite and lock duration are conditional.`;
          f(
            "DDM002",
            ev,
            reason,
            "Design and verify a mapping/replacement column. Check USING, defaults, FKs, views, indexes and actual cast support in a disposable database.",
            incompatible || old !== targetType ? "high" : "medium",
            ["compatibility", "locking", "rewrite"],
            ids,
          );
        } else if (op === "AT_SetNotNull")
          f(
            "DDM003",
            ev,
            "SET NOT NULL needs proof of no NULLs and lock acquisition. A valid CHECK proving non-nullness can avoid the table scan on supported versions; duration remains unknown.",
            "On PostgreSQL 14-18 consider CHECK (column IS NOT NULL) NOT VALID, VALIDATE CONSTRAINT, then SET NOT NULL after checking version/partition behavior.",
            "medium",
            ["locking", "compatibility"],
            ids,
          );
        else if (op === "AT_AddColumn") {
          for (const item of c.def.ColumnDef.constraints ?? []) {
            const d = item.Constraint;
            if (d.contype === "CONSTR_DEFAULT") {
              const expr = d.raw_expr ?? {},
                constant = Boolean(expr.A_Const || expr.TypeCast?.arg?.A_Const),
                modern =
                  Number(this.b.model.engine.version.split(".")[0]) >= 11;
              const reason =
                constant && modern
                  ? "Constant default qualifies for the PostgreSQL 11+ fast default path; ALTER TABLE still acquires ACCESS EXCLUSIVE, so lock wait/duration are not zero."
                  : "Volatile or unclassified default, or pre-11 PostgreSQL: fast default cannot be assumed. random()/nextval() can require per-row evaluation and rewriting; volatility of arbitrary functions is unknown.";
              f(
                "DDM004",
                ev,
                reason,
                "Check default volatility and version; consider nullable expansion followed by bounded backfill.",
                constant && modern ? "medium" : "high",
                ["locking", "rewrite"],
              );
            }
            if (["CONSTR_IDENTITY", "CONSTR_GENERATED"].includes(d.contype))
              f(
                "DDM015",
                ev,
                "New identity/generated column introduces generation and sequence/expression semantics.",
                "Verify generation, ownership and version-specific behavior before deployment.",
                "medium",
                ["compatibility"],
              );
            else if (!["CONSTR_DEFAULT", "CONSTR_NULL"].includes(d.contype))
              this.b.unknown(
                "New column constraint compatibility/validation is not fully assessed.",
                ev,
              );
          }
        } else if (op === "AT_AddConstraint") {
          const constraint = c.def.Constraint;
          if (["CONSTR_FOREIGN", "CONSTR_CHECK"].includes(constraint.contype))
            f(
              "DDM007",
              ev,
              "CHECK/FK constraint is " +
                (constraint.skip_validation
                  ? "already NOT VALID; existing rows still require validation."
                  : "validated immediately by default; validation can scan existing rows and acquire locks."),
              "For supported CHECK/FK constraints, use NOT VALID and separate VALIDATE CONSTRAINT after checking partition/version restrictions. NOT VALID is not universal for UNIQUE/PRIMARY KEY.",
              "medium",
              ["locking", "deployment_order"],
              ids,
            );
          else
            this.b.unknown(
              "Added UNIQUE/PRIMARY KEY/exclusion constraint scans, index construction and locking require independent review.",
              ev,
            );
        } else if (
          [
            "AT_ColumnDefault",
            "AT_AddIdentity",
            "AT_SetIdentity",
            "AT_DropIdentity",
            "AT_SetExpression",
            "AT_DropExpression",
          ].includes(op)
        )
          f(
            "DDM015",
            ev,
            "Default/identity/generated expression semantics change; existing and future rows can behave differently.",
            "Verify default casts, sequence ownership/state and generated expression consumers.",
            "medium",
            ["compatibility"],
            ids,
          );
        else if (!["AT_DropNotNull", "AT_ValidateConstraint"].includes(op))
          this.b.unknown(
            `Migration operation ${op} is not covered by the hazard engine.`,
            ev,
            node?.id ?? null,
          );
        if (["AT_DropColumn", "AT_AlterColumnType"].includes(op))
          this.altered(node, ev, op);
        this.operational(rv, ev);
      }
    } else if (
      [
        "CreateStmt",
        "CreateSchemaStmt",
        "ViewStmt",
        "CreateFunctionStmt",
        "CreateSeqStmt",
        "CreateEnumStmt",
        "CreateTrigStmt",
        "CreateExtensionStmt",
      ].includes(kind)
    )
      this.b.unknown(
        `Migration ${kind} is parsed but target schema replay/replacement compatibility is not implemented.`,
        ev,
      );
    else this.b.unknown(`Unsupported migration statement ${kind}`, ev);
  }
}
export function review(
  baseline,
  file,
  version = "18",
  metadata = null,
  transaction_mode = "statements",
) {
  const r = new Review(baseline, version, metadata, transaction_mode);
  for (const [kind, body, ev] of read_statements(file, r.b, "migration_diff"))
    r.process(kind, body, ev);
  r.coverage_findings();
  const model = r.b.finish();
  return {
    schema_version: "1.0.0",
    review_only: true,
    model,
    operations: r.operations,
    impacts: r.impacts,
    plan: plan(model.findings),
    risk_level: levels(model.findings),
    metadata: {
      origin: "user_supplied",
      status: "INFERRED",
      evidence_ids: r.metadata_evidence ? [r.metadata_evidence] : [],
      tables: r.metadata,
    },
    limitations: [
      "SQL is never executed. Baseline is not replayed into a target schema.",
      "Runtime consumers, table statistics and deployment completion require independent evidence.",
      "Phases are a review checklist, not target-specific executable migrations. Apply relevant phases to the supplied change and verify operational prerequisites.",
    ],
  };
}
export function assess_operation(model, node, operation, target_type = null) {
  target_type = normalize_target_type(target_type);
  const r = new Review(model),
    ev = r.b.evidence(
      "user-operation",
      Buffer.from(canonical([node.id, operation, target_type])),
      0,
      0,
      "PARSED",
      "user_supplied",
    );
  const rv = { schemaname: node.schema, relname: node.parent || node.name };
  if (
    ["alter-type", "drop-column", "rename-column"].includes(operation) &&
    node.kind !== "column"
  )
    throw new Error("This operation requires a column selector");
  if (operation === "alter-type") {
    if (!target_type)
      throw new Error("alter-type requires --to <PostgreSQL type>");
    let t;
    try {
      const stmts = statements("SELECT NULL::" + target_type),
        body = stmts[0].stmt.SelectStmt;
      if (
        stmts.length !== 1 ||
        body.targetList.length !== 1 ||
        Object.keys(body).some(
          (k) => !["targetList", "op", "limitOption"].includes(k),
        )
      )
        throw new Error();
      const cast = body.targetList[0].ResTarget.val.TypeCast;
      if (
        canonical(cast.arg) !==
        canonical({ A_Const: { isnull: true, location: 7 } })
      )
        throw new Error();
      t = cast.typeName;
    } catch {
      throw new Error("Malformed target type; supply one PostgreSQL type");
    }
    r.process(
      "AlterTableStmt",
      {
        relation: rv,
        cmds: [
          {
            AlterTableCmd: {
              subtype: "AT_AlterColumnType",
              name: node.name,
              def: { ColumnDef: { typeName: t } },
            },
          },
        ],
      },
      ev,
      target_type,
    );
  } else if (operation === "drop-column")
    r.process(
      "AlterTableStmt",
      {
        relation: rv,
        cmds: [
          { AlterTableCmd: { subtype: "AT_DropColumn", name: node.name } },
        ],
      },
      ev,
    );
  else if (operation === "rename-column")
    r.process(
      "RenameStmt",
      { relation: rv, renameType: "OBJECT_COLUMN", subname: node.name },
      ev,
    );
  else if (operation === "drop-table") {
    if (!["table", "partitioned_table"].includes(node.kind))
      throw new Error("drop-table requires a table selector");
    r.finding(
      "DDM001",
      ev,
      "Dropping this table destroys stored data and affects dependents.",
      "Preserve data and review all dependencies before destructive contract.",
      "high",
      ["data_loss", "compatibility"],
      [node.id],
      true,
    );
    r.altered(node, ev, operation);
  } else if (operation === "replace-view") {
    if (!["view", "materialized_view"].includes(node.kind))
      throw new Error("replace-view requires a view selector");
    r.b.unknown(
      "Replacement view SQL is unavailable; compatibility and column shape remain unknown.",
      ev,
      node.id,
    );
    r.finding(
      "DDM013",
      ev,
      "Replacement definition is missing; no compatibility proof is possible.",
      "Review the actual replacement SQL and output-column contract.",
      "unknown",
      ["compatibility", "unresolved_dependencies"],
      [node.id],
    );
    r.altered(node, ev, operation);
  } else throw new Error("Unsupported impact operation");
  r.coverage_findings();
  const findings = r.b.finish().findings;
  return {
    findings,
    risk_level: levels(findings),
    plan: plan(findings),
    operation_evidence: r.b.model.evidence,
  };
}
