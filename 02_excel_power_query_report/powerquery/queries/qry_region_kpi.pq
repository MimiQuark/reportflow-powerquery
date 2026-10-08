let
    FactSales = qry_fact_sales,
    SourceTargets = Excel.CurrentWorkbook(){[Name="raw_targets"]}[Content],
    TargetsTyped = Table.TransformColumnTypes(SourceTargets, {{"SalesTarget", type number}}),
    RegionActual = Table.Group(FactSales, {"Region"}, {
        {"SalesAmount", each List.Sum([SalesAmount]), type number},
        {"GrossProfit", each List.Sum([GrossProfit]), type number},
        {"OrderCount", each List.Count(List.Distinct([OrderID])), Int64.Type},
        {"CustomerCount", each List.Count(List.Distinct([CustomerID])), Int64.Type}
    }),
    RegionTarget = Table.Group(TargetsTyped, {"Region"}, {{"SalesTarget", each List.Sum([SalesTarget]), type number}}),
    Joined = Table.NestedJoin(RegionActual, {"Region"}, RegionTarget, {"Region"}, "Targets", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "Targets", {"SalesTarget"}),
    AddedCompletion = Table.AddColumn(Expanded, "SalesCompletionRate", each if [SalesTarget] = 0 then null else [SalesAmount] / [SalesTarget], type number),
    Sorted = Table.Sort(AddedCompletion, {{"SalesAmount", Order.Descending}})
in
    Sorted