let
    FactSales = qry_fact_sales,
    Grouped = Table.Group(FactSales, {"Category"}, {
        {"SalesAmount", each List.Sum([SalesAmount]), type number},
        {"GrossProfit", each List.Sum([GrossProfit]), type number},
        {"Quantity", each List.Sum([Quantity]), type number},
        {"OrderCount", each List.Count(List.Distinct([OrderID])), Int64.Type}
    }),
    AddedMargin = Table.AddColumn(Grouped, "GrossMargin", each if [SalesAmount] = 0 then null else [GrossProfit] / [SalesAmount], type number),
    Sorted = Table.Sort(AddedMargin, {{"SalesAmount", Order.Descending}}),
    Ranked = Table.AddIndexColumn(Sorted, "SalesRank", 1, 1, Int64.Type)
in
    Ranked