from __future__ import annotations

import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = BASE_DIR / "data" / "processed"
OUTPUT_DIR = BASE_DIR / "output"
REPORT_PATH = OUTPUT_DIR / "data_validation_report.json"


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def validate_data():
    facts = read_csv(PROCESSED_DIR / "fact_sales.csv")
    issues = read_csv(PROCESSED_DIR / "data_quality_issues.csv")
    raw_products = read_csv(BASE_DIR / "data" / "raw" / "raw_products.csv")
    product_ids = {row["ProductID"] for row in raw_products}
    keys = [(row["OrderID"], row["LineNo"]) for row in facts]
    checks = [
        {"name": "事实表行数", "actual": len(facts), "passed": len(facts) >= 40000},
        {"name": "订单行主键唯一", "actual": len(keys) - len(set(keys)), "passed": len(keys) == len(set(keys))},
        {"name": "无效商品行", "actual": sum(1 for row in facts if row["ProductID"] not in product_ids), "passed": all(row["ProductID"] in product_ids for row in facts)},
        {"name": "异常记录已识别", "actual": len(issues), "passed": len(issues) > 0},
        {"name": "销售额公式错误", "actual": sum(1 for row in facts if abs(float(row["SalesAmount"]) - round(float(row["Quantity"]) * float(row["UnitPrice"]) * (1 - float(row["DiscountRate"])), 2)) > 0.005), "passed": all(abs(float(row["SalesAmount"]) - round(float(row["Quantity"]) * float(row["UnitPrice"]) * (1 - float(row["DiscountRate"])), 2)) <= 0.005 for row in facts)},
        {"name": "毛利公式错误", "actual": sum(1 for row in facts if abs(float(row["GrossProfit"]) - round(float(row["SalesAmount"]) - float(row["CostAmount"]), 2)) > 0.005), "passed": all(abs(float(row["GrossProfit"]) - round(float(row["SalesAmount"]) - float(row["CostAmount"]), 2)) <= 0.005 for row in facts)},
    ]
    report = {"passed": all(item["passed"] for item in checks), "checks": checks}
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    report = validate_data()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["passed"]:
        raise SystemExit(1)