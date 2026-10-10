SELECT c.id, c.email, c.name FROM public.customers AS c WHERE c.id = $1;
