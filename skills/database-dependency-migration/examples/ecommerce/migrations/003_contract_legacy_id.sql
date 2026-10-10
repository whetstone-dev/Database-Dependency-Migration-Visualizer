-- Deliberately hazardous proposal, not executable migration instructions.
-- Requires replaced FKs/views, new keys and verified consumer transition first.
ALTER TABLE public.customers ALTER COLUMN id TYPE uuid USING id::text::uuid;
ALTER TABLE public.orders DROP COLUMN customer_id;
