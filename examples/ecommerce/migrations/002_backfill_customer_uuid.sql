-- REVIEW ONLY. Operator supplies bounded batches, validates mapping uniqueness
-- and coordinates dual writers. This sketch is not an online backfill runner.
UPDATE public.customers SET customer_uuid = gen_random_uuid() WHERE customer_uuid IS NULL;
UPDATE public.orders o SET customer_uuid = c.customer_uuid
FROM public.customers c WHERE o.customer_id = c.id AND o.customer_uuid IS NULL;
UPDATE public.addresses a SET customer_uuid = c.customer_uuid
FROM public.customers c WHERE a.customer_id = c.id AND a.customer_uuid IS NULL;
