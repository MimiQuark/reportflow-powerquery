# 字段与指标口径

| 对象 | 字段/指标 | 口径 |
|---|---|---|
| raw_sales | OrderID + LineNo | 订单行唯一主键 |
| raw_sales | DiscountRate | 0 至 0.5 的小数折扣率 |
| raw_returns | ReturnAmount | 退货记录金额 |
| raw_targets | SalesTarget | 月份 x 区域销售目标 |
| fact_sales | SalesAmount | Quantity * UnitPrice * (1 - DiscountRate) |
| fact_sales | CostAmount | Quantity * UnitCost |
| fact_sales | GrossProfit | SalesAmount - CostAmount |
| monthly_kpi | SalesCompletionRate | SalesAmount / SalesTarget |
| monthly_kpi | MoMRate | 本月销售额 / 上月销售额 - 1 |
| return_summary | ReturnAmountRate | 退货金额 / 总销售额 |
| dashboard | 利润率 | 总毛利 / 总销售额 |
| dashboard | 退货金额率 | 总退货金额 / 总销售额 |