order_summary directly depends on sales.orders.total_amount; monthly_revenue depends on it transitively. Catalog rewrite and dependency rows confirm the paths. RESTRICT blocks the drop; CASCADE removes both views and the automatic column constraint. No drop was executed.

All analysis was offline. No SQL was executed. See report.md, analysis.json and the shared transcript.md for evidence and limits.
