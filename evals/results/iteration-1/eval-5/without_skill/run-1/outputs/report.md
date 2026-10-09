# Customer name snapshot comparison

before.sql defines public.customers(id bigint PRIMARY KEY, name text). after.sql retains the same table and id primary key, removes name and adds display_name text. The models preserve IDs for unchanged semantic objects; source evidence changes are excluded from semantic difference detection.

The comparison reports one removed column and one added column. name -> display_name is a plausible rename, but the snapshots do not prove one. No rename intent, mapping or migration SQL was supplied. The removed name column is destructive if implemented as DROP COLUMN because it loses stored data and may break absent consumers. Adding display_name alone does not preserve names.

A reviewed ALTER TABLE RENAME COLUMN could preserve data if rename intent is confirmed, followed by coordinated application updates. If this is a different field, define a backfill/retention plan before dropping name. No migration is auto-generated from the ambiguous rename candidate.

before.model.json and after.model.json are complete baseline models; comparison.json records added/removed/changed objects, counts, destructive risk and ambiguity. review.html embeds the after model and comparison data. It allows object search and relationship inspection. No production schema or data was inspected.
