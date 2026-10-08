let
    Fn = (tableName as text, fileParameter as text) as table =>
        let
            SourceMode = Text.Lower(Text.From(fnGetParameter("SourceMode", "WorkbookTables"))),
            FileName = Text.From(fnGetParameter(fileParameter, tableName & ".csv")),
            FolderPath = Text.From(fnGetParameter("SourceFolder", "")),
            WorkbookTable = Excel.CurrentWorkbook(){[Name=tableName]}[Content],
            FolderTable =
                let
                    Files = Folder.Files(FolderPath),
                    Matched = Files{[Name = FileName]}[Content],
                    Csv = Csv.Document(Matched, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
                    Promoted = Table.PromoteHeaders(Csv, [PromoteAllScalars = true])
                in
                    Promoted,
            Result = if SourceMode = "folder" then FolderTable else WorkbookTable
        in
            Result
in
    Fn