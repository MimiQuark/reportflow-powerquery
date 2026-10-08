$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$SourceWorkbook = Join-Path $ProjectRoot "output\自动化经营报表.xlsx"
$excel = $null
$workbook = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($SourceWorkbook, $false, $false)
    $sheet = $null
    foreach ($existing in $workbook.Worksheets) { if ($existing.Name -eq "版本记录") { $sheet = $existing; break } }
    if ($sheet -eq $null) { $sheet = $workbook.Worksheets.Add($workbook.Worksheets.Item(1)) }
    $sheet.Name = "版本记录"
    $sheet.Cells.Clear() | Out-Null
    $sheet.Range("A1:E1").Merge()
    $sheet.Range("A1").Value2 = "自动化经营报表版本记录"
    $sheet.Range("A1").Font.Name = "Microsoft YaHei"
    $sheet.Range("A1").Font.Size = 16
    $sheet.Range("A1").Font.Bold = $true
    $sheet.Range("A1").Interior.Color = 2039583
    $sheet.Range("A1").Font.Color = 16777215
    $sheet.Range("A3:E3").Value2 = @("版本", "日期", "变更内容", "作者", "状态")
    $headers = $sheet.Range("A3:E3")
    $headers.Font.Bold = $true
    $headers.Interior.Color = 5846530
    $headers.Font.Color = 16777215
    $sheet.Range("A4:E5").Value2 = @(
        @("v1.0.0", "2026-10-08", "初始版本：四类数据源、六条Power Query、数据透视表、经营看板、字段口径和质量异常表", "朱奕凯", "已发布"),
        @("v1.1.0", "待更新", "后续可补充外部数据库连接、自动调度和邮件通知", "朱奕凯", "规划中")
    )
    $sheet.Rows.Item(1).RowHeight = 30
    $sheet.Columns.Item("A:E").AutoFit() | Out-Null
    $sheet.Columns.Item("C").ColumnWidth = 70
    $workbook.Save()
    $workbook.Close($true)
    $excel.Quit()
    Write-Output "Version log updated: $SourceWorkbook"
}
finally {
    if ($workbook -ne $null) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
    if ($excel -ne $null) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}