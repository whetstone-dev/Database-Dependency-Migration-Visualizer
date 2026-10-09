007 is unsafe as written. The concurrent index is inside BEGIN and will fail if reached. The regular index blocks writes; numeric-to-double conversion requires ACCESS EXCLUSIVE and changes numeric accuracy. The 8 GB/high traffic inputs are user estimates; wait/outage duration and runner atomicity remain conditional.

All analysis was offline. No SQL was executed. See report.md, analysis.json and the shared transcript.md for evidence and limits.
