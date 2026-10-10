-- REVIEW ONLY. Expansion requires mapping design and deployment review.
ALTER TABLE public.customers ADD COLUMN customer_uuid uuid;
ALTER TABLE public.orders ADD COLUMN customer_uuid uuid;
ALTER TABLE public.addresses ADD COLUMN customer_uuid uuid;
