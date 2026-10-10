CREATE INDEX orders_total_idx ON public.orders(total_amount);
ALTER TABLE public.orders ALTER COLUMN total_amount TYPE double precision;
BEGIN;
CREATE INDEX CONCURRENTLY orders_created_idx ON public.orders(created_at);
COMMIT;
