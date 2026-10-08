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
## Reusable configuration

The workbook contains a `config_parameters` table. Set `SourceMode` to `WorkbookTables` or `Folder`, then configure the source folder, file names, minimum quantity, maximum discount, report name and version. The reusable query `qry_fact_sales_reusable` uses these parameters, and `qry_refresh_log` records refresh time, report, version and source mode. Ten queries are embedded in the final workbook.
Refresh evidence: docs/assets/powerquery-refresh-report.json
