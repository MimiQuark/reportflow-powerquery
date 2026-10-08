$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$SourceWorkbook = Join-Path $ProjectRoot "output\自动化经营报表-含PowerQuery.xlsx"
$TempWorkbook = Join-Path $env:TEMP ("automated_report_powerquery_" + [guid]::NewGuid().ToString("N") + ".xlsx")
$Queries = @("qry_fact_sales", "qry_monthly_kpi", "qry_category_kpi", "qry_region_kpi", "qry_return_summary", "qry_quality_issues")
Copy-Item -LiteralPath $SourceWorkbook -Destination $TempWorkbook -Force

$results = @()
$excel = $null
$workbook = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
    $workbook = $excel.Workbooks.Open($TempWorkbook, $false, $false)

    foreach ($name in $Queries) {
        $sheet = $workbook.Worksheets.Add()
        $sheet.Name = "T_$name"
        $connection = "OLEDB;Provider=Microsoft.Mashup.OleDb.1;Data Source=`$Workbook`$;Location=$name;Extended Properties=`"`""
        $queryTable = $sheet.QueryTables.Add($connection, $sheet.Range("A1"))
        $queryTable.CommandType = 2
        $queryTable.CommandText = "SELECT * FROM [$name]"
        $queryTable.BackgroundQuery = $false
        $queryTable.Refresh($false)
        $used = $sheet.UsedRange
        $results += [ordered]@{
            query = $name
            rows = [int]$used.Rows.Count
            columns = [int]$used.Columns.Count
            passed = ([int]$used.Rows.Count -gt 0 -and [int]$used.Columns.Count -gt 0)
        }
        $queryTable.Delete()
    }

    $report = [ordered]@{
        workbook = $SourceWorkbook
        testedAt = (Get-Date).ToString("s")
        passed = (@($results | Where-Object { -not $_.passed }).Count -eq 0)
        results = $results
    }
    $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $ProjectRoot "output\powerquery_refresh_report.json") -Encoding utf8
    $workbook.Close($false)
    $excel.Quit()
    $report | ConvertTo-Json -Depth 5
}
finally {
    if ($workbook -ne $null) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
    if ($excel -ne $null) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}