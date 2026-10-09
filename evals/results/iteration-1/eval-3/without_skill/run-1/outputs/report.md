# High traffic migration 007 review

The file is unsafe to run as written. It contains a guaranteed concurrent-index transaction error if execution reaches that statement, a regular index build that blocks writes, and a type conversion that requires an ACCESS EXCLUSIVE lock.

## Definite findings

1. `CREATE INDEX orders_total_idx` is a regular index build. Its SHARE table lock blocks INSERT/UPDATE/DELETE while held; ordinary SELECT remains possible.
2. Changing orders.total_amount from numeric(12,2) to double precision requires ACCESS EXCLUSIVE and physical conversion on this regular table. Its exact decimal contract changes to approximate floating point. The new index can require rebuilding, and the existing nonnegative check must reparse under the new type. The existing customer_summary references different orders columns, so the supplied view is not a demonstrated blocker for total_amount.
3. BEGIN precedes CREATE INDEX CONCURRENTLY. PostgreSQL rejects that command in a transaction block. COMMIT does not make the preceding concurrent build permissible. A migration runner's outer transaction would still be a problem if only these explicit transaction statements were removed.

## Conditional operational risks

metadata.json reports an 8,000,000,000-byte orders table and high traffic, explicitly as user-supplied scenario inputs. They are not discovered production measurements. These conditions raise the risk of waiting writers, lock queues, I/O/WAL pressure and replication lag. No duration or downtime estimate is justified by size alone. Long-lived transactions, available disk, rows, index size, replicas, PostgreSQL version and runner behavior are unknown.

With per-statement autocommit, the first two changes can commit before the later failure. A whole-file transaction wrapper instead leaves a failed transaction requiring rollback and can keep earlier locks until that rollback. The file supplies no lock_timeout or statement_timeout. The sequence builds an index immediately before a likely type-related index rebuild.

## Reviewable changes

Confirm that approximate floating point is acceptable for total_amount; retaining numeric is often the intended accounting contract. If conversion is required, design an expand/backfill/validate/cutover plan and rehearse it on realistic data. Budget locks and preserve the old numeric values during validation. Schedule any concurrent index as a standalone migration outside transaction wrappers. Avoid building orders_total_idx only to rebuild it during conversion. Before execution, gather observed table/workload/replica metadata, runner settings, dependency inventory and recovery evidence.

No SQL was executed, no actual lock was acquired, and no measured operational result is claimed. model.json represents the ecommerce baseline; analysis.json represents the proposed migration and separate metadata evidence.

[PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html), [ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html) and [lock modes](https://www.postgresql.org/docs/18/explicit-locking.html) support the locking and transaction findings.
