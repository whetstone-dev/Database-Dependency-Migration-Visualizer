SELECT o.id, o.customer_id, c.email FROM public.orders o
JOIN public.customers c ON c.id = o.customer_id WHERE o.id = $1;
