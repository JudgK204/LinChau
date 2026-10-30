
from flask import Blueprint, render_template, jsonify
from sqlalchemy import text
from app.models import db
from datetime import date, timedelta


dashboard_bp = Blueprint("dashboard", __name__)


# =========================================================
# DASHBOARD PAGE
# =========================================================

@dashboard_bp.route("/")
def dashboard():
    return render_template("dashboard.html")


# =========================================================
# DASHBOARD API
# =========================================================

@dashboard_bp.route("/api/dashboard")
def dashboard_api():

    today = date.today()
    tomorrow = today + timedelta(days=1)

    month_start = today.replace(day=1)

    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1)
    else:
        next_month_start = date(today.year, today.month + 1, 1)

    year_start = date(today.year, 1, 1)
    next_year_start = date(today.year + 1, 1, 1)

    seven_days_start = today - timedelta(days=6)

    # -----------------------------------------------------
    # 1. Đơn hôm nay
    # -----------------------------------------------------

    orders_today = db.session.execute(
        text("""
            SELECT COUNT(*)
            FROM orders
            WHERE created >= :today
              AND created < :tomorrow
              AND status <> N'Hủy'
        """),
        {
            "today": today,
            "tomorrow": tomorrow
        }
    ).scalar() or 0

    # -----------------------------------------------------
    # 2. Doanh thu ngày
    #
    # Đơn hợp lệ: tính total
    # Đơn hủy: chỉ tính deposit
    # Chờ xác nhận: không tính
    # -----------------------------------------------------

    daily_sales = db.session.execute(
        text("""
            SELECT COALESCE(
                SUM(
                    CASE
                        WHEN status = N'Hủy'
                            THEN COALESCE(deposit, 0)

                        WHEN status = N'Chờ xác nhận'
                            THEN 0

                        ELSE COALESCE(total, 0)
                    END
                ), 0
            )
            FROM orders
            WHERE created >= :start_date
              AND created < :end_date
        """),
        {
            "start_date": today,
            "end_date": tomorrow
        }
    ).scalar() or 0

    # -----------------------------------------------------
    # 3. Doanh thu tháng
    # -----------------------------------------------------

    monthly_sales = db.session.execute(
        text("""
            SELECT COALESCE(
                SUM(
                    CASE
                        WHEN status = N'Hủy'
                            THEN COALESCE(deposit, 0)

                        WHEN status = N'Chờ xác nhận'
                            THEN 0

                        ELSE COALESCE(total, 0)
                    END
                ), 0
            )
            FROM orders
            WHERE created >= :start_date
              AND created < :end_date
        """),
        {
            "start_date": month_start,
            "end_date": next_month_start
        }
    ).scalar() or 0

    # -----------------------------------------------------
    # 4. Doanh thu năm
    # -----------------------------------------------------

    yearly_sales = db.session.execute(
        text("""
            SELECT COALESCE(
                SUM(
                    CASE
                        WHEN status = N'Hủy'
                            THEN COALESCE(deposit, 0)

                        WHEN status = N'Chờ xác nhận'
                            THEN 0

                        ELSE COALESCE(total, 0)
                    END
                ), 0
            )
            FROM orders
            WHERE created >= :start_date
              AND created < :end_date
        """),
        {
            "start_date": year_start,
            "end_date": next_year_start
        }
    ).scalar() or 0

    # -----------------------------------------------------
    # 5. Còn phải thu
    # -----------------------------------------------------

    receivable = db.session.execute(
        text("""
            SELECT COALESCE(SUM(balance), 0)
            FROM orders
            WHERE status NOT IN (N'Hủy', N'Đã thanh toán')
        """)
    ).scalar() or 0

    # -----------------------------------------------------
    # 6. Nguyên liệu cần nhập
    # -----------------------------------------------------

    low_stock_count = db.session.execute(
        text("""
            SELECT COUNT(*)
            FROM inventory
            WHERE stock <= min_stock
        """)
    ).scalar() or 0

    # -----------------------------------------------------
    # 7. Đơn cần xử lý
    # -----------------------------------------------------

    priority_rows = db.session.execute(
        text("""
            SELECT TOP 6
                o.id,
                o.product,
                o.delivery_date,
                o.delivery_time,
                o.status,
                c.name AS customer_name
            FROM orders o
            LEFT JOIN customers c
                ON c.id = o.customer_id
            WHERE o.status NOT IN (N'Đã giao', N'Hủy')
            ORDER BY
                o.delivery_date ASC,
                o.delivery_time ASC
        """)
    ).mappings().all()

    priority_orders = []

    for row in priority_rows:
        priority_orders.append({
            "id": row["id"],
            "product": row["product"] or "",
            "delivery_date": (
                row["delivery_date"].isoformat()
                if row["delivery_date"]
                else ""
            ),
            "delivery_time": (
                str(row["delivery_time"])
                if row["delivery_time"]
                else ""
            ),
            "status": row["status"] or "",
            "customer_name": row["customer_name"] or "Khách lẻ"
        })

    # -----------------------------------------------------
    # 8. Cảnh báo kho
    # -----------------------------------------------------

    low_stock_rows = db.session.execute(
        text("""
            SELECT TOP 6
                id,
                name,
                unit,
                stock,
                min_stock
            FROM inventory
            WHERE stock <= min_stock
            ORDER BY stock ASC
        """)
    ).mappings().all()

    low_stock = []

    for row in low_stock_rows:
        low_stock.append({
            "id": row["id"],
            "name": row["name"] or "",
            "unit": row["unit"] or "",
            "stock": float(row["stock"] or 0),
            "min_stock": float(row["min_stock"] or 0)
        })

    # -----------------------------------------------------
    # 9. Doanh thu 7 ngày
    # Dùng cùng quy tắc với doanh thu ngày/tháng/năm
    # -----------------------------------------------------

    sales_rows = db.session.execute(
        text("""
            SELECT
                CAST(created AS DATE) AS sales_date,
                COALESCE(
                    SUM(
                        CASE
                            WHEN status = N'Hủy'
                                THEN COALESCE(deposit, 0)

                            WHEN status = N'Chờ xác nhận'
                                THEN 0

                            ELSE COALESCE(total, 0)
                        END
                    ), 0
                ) AS total
            FROM orders
            WHERE created >= :start_date
              AND created < :end_date
            GROUP BY CAST(created AS DATE)
            ORDER BY CAST(created AS DATE)
        """),
        {
            "start_date": seven_days_start,
            "end_date": tomorrow
        }
    ).mappings().all()

    sales_map = {
        row["sales_date"].isoformat(): float(row["total"] or 0)
        for row in sales_rows
    }

    sales_7_days = []

    for i in range(7):
        d = seven_days_start + timedelta(days=i)

        sales_7_days.append({
            "date": d.isoformat(),
            "total": sales_map.get(d.isoformat(), 0)
        })

    # -----------------------------------------------------
    # 10. Trạng thái đơn
    # -----------------------------------------------------

    status_rows = db.session.execute(
        text("""
            SELECT
                status,
                COUNT(*) AS total
            FROM orders
            GROUP BY status
        """)
    ).mappings().all()

    status_summary = [
        {
            "status": row["status"] or "",
            "total": int(row["total"] or 0)
        }
        for row in status_rows
    ]

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return jsonify({
        "today": today.isoformat(),

        "kpi": {
            "orders_today": int(orders_today),
            "daily_sales": float(daily_sales),
            "monthly_sales": float(monthly_sales),
            "yearly_sales": float(yearly_sales),
            "receivable": float(receivable),
            "low_stock": int(low_stock_count)
        },

        "priority_orders": priority_orders,
        "low_stock_items": low_stock,
        "sales_7_days": sales_7_days,
        "status_summary": status_summary
    })
