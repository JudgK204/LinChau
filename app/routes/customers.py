from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.models import db


customers_bp = Blueprint("customers", __name__)


# =========================================================
# GET CUSTOMERS
# =========================================================

@customers_bp.route("/api/customers", methods=["GET"])
def get_customers():

    sql = """
        SELECT
            c.id,
            c.name,
            c.phone,
            c.birthday,
            c.colors,
            c.flowers,
            c.occasions,
            c.notes,

            COUNT(
                CASE
                    WHEN o.status <> N'Hủy'
                    THEN o.id
                END
            ) AS order_count,

            COALESCE(
                SUM(
                    CASE
                        WHEN o.status <> N'Hủy'
                        THEN o.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_purchase

        FROM customers c

        LEFT JOIN orders o
            ON o.customer_id = c.id

        GROUP BY
            c.id,
            c.name,
            c.phone,
            c.birthday,
            c.colors,
            c.flowers,
            c.occasions,
            c.notes

        ORDER BY c.id DESC
    """

    rows = db.session.execute(
        text(sql)
    ).mappings().all()

    customers = []

    for row in rows:

        birthday = row["birthday"]

        customers.append({
            "id": row["id"],
            "name": row["name"] or "",
            "phone": row["phone"] or "",

            "birthday": (
                birthday.isoformat()
                if birthday
                else ""
            ),

            "colors": row["colors"] or "",
            "flowers": row["flowers"] or "",
            "occasions": row["occasions"] or "",
            "notes": row["notes"] or "",

            "order_count": int(
                row["order_count"] or 0
            ),

            "total_purchase": float(
                row["total_purchase"] or 0
            )
        })

    return jsonify(customers)
# =========================================================
# GET ONE CUSTOMER
# =========================================================

@customers_bp.route(
    "/api/customers/<customer_id>",
    methods=["GET"]
)
def get_customer(customer_id):

    row = db.session.execute(
        text("""
            SELECT
                id,
                name,
                phone,
                birthday,
                colors,
                flowers,
                occasions,
                notes
            FROM customers
            WHERE id = :id
        """),
        {
            "id": customer_id
        }
    ).mappings().first()


    if not row:
        return jsonify({
            "error": "Không tìm thấy khách hàng."
        }), 404


    return jsonify({
        "id": row["id"],
        "name": row["name"] or "",
        "phone": row["phone"] or "",
        "birthday": (
            row["birthday"].isoformat()
            if row["birthday"]
            else ""
        ),
        "colors": row["colors"] or "",
        "flowers": row["flowers"] or "",
        "occasions": row["occasions"] or "",
        "notes": row["notes"] or ""
    })


# =========================================================
# CREATE CUSTOMER
# =========================================================

@customers_bp.route(
    "/api/customers",
    methods=["POST"]
)
def create_customer():

    data = request.get_json(silent=True) or {}


    name = str(
        data.get("name", "")
    ).strip()

    phone = str(
        data.get("phone", "")
    ).strip()


    if not name:
        return jsonify({
            "error": "Tên khách hàng là bắt buộc."
        }), 400


    if not phone:
        return jsonify({
            "error": "Số điện thoại là bắt buộc."
        }), 400


    # -----------------------------------------------------
    # Generate KH code
    # -----------------------------------------------------

    last_id = db.session.execute(
        text("""
            SELECT TOP 1 id
            FROM customers
            WHERE id LIKE 'KH%'
            ORDER BY
                TRY_CONVERT(
                    INT,
                    SUBSTRING(id, 3, 20)
                ) DESC
        """)
    ).scalar()


    if last_id:

        try:
            number = int(last_id[2:]) + 1
        except ValueError:
            number = 1

    else:
        number = 1


    customer_id = f"KH{number:04d}"


    # -----------------------------------------------------
    # Insert
    # -----------------------------------------------------

    db.session.execute(
        text("""
            INSERT INTO customers (
                id,
                name,
                phone,
                birthday,
                colors,
                flowers,
                occasions,
                notes
            )
            VALUES (
                :id,
                :name,
                :phone,
                :birthday,
                :colors,
                :flowers,
                :occasions,
                :notes
            )
        """),
        {
            "id": customer_id,
            "name": name,
            "phone": phone,
            "birthday": data.get("birthday") or None,
            "colors": data.get("colors") or None,
            "flowers": data.get("flowers") or None,
            "occasions": data.get("occasions") or None,
            "notes": data.get("notes") or None
        }
    )


    db.session.commit()


    return jsonify({
        "message": "Đã thêm khách hàng.",
        "id": customer_id
    }), 201


# =========================================================
# UPDATE CUSTOMER
# =========================================================

@customers_bp.route(
    "/api/customers/<customer_id>",
    methods=["PUT"]
)
def update_customer(customer_id):

    data = request.get_json(silent=True) or {}


    name = str(
        data.get("name", "")
    ).strip()

    phone = str(
        data.get("phone", "")
    ).strip()


    if not name:
        return jsonify({
            "error": "Tên khách hàng là bắt buộc."
        }), 400


    if not phone:
        return jsonify({
            "error": "Số điện thoại là bắt buộc."
        }), 400


    exists = db.session.execute(
        text("""
            SELECT COUNT(*)
            FROM customers
            WHERE id = :id
        """),
        {
            "id": customer_id
        }
    ).scalar()


    if not exists:

        return jsonify({
            "error": "Không tìm thấy khách hàng."
        }), 404


    db.session.execute(
        text("""
            UPDATE customers
            SET
                name = :name,
                phone = :phone,
                birthday = :birthday,
                colors = :colors,
                flowers = :flowers,
                occasions = :occasions,
                notes = :notes
            WHERE id = :id
        """),
        {
            "id": customer_id,
            "name": name,
            "phone": phone,
            "birthday": data.get("birthday") or None,
            "colors": data.get("colors") or None,
            "flowers": data.get("flowers") or None,
            "occasions": data.get("occasions") or None,
            "notes": data.get("notes") or None
        }
    )


    db.session.commit()


    return jsonify({
        "message": "Đã cập nhật khách hàng."
    })


# =========================================================
# DELETE CUSTOMER
# =========================================================

@customers_bp.route(
    "/api/customers/<customer_id>",
    methods=["DELETE"]
)
def delete_customer(customer_id):

    order_count = db.session.execute(
        text("""
            SELECT COUNT(*)
            FROM orders
            WHERE customer_id = :customer_id
        """),
        {
            "customer_id": customer_id
        }
    ).scalar() or 0


    if order_count > 0:

        return jsonify({
            "error":
                "Khách hàng này đang có đơn hàng. "
                "Không thể xóa."
        }), 409


    result = db.session.execute(
        text("""
            DELETE FROM customers
            WHERE id = :id
        """),
        {
            "id": customer_id
        }
    )


    if result.rowcount == 0:

        db.session.rollback()

        return jsonify({
            "error": "Không tìm thấy khách hàng."
        }), 404


    db.session.commit()


    return jsonify({
        "message": "Đã xóa khách hàng."
    })