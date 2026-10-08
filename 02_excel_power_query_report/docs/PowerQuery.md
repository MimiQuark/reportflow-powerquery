# Power Query 处理设计

## 依赖关系

```text
raw_sales + raw_products -> qry_fact_sales -> fact_sales
fact_sales + raw_targets -> qry_monthly_kpi
fact_sales + raw_targets -> qry_region_kpi
fact_sales -> qry_category_kpi
raw_returns + fact_sales -> qry_return_summary
raw_sales + raw_products -> qry_quality_issues
```

## 清洗规则

- `OrderID + LineNo` 必须存在。
- `ProductID` 必须能在商品表中匹配。
- `Quantity` 必须大于 0。
- `UnitPrice` 必须大于等于 0。
- `DiscountRate` 必须在 0 到 0.5 之间。
- 日期转换为 Date 类型，金额转换为 Number 类型。
- 金额使用 `Quantity * UnitPrice * (1 - DiscountRate)` 计算。

工作簿中的查询引用 `Excel.CurrentWorkbook()` 内的表格。打开工作簿后点击“数据 -> 全部刷新”即可重新执行。