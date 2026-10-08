let
    Version = Text.From(fnGetParameter("Version", "v1.0.0")),
    SourceMode = Text.From(fnGetParameter("SourceMode", "WorkbookTables")),
    ReportName = Text.From(fnGetParameter("ReportName", "Automated Operating Report")),
    RefreshTime = DateTime.LocalNow(),
    Result = #table(
        {"RefreshTime", "ReportName", "Version", "SourceMode"},
        {{RefreshTime, ReportName, Version, SourceMode}}
    )
in
    Result