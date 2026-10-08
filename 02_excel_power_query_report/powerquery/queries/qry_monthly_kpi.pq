let
    FactSales = qry_fact_sales,
    SourceTargets = Excel.CurrentWorkbook(){[Name="raw_targets"]}[Content],
    TargetsTyped = Table.TransformColumnTypes(SourceTargets, {{"SalesTarget", type number}, {"ProfitTarget", type number}}),
    MonthlyActual = Table.Group(FactSales, {"Month"}, {
        {"SalesAmount", each List.Sum([SalesAmount]), type number},
        {"CostAmount", each List.Sum([CostAmount]), type number},
        {"GrossProfit", each List.Sum([GrossProfit]), type number},
        {"OrderCount", each List.Count(List.Distinct([OrderID])), Int64.Type}
    }),
    MonthlyTarget = Table.Group(TargetsTyped, {"Month"}, {
        {"SalesTarget", each List.Sum([SalesTarget]), type number},
        {"ProfitTarget", each List.Sum([ProfitTarget]), type number}
    }),
    Joined = Table.NestedJoin(MonthlyActual, {"Month"}, MonthlyTarget, {"Month"}, "Targets", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "Targets", {"SalesTarget", "ProfitTarget"}),
    AddedCompletion = Table.AddColumn(Expanded, "SalesCompletionRate", each if [SalesTarget] = 0 then null else [SalesAmount] / [SalesTarget], type number),
    Sorted = Table.Sort(AddedCompletion, {{"Month", Order.Ascending}}),
    AddedMoM = Table.AddColumn(Sorted, "MoMRate", each
        let currentIndex = List.PositionOf(Sorted[Month], [Month]) in
        if currentIndex <= 0 then null
        else [SalesAmount] / Sorted[SalesAmount]{currentIndex - 1} - 1,
        type number
    )
in
    AddedMoM