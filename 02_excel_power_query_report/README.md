# Excel + Power Query 自动化经营报表

面向数据专员和报表分析岗位的端到端项目。项目把 4 类原始数据清洗、合并、计算和汇总为经营报表，包含数据质量检查、KPI 看板、异常清单和可直接刷新的 Power Query M 查询。

## 项目目标

- 原始数据：销售明细、商品、退货、月度区域目标。
- 数据清洗：日期、数值类型、主键、商品关联、负数量、折扣边界和异常标记。
- 派生指标：销售额、成本、毛利、利润率、退货率、目标完成率和环比。
- 报表输出：经营看板、数据准备、Power Query 说明、字段口径和数据异常。
- Power Query：6 条实际可执行的 M 查询。
- 自动验证：Python 数据校验、Excel 工作簿结构测试和 Power Query 实际刷新测试。

## 运行

```powershell
$env:PYTHON_EXE = "C:\path\to\python.exe"
$env:NODE_EXE = "C:\path\to\node.exe"
.\run.ps1
```

## 查询清单

- `qry_fact_sales`：清洗销售表并关联商品，计算销售额、成本和毛利。
- `qry_monthly_kpi`：月度销售、目标、完成率和环比。
- `qry_category_kpi`：品类销售、毛利、毛利率和排名。
- `qry_region_kpi`：区域销售、目标完成率和客户数。
- `qry_return_summary`：退货原因、金额和退货率。
- `qry_quality_issues`：无效商品、异常数量和折扣越界。

## 验证结果

- 原始销售明细：41,518 行。
- 清洗后事实表：41,280 行。
- 质量提示：1,510 条。
- Power Query：6/6 条实际刷新通过。
- 工作簿：包含经营看板、数据透视表、原始表、事实表、字段口径、异常清单和 3 个图表。
- 单元测试：4/4 通过。

## 主要交付物

- `output/自动化经营报表-含PowerQuery.xlsx`
- `output/经营看板预览.png`
- `powerquery/queries/*.pq`
- `output/data_validation_report.json`
- `output/powerquery_embed_report.json`
- `output/powerquery_refresh_report.json`