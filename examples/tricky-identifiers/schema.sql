CREATE SCHEMA "Commerce";
CREATE TYPE "Commerce".state AS ENUM ('new', 'paid');
CREATE TABLE "Commerce"."Order" (
 "CustomerID" bigint, region integer, status "Commerce".state,
 PRIMARY KEY ("CustomerID", region)
) PARTITION BY RANGE (region);
CREATE TABLE "Commerce".order_eu PARTITION OF "Commerce"."Order" FOR VALUES FROM (1) TO (10);
CREATE TABLE "Commerce".items (
 customer_id bigint, region integer,
 FOREIGN KEY (customer_id, region) REFERENCES "Commerce"."Order" ("CustomerID", region)
);
CREATE FUNCTION "Commerce".label(value bigint) RETURNS text LANGUAGE SQL AS $$ SELECT value::text $$;
CREATE FUNCTION "Commerce".label(value text) RETURNS text LANGUAGE SQL AS $$ SELECT value $$;
