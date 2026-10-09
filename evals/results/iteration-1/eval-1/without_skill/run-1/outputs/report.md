# Customer ID migration review

Changing public.customers.id from bigint to uuid affects both direct foreign keys, the primary key, its supporting index and identity generator, public.customer_summary, and both supplied application SQL queries. The graph and analysis.json retain provider-to-consumer paths and source evidence. The orders_customer_idx index becomes part of the review scope through orders.customer_id. The join and grouped output of customer_summary need a coordinated replacement. Other orders child foreign keys reference orders.id, which is not the changed key.

## Grounded impacts

- public.addresses.customer_id and public.orders.customer_id currently have bigint foreign keys to public.customers.id. Their UUID replacements must use the exact parent mapping. Review both local NOT NULL requirements and the parent key.
- public.customers.id is a bigint identity primary key. UUID requires a UUID generation policy and replacement uniqueness/key design. The identity sequence cannot generate UUID values.
- public.customer_summary selects c.id and joins o.customer_id = c.id. Its current output type and join block an in-place type change while the view remains.
- ecommerce/app/customers.sql selects and filters c.id with $1. Update parameter encoding, result typing and callers.
- ecommerce/app/orders.sql joins c.id = o.customer_id. Update both sides and downstream result contracts.
- public.touch_customer only assigns NEW.updated_at. The supplied source contains no ID use. Its customer trigger needs coexistence review but has no grounded ID-column dependency.

## Review the supplied migrations

001 adds nullable UUID columns to customers, orders and addresses. It supplies neither defaults, unique keys, foreign keys nor dual writing. These metadata changes still acquire table locks.

002 runs three unbounded UPDATE statements. It generates one parent UUID and copies it by the existing key. The joins preserve the intended mapping, but the file does not bound batches or handle concurrent inserts/updates. Verify gen_random_uuid availability on the chosen server. Repeated parent updates are filtered by IS NULL. Child rechecks and writer coordination remain required.

003 is unsafe as supplied. `id::text::uuid` does not map an integer to its staged customer_uuid. Ordinary decimal bigint values do not satisfy UUID input syntax, including alternate UUID spellings. The identity, bigint foreign keys and existing view also prevent the proposed direct transition. Dropping orders.customer_id loses the old join key, drops local dependent objects, and is blocked under default RESTRICT by customer_summary. The file does not contract addresses.customer_id.

## Staged plan for operator review

1. Inventory production catalog dependents, application owners, ORM types, jobs, external integrations and replication; capture recoverable backups and define measurable cutover/rollback criteria. Offline inputs are incomplete.
2. Expand with nullable UUID columns and deploy compatible dual writers. Generate one UUID per customer using an explicit default/policy, preserve an immutable one-to-one bigint-to-UUID mapping, and propagate parent UUIDs to child rows. UUID uniqueness cannot be assumed from the generator alone.
3. Backfill bounded batches using stable keys, checkpoints and a tested write-race strategy. Measure null/duplicate mappings, unmatched children and mismatched UUID links. Reconcile again after concurrent writes.
4. Build parent UUID uniqueness using a separately scheduled concurrent index where appropriate. Add/validate UUID foreign keys in reviewed stages, prove NOT NULL, and coordinate key attachment with lock budgets. Keep the legacy keys and mappings through the rollback window.
5. Replace the view and application SQL together, including parameter/result types. Deploy compatible reads first, then switch callers and writes with observed metrics. Customer IDs are different values; casting is not a migration mapping.
6. Contract only after all consumers have transitioned and retention requirements allow it. Remove/recreate dependent views and foreign keys deliberately, handle both orders and addresses, and replace identity generation. Design the final UUID column name and primary key explicitly. Do not execute 003 as written.

Rollback before contract can switch readers back to retained bigint keys and replay dual-write gaps. After legacy data/keys are removed, rollback may require mapping retention or restoration. No rollback timing, data volumes or production lock duration can be established offline.

## Evidence and limits

Evidence comes from ecommerce/schema.sql, app/customers.sql, app/orders.sql and migrations/001, 002, 003. model.json uses a declared baseline canonical format with deterministic IDs, source evidence, consumer-to-provider edges and explicit uncertainty. Identity generators and supporting constraint indexes are inferred. No physical sequence names are claimed.

[PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html) documents locking and dependent-object behavior. [PostgreSQL UUID input](https://www.postgresql.org/docs/18/datatype-uuid.html) defines accepted UUID values.
