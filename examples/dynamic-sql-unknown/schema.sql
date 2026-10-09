CREATE TABLE public.customers (id bigint PRIMARY KEY, email text);
CREATE FUNCTION public.lookup_customer(field_name text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE result text;
BEGIN
  EXECUTE 'SELECT ' || quote_ident(field_name) || ' FROM public.customers LIMIT 1' INTO result;
  RETURN result;
END
$$;
