from __future__ import annotations

import argparse
import csv
import random
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

REGIONS = ["华东", "华南", "华北", "华中", "西南", "西北", "东北"]
REGION_WEIGHTS = [30, 24, 15, 12, 10, 5, 4]
CHANNELS = ["直营网店", "平台电商", "线下门店", "企业采购"]
CHANNEL_WEIGHTS = [34, 27, 24, 15]
CATEGORIES = ["家用电器", "数码配件", "家居用品", "办公用品", "服饰鞋包", "食品饮料", "美妆个护", "运动户外"]
PAYMENT_STATUS = ["已支付", "已支付", "已支付", "退款", "取消"]
RETURN_REASONS = ["七天无理由", "尺寸不符", "质量原因", "物流破损", "重复购买"]
MONTH_WEIGHTS = {1: 0.92, 2: 0.72, 3: 0.94, 4: 0.98, 5: 1.04, 6: 1.10, 7: 0.97, 8: 1.00, 9: 1.08, 10: 1.12, 11: 1.35, 12: 1.30}


def weighted_choice(rng, values, weights):
    return rng.choices(values, weights=weights, k=1)[0]


def write_csv(path, rows, fieldnames=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    if not rows:
        raise ValueError(f"No rows for {path}")
    fieldnames = fieldnames or list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def generate_products(rng, count=120):
    rows = []
    for idx in range(1, count + 1):
        category = CATEGORIES[(idx - 1) % len(CATEGORIES)]
        price = round(rng.uniform(29, 2999), 2)
        cost = round(price * rng.uniform(0.52, 0.78), 2)
        rows.append({
            "ProductID": f"P{idx:04d}",
            "ProductName": f"{category}-{idx:04d}",
            "Category": category,
            "UnitCost": f"{cost:.2f}",
        })
    return rows


def pick_date(rng):
    start = date(2023, 1, 1)
    while True:
        candidate = start + timedelta(days=rng.randrange(1096))
        weight = MONTH_WEIGHTS[candidate.month]
        if candidate.weekday() >= 5:
            weight *= 1.12
        if rng.random() < min(1.0, weight / 1.42):
            return candidate


def generate(rng, order_count=24000):
    products = generate_products(rng)
    sales_rows = []
    return_rows = []
    targets = []
    for month in range(1, 37):
        year = 2022 + (month - 1) // 12 + 1
        month_num = (month - 1) % 12 + 1
        month_text = f"{year:04d}-{month_num:02d}"
        for region in REGIONS:
            region_factor = {"华东": 1.22, "华南": 1.10, "华北": 1.0, "华中": 0.90, "西南": 0.86, "西北": 0.68, "东北": 0.74}[region]
            base_target = 900000 * region_factor * MONTH_WEIGHTS[month_num]
            targets.append({
                "Month": month_text,
                "Region": region,
                "SalesTarget": f"{base_target:.2f}",
                "ProfitTarget": f"{base_target * 0.24:.2f}",
            })

    for order_idx in range(1, order_count + 1):
        order_id = f"SO{order_idx:08d}"
        customer_id = f"C{rng.randint(1, 6500):06d}"
        order_date = pick_date(rng)
        region = weighted_choice(rng, REGIONS, REGION_WEIGHTS)
        channel = weighted_choice(rng, CHANNELS, CHANNEL_WEIGHTS)
        status = weighted_choice(rng, PAYMENT_STATUS, [70, 22, 8, 6, 4])
        line_count = rng.choices([1, 2, 3, 4], weights=[52, 28, 14, 6], k=1)[0]
        for line_no in range(1, line_count + 1):
            product = rng.choice(products)
            quantity = rng.choices([1, 2, 3, 4, 5, 6], weights=[45, 25, 14, 8, 5, 3], k=1)[0]
            discount = rng.choices([0, 0.05, 0.10, 0.15, 0.20, 0.25], weights=[54, 17, 14, 8, 5, 2], k=1)[0]
            unit_price = round(float(product["UnitCost"]) / rng.uniform(0.58, 0.74), 2)
            if rng.random() < 0.003:
                quantity = -quantity
            if rng.random() < 0.002:
                discount = 0.65
            sales_rows.append({
                "OrderID": order_id,
                "LineNo": line_no,
                "OrderDate": order_date.isoformat(),
                "CustomerID": customer_id,
                "ProductID": "" if rng.random() < 0.0007 else product["ProductID"],
                "Region": region,
                "Channel": channel,
                "Quantity": quantity,
                "UnitPrice": f"{unit_price:.2f}",
                "DiscountRate": f"{discount:.2f}",
                "PaymentStatus": status,
            })
        if rng.random() < 0.055:
            return_rows.append({
                "ReturnID": f"RT{len(return_rows)+1:07d}",
                "OrderID": order_id,
                "ReturnDate": (order_date + timedelta(days=rng.randint(2, 28))).isoformat(),
                "ReturnAmount": f"{rng.uniform(50, 2800):.2f}",
                "Reason": rng.choice(RETURN_REASONS),
            })
    return sales_rows, products, return_rows, targets


def parse_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_processed(sales_rows, products, return_rows):
    product_map = {row["ProductID"]: row for row in products}
    returns_by_order = defaultdict(float)
    for row in return_rows:
        returns_by_order[row["OrderID"]] += parse_float(row["ReturnAmount"])
    fact_rows = []
    issues = []
    seen_keys = set()
    for row in sales_rows:
        issues_before = len(issues)
        order_id, line_no = row["OrderID"], int(row["LineNo"])
        if (order_id, line_no) in seen_keys:
            issues.append({"OrderID": order_id, "LineNo": line_no, "IssueType": "重复订单行", "Severity": "高", "Detail": "订单行主键重复"})
        seen_keys.add((order_id, line_no))
        product = product_map.get(row["ProductID"])
        if not product:
            issues.append({"OrderID": order_id, "LineNo": line_no, "IssueType": "无效商品编号", "Severity": "高", "Detail": row["ProductID"]})
        quantity = int(row["Quantity"])
        if quantity <= 0:
            issues.append({"OrderID": order_id, "LineNo": line_no, "IssueType": "异常数量", "Severity": "高", "Detail": str(quantity)})
        discount = parse_float(row["DiscountRate"])
        if not 0 <= discount <= 0.5:
            issues.append({"OrderID": order_id, "LineNo": line_no, "IssueType": "折扣越界", "Severity": "中", "Detail": str(discount)})
        if not product or quantity <= 0 or not 0 <= discount <= 0.5:
            continue
        unit_price = parse_float(row["UnitPrice"])
        unit_cost = parse_float(product["UnitCost"])
        amount = round(quantity * unit_price * (1 - discount), 2)
        cost = round(quantity * unit_cost, 2)
        fact_rows.append({
            "OrderID": order_id,
            "LineNo": line_no,
            "OrderDate": row["OrderDate"],
            "Month": row["OrderDate"][:7],
            "CustomerID": row["CustomerID"],
            "ProductID": product["ProductID"],
            "ProductName": product["ProductName"],
            "Category": product["Category"],
            "Region": row["Region"],
            "Channel": row["Channel"],
            "PaymentStatus": row["PaymentStatus"],
            "Quantity": quantity,
            "UnitPrice": f"{unit_price:.2f}",
            "DiscountRate": f"{discount:.2f}",
            "SalesAmount": f"{amount:.2f}",
            "CostAmount": f"{cost:.2f}",
            "GrossProfit": f"{amount-cost:.2f}",
        })
    for row in return_rows:
        issues.append({"OrderID": row["OrderID"], "LineNo": "", "IssueType": "退货记录", "Severity": "低", "Detail": row["Reason"]})
    return fact_rows, issues


def main():
    parser = argparse.ArgumentParser(description="Generate and prepare the automated reporting dataset.")
    parser.add_argument("--seed", type=int, default=20261008)
    parser.add_argument("--orders", type=int, default=24000)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    sales, products, returns, targets = generate(rng, args.orders)
    fact, issues = build_processed(sales, products, returns)
    write_csv(RAW_DIR / "raw_sales.csv", sales)
    write_csv(RAW_DIR / "raw_products.csv", products)
    write_csv(RAW_DIR / "raw_returns.csv", returns)
    write_csv(RAW_DIR / "raw_targets.csv", targets)
    write_csv(PROCESSED_DIR / "fact_sales.csv", fact)
    write_csv(PROCESSED_DIR / "data_quality_issues.csv", issues)
    print({"sales_lines": len(sales), "clean_fact_lines": len(fact), "products": len(products), "returns": len(returns), "targets": len(targets), "issues": len(issues)})


if __name__ == "__main__":
    main()