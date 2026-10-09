Created separate models for both fixtures. public.orders and sales.orders stay distinct; unqualified orders remains unresolved. Exact quoted case, enum dependency, function overload signatures, composite FK ordering and partition bounds/inherited columns are preserved. Physical partition implementation objects require catalog evidence.

All analysis was offline. No SQL was executed. See report.md, analysis.json and the shared transcript.md for evidence and limits.
