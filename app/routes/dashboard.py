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
    month_start = today.replace(day=1)
    seven_days_start = today - timedelta(days=6)

    # -----------------------------------------------------
    # 1. Đơn hôm nay
    # -----------------------------------------------------

    orders_today = db.session.execute(
        text("""
            SELECT COUNT(*)
            FROM orders
            WHERE created = :today
              AND status <> N'Hủy'
        """),
        {
            "today": today
        }
    ).scalar() or 0


    # -----------------------------------------------------
    # 2. Doanh thu tháng
    # -----------------------------------------------------

    monthly_sales = db.session.execute(
        text("""
            SELECT COALESCE(SUM(total), 0)
            FROM orders
            WHERE created >= :month_start
              AND created <= :today
              AND status <> N'Hủy'
        """),
        {
            "month_start": month_start,
            "today": today
        }
    ).scalar() or 0


    # -----------------------------------------------------
    # 3. Còn phải thu
    # -----------------------------------------------------

    receivable = db.session.execute(
        text("""
            SELECT COALESCE(SUM(balance), 0)
            FROM orders
            WHERE status NOT IN (N'Hủy', N'Đã thanh toán')
        """)
    ).scalar() or 0


    # -----------------------------------------------------
    # 4. Nguyên liệu cần nhập
    # -----------------------------------------------------

    low_stock_count = db.session.execute(
        text("""
            SELECT COUNT(*)
            FROM inventory
            WHERE stock <= min_stock
        """)
    ).scalar() or 0


    # -----------------------------------------------------
    # 5. Đơn cần xử lý
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
            WHERE o.status NOT IN
                (N'Đã giao', N'Hủy')
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
    # 6. Cảnh báo kho
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
            "name": row["name"],
            "unit": row["unit"] or "",
            "stock": float(row["stock"] or 0),
            "min_stock": float(row["min_stock"] or 0)
        })


    # -----------------------------------------------------
    # 7. Doanh thu 7 ngày
    # -----------------------------------------------------

    sales_rows = db.session.execute(
        text("""
            SELECT
                created,
                COALESCE(SUM(total), 0) AS total
            FROM orders
            WHERE created >= :start_date
              AND created <= :today
              AND status <> N'Hủy'
            GROUP BY created
            ORDER BY created
        """),
        {
            "start_date": seven_days_start,
            "today": today
        }
    ).mappings().all()


    sales_map = {
        row["created"].isoformat(): float(row["total"] or 0)
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
    # 8. Trạng thái đơn
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
            "monthly_sales": float(monthly_sales),
            "receivable": float(receivable),
            "low_stock": int(low_stock_count)
        },

        "priority_orders": priority_orders,

        "low_stock_items": low_stock,

        "sales_7_days": sales_7_days,

        "status_summary": status_summary
    })