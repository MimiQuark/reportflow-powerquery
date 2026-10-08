let
    FactSales = qry_fact_sales,
    SourceReturns = Excel.CurrentWorkbook(){[Name="raw_returns"]}[Content],
    ReturnsTyped = Table.TransformColumnTypes(SourceReturns, {{"ReturnDate", type date}, {"ReturnAmount", type number}}),
    TotalSales = List.Sum(FactSales[SalesAmount]),
    ReturnSummary = Table.Group(ReturnsTyped, {"Reason"}, {
        {"ReturnAmount", each List.Sum([ReturnAmount]), type number},
        {"ReturnCount", each Table.RowCount(_), Int64.Type}
    }),
    AddedRate = Table.AddColumn(ReturnSummary, "ReturnAmountRate", each if TotalSales = 0 then null else [ReturnAmount] / TotalSales, type number),
    Sorted = Table.Sort(AddedRate, {{"ReturnAmount", Order.Descending}})
in
    Sorted