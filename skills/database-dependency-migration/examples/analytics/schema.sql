CREATE SCHEMA sales;
CREATE SCHEMA analytics;
CREATE TABLE sales.orders (id bigint PRIMARY KEY, total_amount numeric(12,2) NOT NULL);
CREATE VIEW analytics.order_summary AS SELECT id, total_amount FROM sales.orders;
CREATE VIEW analytics.monthly_revenue AS SELECT sum(total_amount) AS revenue FROM analytics.order_summary;
