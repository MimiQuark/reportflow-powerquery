# Excel and Power Query Automated Operating Report

Automated Excel reporting project built with Power Query M, Python and Mashup OLEDB refresh validation.

- 4 source tables and 6 Power Query queries
- 41,280 clean fact rows
- Real PivotTable, KPI dashboard, issue list and version log
- 6/6 query refresh tests and 4/4 automated tests passed

Run: `.\02_excel_power_query_report\run.ps1`

## Automation evidence

- 4 source tables: sales, products, returns and targets.
- 6 embedded Power Query queries.
- One-click refresh through Excel Data > Refresh All.
- Query flow: clean -> merge -> calculate -> aggregate -> dashboard.
- 6/6 queries passed real Mashup OLEDB refresh tests.