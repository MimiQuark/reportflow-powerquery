import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const rawDir = path.join(root, "data", "raw");
const processedDir = path.join(root, "data", "processed");
const outputDir = path.join(root, "output");
const font = "Microsoft YaHei";
const navy = "#1F4E79";
const blue = "#2F80ED";
const lightBlue = "#EAF2F9";
const green = "#2E7D32";
const red = "#C62828";
const gray = "#64748B";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function importCsv(workbook, filePath, sheetName, tableName, numericColumns = [], dateColumns = []) {
  const text = await fs.readFile(filePath, "utf8");
  const { sheet, range } = await workbook.fromCSV(text, { sheetName });
  const matrix = range.values;
  if (!matrix.length) throw new Error(`${filePath} is empty`);
  const headers = matrix[0].map((value, index) => index === 0 ? String(value ?? "").replace(/^\uFEFF/, "") : value);
  matrix[0] = headers;
  const numericIndexes = new Set(numericColumns.map((name) => headers.indexOf(name)).filter((i) => i >= 0));
  const dateIndexes = new Set(dateColumns.map((name) => headers.indexOf(name)).filter((i) => i >= 0));
  for (let r = 1; r < matrix.length; r += 1) {
    for (const c of numericIndexes) matrix[r][c] = number(matrix[r][c]);
    for (const c of dateIndexes) matrix[r][c] = matrix[r][c] ? new Date(`${matrix[r][c]}T00:00:00`) : null;
  }
  range.values = matrix;
  const table = sheet.tables.add(range, true, tableName);
  sheet.getRange(`A1:${String.fromCharCode(64 + headers.length)}1`).format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
  };
  sheet.freezePanes.freezeRows(1);
  return { sheet, table, headers, rows: matrix.slice(1), range };
}

function addKpiCard(sheet, cell, label, formula, numberFormat, accent = navy) {
  sheet.getRange(cell).values = [[label]];
  const start = cell.match(/[A-Z]+/)[0];
  const col = start.charCodeAt(0) - 64;
  const row = Number(cell.match(/\d+/)[0]);
  const nextCol = String.fromCharCode(64 + col + 1);
  sheet.getRange(`${start}${row}:${nextCol}${row}`).merge();
  sheet.getRange(cell).format = { fill: lightBlue, font: { name: font, size: 10, bold: true, color: accent }, alignment: { horizontal: "left", vertical: "center" } };
  sheet.getRange(`${start}${row + 1}:${nextCol}${row + 1}`).merge();
  sheet.getRange(`${start}${row + 1}`).formulas = [[formula]];
  sheet.getRange(`${start}${row + 1}`).format = { font: { name: font, size: 18, bold: true, color: accent }, numberFormat, alignment: { horizontal: "left", vertical: "center" } };
}

function summarize(factRows) {
  const monthly = new Map();
  const category = new Map();
  const region = new Map();
  for (const row of factRows) {
    const month = row[3];
    const categoryName = row[7];
    const regionName = row[8];
    const sales = number(row[14]);
    const cost = number(row[15]);
    const profit = number(row[16]);
    monthly.set(month, { sales: (monthly.get(month)?.sales || 0) + sales, cost: (monthly.get(month)?.cost || 0) + cost, profit: (monthly.get(month)?.profit || 0) + profit, orders: new Set(monthly.get(month)?.orders || []) });
    monthly.get(month).orders.add(row[0]);
    category.set(categoryName, { sales: (category.get(categoryName)?.sales || 0) + sales, profit: (category.get(categoryName)?.profit || 0) + profit });
    region.set(regionName, { sales: (region.get(regionName)?.sales || 0) + sales, profit: (region.get(regionName)?.profit || 0) + profit });
  }
  for (const value of monthly.values()) value.orders = value.orders.size;
  return { monthly, category, region };
}

const workbook = Workbook.create();
const rawSales = await importCsv(workbook, path.join(rawDir, "raw_sales.csv"), "raw_sales", "raw_sales", ["LineNo", "Quantity", "UnitPrice", "DiscountRate"], ["OrderDate"]);
const rawProducts = await importCsv(workbook, path.join(rawDir, "raw_products.csv"), "raw_products", "raw_products", ["UnitCost"]);
const rawReturns = await importCsv(workbook, path.join(rawDir, "raw_returns.csv"), "raw_returns", "raw_returns", ["ReturnAmount"], ["ReturnDate"]);
const rawTargets = await importCsv(workbook, path.join(rawDir, "raw_targets.csv"), "raw_targets", "raw_targets", ["SalesTarget", "ProfitTarget"]);
const factSales = await importCsv(workbook, path.join(processedDir, "fact_sales.csv"), "fact_sales", "fact_sales", ["LineNo", "Quantity", "UnitPrice", "DiscountRate", "SalesAmount", "CostAmount", "GrossProfit"]);
const qualityIssues = await importCsv(workbook, path.join(processedDir, "data_quality_issues.csv"), "data_quality_issues", "data_quality_issues");

const summary = summarize(factSales.rows);
const targetByMonth = new Map();
for (const row of rawTargets.rows) targetByMonth.set(row[0], (targetByMonth.get(row[0]) || 0) + number(row[2]));
const targetByRegion = new Map();
for (const row of rawTargets.rows) targetByRegion.set(row[1], (targetByRegion.get(row[1]) || 0) + number(row[2]));

const calc = workbook.worksheets.add("数据准备");
calc.getRange("A1:H1").merge();
calc.getRange("A1").values = [["自动化经营报表 - 数据准备"]]; 
calc.getRange("A1").format = { fill: navy, font: { name: font, size: 16, bold: true, color: "#FFFFFF" }, alignment: { horizontal: "left", vertical: "center" } };
calc.getRange("A3:H3").values = [["月份", "销售额", "成本", "毛利", "订单数", "销售目标", "完成率", "环比"]];
const monthKeys = [...summary.monthly.keys()].sort();
const monthMatrix = monthKeys.map((month, idx) => {
  const m = summary.monthly.get(month);
  const previous = idx > 0 ? summary.monthly.get(monthKeys[idx - 1]).sales : null;
  return [month, m.sales, m.cost, m.profit, m.orders, targetByMonth.get(month) || 0, (targetByMonth.get(month) || 0) ? m.sales / targetByMonth.get(month) : 0, previous ? m.sales / previous - 1 : null];
});
calc.getRange(`A4:H${3 + monthMatrix.length}`).values = monthMatrix;
calc.getRange(`A4:A${3 + monthMatrix.length}`).format.numberFormat = "@";
calc.getRange(`B4:D${3 + monthMatrix.length}`).format.numberFormat = "¥#,##0";
calc.getRange(`F4:F${3 + monthMatrix.length}`).format.numberFormat = "¥#,##0";
calc.getRange(`G4:H${3 + monthMatrix.length}`).format.numberFormat = "0.0%";

const categoryKeys = [...summary.category.keys()].sort((a, b) => summary.category.get(b).sales - summary.category.get(a).sales);
const categoryStart = 5 + monthMatrix.length;
calc.getRange(`A${categoryStart}:C${categoryStart}`).values = [["品类", "销售额", "毛利"]];
calc.getRange(`A${categoryStart + 1}:C${categoryStart + categoryKeys.length}`).values = categoryKeys.map((key) => [key, summary.category.get(key).sales, summary.category.get(key).profit]);
const regionKeys = [...summary.region.keys()].sort((a, b) => summary.region.get(b).sales - summary.region.get(a).sales);
const regionStart = categoryStart + categoryKeys.length + 3;
calc.getRange(`A${regionStart}:E${regionStart}`).values = [["区域", "销售额", "销售目标", "完成率", "毛利"]];
calc.getRange(`A${regionStart + 1}:E${regionStart + regionKeys.length}`).values = regionKeys.map((key) => {
  const sales = summary.region.get(key).sales;
  const target = targetByRegion.get(key) || 0;
  return [key, sales, target, target ? sales / target : 0, summary.region.get(key).profit];
});
calc.getRange(`A${categoryStart}:C${categoryStart}`).format = { fill: blue, font: { name: font, bold: true, color: "#FFFFFF" } };
calc.getRange(`A${regionStart}:E${regionStart}`).format = { fill: blue, font: { name: font, bold: true, color: "#FFFFFF" } };
calc.getRange(`B${categoryStart + 1}:C${categoryStart + categoryKeys.length}`).format.numberFormat = "¥#,##0";
calc.getRange(`B${regionStart + 1}:E${regionStart + regionKeys.length}`).format.numberFormat = "¥#,##0";
calc.getRange(`D${regionStart + 1}:D${regionStart + regionKeys.length}`).format.numberFormat = "0.0%";
calc.getRange("A:H").format.font = { name: font, size: 10 };


const dashboard = workbook.worksheets.add("经营看板");
dashboard.getRange("A1:L1").merge();
dashboard.getRange("A1").values = [["自动化经营报表 - 经营看板"]];
dashboard.getRange("A1").format = { fill: navy, font: { name: font, size: 20, bold: true, color: "#FFFFFF" }, alignment: { horizontal: "left", vertical: "center" } };
dashboard.getRange("A2:L2").merge();
dashboard.getRange("A2").values = [["数据源：raw_sales / raw_products / raw_returns / raw_targets  |  刷新方式：数据 → 全部刷新"]];
dashboard.getRange("A2").format = { fill: lightBlue, font: { name: font, size: 10, color: gray } };
addKpiCard(dashboard, "A4", "销售额", "=SUM(fact_sales[SalesAmount])", "¥#,##0", navy);
addKpiCard(dashboard, "D4", "成本", "=SUM(fact_sales[CostAmount])", "¥#,##0", gray);
addKpiCard(dashboard, "G4", "毛利", "=SUM(fact_sales[GrossProfit])", "¥#,##0", green);
addKpiCard(dashboard, "J4", "退货金额", "=SUM(raw_returns[ReturnAmount])", "¥#,##0", red);
addKpiCard(dashboard, "A7", "利润率", "=SUM(fact_sales[GrossProfit])/SUM(fact_sales[SalesAmount])", "0.0%", green);
addKpiCard(dashboard, "D7", "退货金额率", "=SUM(raw_returns[ReturnAmount])/SUM(fact_sales[SalesAmount])", "0.0%", red);
addKpiCard(dashboard, "G7", "销售目标完成率", "=SUM(fact_sales[SalesAmount])/SUM(raw_targets[SalesTarget])", "0.0%", blue);
addKpiCard(dashboard, "J7", "数据质量提示数", "=ROWS(data_quality_issues[IssueType])", "#,##0", navy);

const trendChart = dashboard.charts.add("line", { from: { row: 9, col: 0 }, extent: { widthPx: 720, heightPx: 300 } });
trendChart.title = "月度销售额趋势";
trendChart.hasLegend = false;
trendChart.categories = monthKeys;
const trendSeries = trendChart.series.add("销售额");
trendSeries.values = monthKeys.map((m) => summary.monthly.get(m).sales);
trendSeries.categories = trendChart.categories;
const categoryChart = dashboard.charts.add("bar", { from: { row: 9, col: 7 }, extent: { widthPx: 500, heightPx: 300 } });
categoryChart.title = "品类销售额";
categoryChart.hasLegend = false;
categoryChart.categories = categoryKeys;
const categorySeries = categoryChart.series.add("销售额");
categorySeries.values = categoryKeys.map((k) => summary.category.get(k).sales);
categorySeries.categories = categoryChart.categories;
const regionChart = dashboard.charts.add("bar", { from: { row: 24, col: 0 }, extent: { widthPx: 620, heightPx: 300 } });
regionChart.title = "区域目标完成率";
regionChart.hasLegend = false;
regionChart.categories = regionKeys;
const regionSeries = regionChart.series.add("完成率");
regionSeries.values = regionKeys.map((k) => targetByRegion.get(k) ? summary.region.get(k).sales / targetByRegion.get(k) : 0);
regionSeries.categories = regionChart.categories;

const querySheet = workbook.worksheets.add("PowerQuery说明");
querySheet.getRange("A1:F1").merge();
querySheet.getRange("A1").values = [["Power Query 自动化处理说明"]];
querySheet.getRange("A1").format = { fill: navy, font: { name: font, size: 16, bold: true, color: "#FFFFFF" } };
querySheet.getRange("A3:F3").values = [["查询", "输入", "输出", "用途", "刷新方式", "文件"]];
const queryRows = [
  ["qry_fact_sales", "raw_sales + raw_products", "fact_sales", "清洗销售明细并计算金额、成本和毛利", "数据 → 全部刷新", "qry_fact_sales.pq"],
  ["qry_monthly_kpi", "fact_sales + raw_targets", "monthly_kpi", "月度销售、毛利、目标和环比", "数据 → 全部刷新", "qry_monthly_kpi.pq"],
  ["qry_category_kpi", "fact_sales", "category_kpi", "品类销售与利润分析", "数据 → 全部刷新", "qry_category_kpi.pq"],
  ["qry_region_kpi", "fact_sales + raw_targets", "region_kpi", "区域销售与目标完成率", "数据 → 全部刷新", "qry_region_kpi.pq"],
  ["qry_return_summary", "raw_returns + fact_sales", "return_summary", "退货金额、退货率及原因分析", "数据 → 全部刷新", "qry_return_summary.pq"],
  ["qry_quality_issues", "raw_sales + raw_products", "quality_issues", "异常记录识别与原因标记", "数据 → 全部刷新", "qry_quality_issues.pq"],
];
querySheet.getRange(`A4:F${3 + queryRows.length}`).values = queryRows;
querySheet.getRange("A3:F3").format = { fill: blue, font: { name: font, bold: true, color: "#FFFFFF" } };
querySheet.getRange(`A1:F${3 + queryRows.length}`).format.font = { name: font, size: 10 };

const dictionary = workbook.worksheets.add("字段口径");
dictionary.getRange("A1:E1").merge();
dictionary.getRange("A1").values = [["字段与指标口径"]];
dictionary.getRange("A1").format = { fill: navy, font: { name: font, size: 16, bold: true, color: "#FFFFFF" } };
dictionary.getRange("A3:E3").values = [["对象", "字段/指标", "类型", "口径", "来源"]];
const dictionaryRows = [
  ["raw_sales", "OrderID + LineNo", "主键", "订单行唯一标识", "源系统"],
  ["fact_sales", "SalesAmount", "金额", "Quantity × UnitPrice × (1 - DiscountRate)", "Power Query"],
  ["fact_sales", "CostAmount", "金额", "Quantity × UnitCost", "Power Query"],
  ["fact_sales", "GrossProfit", "金额", "SalesAmount - CostAmount", "Power Query"],
  ["raw_returns", "ReturnAmount", "金额", "退货记录金额", "源系统"],
  ["Dashboard", "退货金额率", "比率", "ReturnAmount 合计 / SalesAmount 合计", "看板指标"],
  ["Dashboard", "目标完成率", "比率", "实际销售额 / 销售目标", "看板指标"],
  ["raw_targets", "SalesTarget", "金额", "月份 × 区域销售目标", "目标系统"],
];
dictionary.getRange(`A4:E${3 + dictionaryRows.length}`).values = dictionaryRows;
dictionary.getRange("A3:E3").format = { fill: blue, font: { name: font, bold: true, color: "#FFFFFF" } };
dictionary.getRange(`A1:E${3 + dictionaryRows.length}`).format.font = { name: font, size: 10 };

const dq = workbook.worksheets.add("数据异常");
dq.getRange("A1:G1").merge();
dq.getRange("A1").values = [["数据质量异常清单"]];
dq.getRange("A1").format = { fill: navy, font: { name: font, size: 16, bold: true, color: "#FFFFFF" } };
dq.getRange("A3:G3").values = [["问题总数", "高", "中", "低", "涉及订单数", "处理建议", "刷新说明"]];
const issues = qualityIssues.rows;
const issueCounts = issues.reduce((acc, row) => { const severity = row[3] || "低"; acc[severity] = (acc[severity] || 0) + 1; return acc; }, {});
const orderCount = new Set(issues.map((row) => row[0])).size;
dq.getRange("A4:G4").values = [[issues.length, issueCounts["高"] || 0, issueCounts["中"] || 0, issueCounts["低"] || 0, orderCount, "先处理高严重度，再核对中低等级", "数据 → 全部刷新"]];
dq.getRange("A3:G3").format = { fill: blue, font: { name: font, bold: true, color: "#FFFFFF" } };
dq.getRange("A6:G6").values = [["订单编号", "行号", "问题类型", "严重等级", "问题详情", "处理状态", "负责人"]];
dq.getRange(`A7:G${Math.min(6 + issues.length, 306)}`).values = issues.slice(0, 300).map((row) => [...row, "待处理", ""]);
dq.getRange("A6:G6").format = { fill: "#C62828", font: { name: font, bold: true, color: "#FFFFFF" } };

const pivotSheet = workbook.worksheets.add("数据透视汇总");
const regionCategoryPivot = pivotSheet.pivotTables.add("RegionCategorySales", factSales.range, pivotSheet.getRange("A1"));
regionCategoryPivot.rowHierarchies.add(regionCategoryPivot.hierarchies.getItem("Region"));
regionCategoryPivot.columnHierarchies.add(regionCategoryPivot.hierarchies.getItem("Category"));
const pivotSales = regionCategoryPivot.dataHierarchies.add(regionCategoryPivot.hierarchies.getItem("SalesAmount"));
pivotSales.summarizeBy = "Sum";
pivotSales.name = "销售额";
pivotSales.numberFormat = "¥#,##0";
regionCategoryPivot.layout.layoutType = "Tabular";
const cover = workbook.worksheets.add("项目说明");
cover.getRange("A1:H1").merge();
cover.getRange("A1").values = [["Excel + Power Query 自动化经营报表"]];
cover.getRange("A1").format = { fill: navy, font: { name: font, size: 20, bold: true, color: "#FFFFFF" } };
cover.getRange("A3:B11").values = [
  ["项目目标", "将多来源原始数据自动清洗、合并、计算和汇总为经营看板"],
  ["主要输入", "raw_sales、raw_products、raw_returns、raw_targets"],
  ["主要输出", "fact_sales、monthly_kpi、category_kpi、region_kpi、return_summary、quality_issues"],
  ["刷新方式", "数据 → 全部刷新"],
  ["质量检查", "主键、商品编号、数量、折扣、退货关联和金额公式"],
  ["业务指标", "销售额、成本、毛利、利润率、退货率、目标完成率、环比"],
  ["数据范围", "2023-01 至 2025-12"],
  ["处理方式", "Power Query 清洗、合并、异常标记和派生列"],
  ["交付文件", "本工作簿、Power Query M 查询、字段口径和验证报告"],
];
cover.getRange("A3:A11").format = { fill: lightBlue, font: { name: font, bold: true, color: navy } };
cover.getRange("A1:B11").format.font.name = font;

const freshness = new Date().toISOString().slice(0, 10);
cover.getRange("B11").values = [[`生成日期：${freshness}`]];
workbook.recalculate();
const preview = await workbook.render({ sheetName: "经营看板", format: "png", scale: 1 });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "经营看板预览.png"), new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "自动化经营报表.xlsx"));
console.log(JSON.stringify({ workbook: path.join(outputDir, "自动化经营报表.xlsx"), sheets: workbook.worksheets.names }, null, 2));