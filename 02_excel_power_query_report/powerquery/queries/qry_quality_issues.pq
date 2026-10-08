let
    SourceSales = Excel.CurrentWorkbook(){[Name="raw_sales"]}[Content],
    SourceProducts = Excel.CurrentWorkbook(){[Name="raw_products"]}[Content],
    SalesTyped = Table.TransformColumnTypes(SourceSales, {
        {"LineNo", Int64.Type}, {"Quantity", Int64.Type},
        {"UnitPrice", type number}, {"DiscountRate", type number}
    }),
    Products = Table.SelectColumns(SourceProducts, {"ProductID"}),
    WithProduct = Table.NestedJoin(SalesTyped, {"ProductID"}, Products, {"ProductID"}, "ProductInfo", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(WithProduct, "ProductInfo", {"ProductID"}, {"MatchedProductID"}),
    AddIssue = Table.AddColumn(Expanded, "IssueType", each
        if [ProductID] = null or [ProductID] = "" or [MatchedProductID] = null then "无效商品编号"
        else if [Quantity] <= 0 then "异常数量"
        else if [DiscountRate] < 0 or [DiscountRate] > 0.5 then "折扣越界"
        else null,
        type text
    ),
    Issues = Table.SelectRows(AddIssue, each [IssueType] <> null),
    Final = Table.SelectColumns(Issues, {"OrderID", "LineNo", "IssueType", "Quantity", "DiscountRate", "ProductID"})
in
    Final