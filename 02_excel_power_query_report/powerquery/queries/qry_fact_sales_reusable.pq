let
    SourceSales = fnGetSourceTable("raw_sales", "SalesFile"),
    SourceProducts = fnGetSourceTable("raw_products", "ProductsFile"),
    MinQuantity = Number.From(fnGetParameter("MinQuantity", 1)),
    MaxDiscountRate = Number.From(fnGetParameter("MaxDiscountRate", 0.5)),
    SalesTyped = Table.TransformColumnTypes(SourceSales, {
        {"OrderDate", type date}, {"LineNo", Int64.Type}, {"Quantity", Int64.Type},
        {"UnitPrice", type number}, {"DiscountRate", type number}
    }),
    ProductsTyped = Table.TransformColumnTypes(SourceProducts, {{"UnitCost", type number}}),
    ProductLookup = Table.SelectColumns(ProductsTyped, {"ProductID", "ProductName", "Category", "UnitCost"}),
    Merged = Table.NestedJoin(SalesTyped, {"ProductID"}, ProductLookup, {"ProductID"}, "ProductInfo", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Merged, "ProductInfo", {"ProductName", "Category", "UnitCost"}),
    AddedAmount = Table.AddColumn(Expanded, "SalesAmount", each [Quantity] * [UnitPrice] * (1 - [DiscountRate]), type number),
    AddedCost = Table.AddColumn(AddedAmount, "CostAmount", each [Quantity] * [UnitCost], type number),
    AddedProfit = Table.AddColumn(AddedCost, "GrossProfit", each [SalesAmount] - [CostAmount], type number),
    AddedMonth = Table.AddColumn(AddedProfit, "Month", each Date.ToText([OrderDate], "yyyy-MM"), type text),
    Cleaned = Table.SelectRows(AddedMonth, each
        [OrderID] <> null and [LineNo] <> null and [ProductID] <> null and [ProductID] <> "" and
        [Quantity] >= MinQuantity and [UnitPrice] >= 0 and [DiscountRate] >= 0 and [DiscountRate] <= MaxDiscountRate
    ),
    Final = Table.SelectColumns(Cleaned, {
        "OrderID", "LineNo", "OrderDate", "Month", "CustomerID", "ProductID", "ProductName",
        "Category", "Region", "Channel", "PaymentStatus", "Quantity", "UnitPrice",
        "DiscountRate", "SalesAmount", "CostAmount", "GrossProfit"
    })
in
    Final