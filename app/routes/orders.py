from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.models import db
from datetime import date


orders_bp = Blueprint("orders", __name__)


STATUS_LIST = [
    "Chờ xác nhận",
    "Đã xác nhận",
    "Đang chuẩn bị",
    "Đang làm",
    "Đã hoàn thành",
    "Đang giao",
    "Đã giao",
    "Hủy"
]


def calculate_order(
    subtotal,
    shipping,
    discount_type,
    discount_percent,
    discount_amount,
    deposit
):
    subtotal = float(subtotal or 0)
    shipping = float(shipping or 0)
    discount_percent = float(discount_percent or 0)
    discount_amount = float(discount_amount or 0)
    deposit = float(deposit or 0)

    # -----------------------------------------------------
    # TÍNH GIẢM GIÁ
    # -----------------------------------------------------

    if discount_type == "percent":
        # % giảm chỉ tính trên tiền hàng
        percent = min(
            100,
            max(0, discount_percent)
        )

        discount = subtotal * percent / 100

    elif discount_type == "amount":
        # Giảm trực tiếp
        discount = max(
            0,
            discount_amount
        )

    elif discount_type == "percent_amount":
        # % giảm + giảm trực tiếp
        percent = min(
            100,
            max(0, discount_percent)
        )

        percent_discount = (
            subtotal * percent / 100
        )

        discount = (
            percent_discount +
            max(0, discount_amount)
        )

    else:
        discount = 0

    # -----------------------------------------------------
    # KHÔNG CHO GIẢM VƯỢT QUÁ TIỀN HÀNG
    # Phí giao không được đem ra giảm
    # -----------------------------------------------------

    discount = min(
        max(0, discount),
        subtotal
    )

    # -----------------------------------------------------
    # TỔNG TIỀN
    # -----------------------------------------------------

    total = max(
        0,
        subtotal +
        shipping -
        discount
    )

    # -----------------------------------------------------
    # TIỀN CỌC / ĐÃ THU
    # -----------------------------------------------------

    deposit = min(
        max(0, deposit),
        total
    )

    balance = total - deposit

    return discount, total, balance

def generate_order_id():

    today = date.today().strftime("%Y%m%d")

    prefix = f"DH{today}-"

    rows = db.session.execute(
        text("""
            SELECT id
            FROM orders
            WHERE id LIKE :prefix
        """),
        {"prefix": prefix + "%"}
    ).fetchall()

    numbers = []

    for row in rows:

        try:
            numbers.append(
                int(row.id.split("-")[-1])
            )
        except Exception:
            pass

    next_number = (
        max(numbers) + 1
        if numbers
        else 1
    )

    return (
        prefix +
        str(next_number).zfill(3)
    )

def generate_guest_customer_id():
    """
    Tạo mã khách lẻ tăng dần:
    KL0000001
    KL0000002
    KL0000003
    """

    last_guest = db.session.execute(
        text("""
            SELECT TOP 1 id
            FROM customers
            WHERE id LIKE 'KL%'
              AND LEN(id) = 9
              AND ISNUMERIC(SUBSTRING(id, 3, 7)) = 1
            ORDER BY id DESC
        """)
    ).scalar()

    if last_guest:
        last_number = int(last_guest[2:])
        next_number = last_number + 1
    else:
        next_number = 1

    return f"KL{next_number:07d}"

# =====================================================
# GET ORDERS
# =====================================================
@orders_bp.get("/api/orders")
def get_orders():

    keyword = (
        request.args.get("q", "")
        .strip()
    )

    status = (
        request.args.get("status", "")
        .strip()
    )

    payment_status = (
        request.args.get("payment_status", "")
        .strip()
    )

    date_from = (
        request.args.get("from", "")
        .strip()
    )

    date_to = (
        request.args.get("to", "")
        .strip()
    )

    sql = """
        SELECT
            o.id,
            o.created,
            o.customer_id,
            c.name AS customer_name,
            c.phone AS customer_phone,

            o.recipient,
            o.recipient_phone,
            o.delivery_date,
            o.delivery_time,
            o.address,
            o.product,

            o.subtotal,
            o.shipping,
            o.discount_type,
            o.discount_percent,
            o.discount_amount,
            o.discount_value,

            o.total,
            o.deposit,
            o.balance,

            o.payment,
            o.status,
            o.card,
            o.notes

        FROM orders o

        LEFT JOIN customers c
            ON c.id = o.customer_id

        WHERE 1 = 1
    """

    params = {}

    # =========================
    # SEARCH
    # =========================

    if keyword:

        sql += """
            AND (
                o.id LIKE :keyword
                OR c.name LIKE :keyword
                OR c.phone LIKE :keyword
                OR o.product LIKE :keyword
                OR o.recipient LIKE :keyword
                OR o.recipient_phone LIKE :keyword
            )
        """

        params["keyword"] = f"%{keyword}%"

    # =========================
    # STATUS
    # =========================

    if status:

        sql += """
            AND o.status = :status
        """

        params["status"] = status

    # =========================
    # PAYMENT STATUS
    # =========================

    if payment_status == "paid":
        # Đã thanh toán đủ
        sql += """
            AND COALESCE(o.total, 0) > 0
            AND COALESCE(o.balance, 0) = 0
        """

    elif payment_status == "unpaid":
        # Chưa thanh toán đủ, bao gồm cả đơn đã cọc
        sql += """
            AND COALESCE(o.balance, 0) > 0
        """

    elif payment_status == "deposited":
        # Đã cọc nhưng vẫn còn phải thu
        sql += """
            AND COALESCE(o.deposit, 0) > 0
            AND COALESCE(o.balance, 0) > 0
        """

    elif payment_status == "not_deposited":
        # Chưa cọc và vẫn còn phải thu
        sql += """
            AND COALESCE(o.deposit, 0) = 0
            AND COALESCE(o.balance, 0) > 0
        """
    # =========================
    # DELIVERY DATE FROM
    # =========================

    if date_from:

        sql += """
            AND o.delivery_date >= :date_from
        """

        params["date_from"] = date_from

    # =========================
    # DELIVERY DATE TO
    # =========================

    if date_to:

        sql += """
            AND o.delivery_date <= :date_to
        """

        params["date_to"] = date_to

    # =========================
    # ORDER
    # =========================

    sql += """
        ORDER BY
            o.delivery_date ASC,
            o.delivery_time ASC,
            o.created DESC
    """

    rows = db.session.execute(
        text(sql),
        params
    ).mappings().all()

    result = []

    for row in rows:

        data = dict(row)

        # SQL Server DATE/DATETIME
        # -> ISO string để frontend xử lý ổn định

        if data.get("created"):
            data["created"] = data["created"].isoformat()

        if data.get("delivery_date"):
            data["delivery_date"] = data["delivery_date"].isoformat()

        result.append(data)

    return jsonify(result)
# =====================================================
# GET ONE ORDER
# =====================================================

@orders_bp.get("/api/orders/<order_id>")
def get_order(order_id):

    row = db.session.execute(
        text("""
            SELECT
                o.id,
                o.created,
                o.customer_id,
                c.name AS customer_name,
                c.phone AS customer_phone,

                o.recipient,
                o.recipient_phone,
                o.delivery_date,
                o.delivery_time,
                o.address,
                o.product,

                o.subtotal,
                o.shipping,
                o.discount_type,
                o.discount_percent,
                o.discount_amount,
                o.discount_value,

                o.total,
                o.deposit,
                o.balance,

                o.payment,
                o.status,
                o.card,
                o.notes

            FROM orders o

            LEFT JOIN customers c
                ON c.id = o.customer_id

            WHERE o.id = :id
        """),
        {
            "id": order_id
        }
    ).mappings().first()

    if not row:

        return jsonify({
            "error": "Không tìm thấy đơn hàng."
        }), 404

    data = dict(row)

    if data.get("created"):
        data["created"] = data["created"].isoformat()

    if data.get("delivery_date"):
        data["delivery_date"] = data["delivery_date"].isoformat()

    return jsonify(data)
# =====================================================
# CREATE ORDER
# =====================================================
from datetime import date, datetime
@orders_bp.post("/api/orders")
def create_order():

    data = request.get_json() or {}

    # =====================================================
    # SẢN PHẨM
    # =====================================================

    product = (
        data.get("product") or ""
    ).strip()

    if not product:

        return jsonify({
            "error": "Vui lòng nhập sản phẩm / mẫu hoa."
        }), 400


    # =====================================================
    # KHÁCH HÀNG
    # =====================================================

    customer_id = (
        data.get("customer_id") or ""
    ).strip()

    if not customer_id:

        return jsonify({
            "error": "Vui lòng chọn khách hàng hoặc chọn Khách lẻ."
        }), 400


    # =====================================================
    # KHÁCH LẺ
    # =====================================================

    if customer_id == "__guest__":

        # Tạo mã khách lẻ tăng dần
        guest_customer_id = generate_guest_customer_id()

        now = datetime.now()

        guest_customer_name = (
            f"Khách lẻ_{now.strftime('%d%m%Y_%H%M')}"
        )

        guest_customer_phone = (
            data.get("guest_customer_phone") or ""
        ).strip()

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
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    NULL
                )
            """),
            {
                "id": guest_customer_id,
                "name": guest_customer_name,
                "phone": guest_customer_phone
            }
        )

        customer_id = guest_customer_id
    # =====================================================
    # TIỀN
    # =====================================================

    subtotal = float(
        data.get("subtotal") or 0
    )

    shipping = float(
        data.get("shipping") or 0
    )

    discount_type = (
        data.get("discount_type")
        or "none"
    )

    discount_percent = float(
        data.get("discount_percent") or 0
    )

    discount_amount = float(
        data.get("discount_amount") or 0
    )

    deposit = float(
        data.get("deposit") or 0
    )


    # =====================================================
    # TÍNH ĐƠN HÀNG
    # =====================================================

    discount, total, balance = calculate_order(
        subtotal,
        shipping,
        discount_type,
        discount_percent,
        discount_amount,
        deposit
    )


    # =====================================================
    # TẠO MÃ ĐƠN
    # =====================================================

    order_id = generate_order_id()


    # =====================================================
    # TRẠNG THÁI
    # =====================================================

    status = (
        data.get("status")
        or "Chờ xác nhận"
    )

    if status not in STATUS_LIST:

        return jsonify({
            "error": "Trạng thái đơn hàng không hợp lệ."
        }), 400


    # =====================================================
    # LƯU DATABASE
    # =====================================================

    db.session.execute(
        text("""
            INSERT INTO orders (
                id,
                created,
                customer_id,
                recipient,
                recipient_phone,
                delivery_date,
                delivery_time,
                address,
                product,
                subtotal,
                shipping,
                discount_type,
                discount_percent,
                discount_amount,
                discount_value,
                total,
                deposit,
                balance,
                payment,
                status,
                card,
                notes
            )
            VALUES (
                :id,
                :created,
                :customer_id,
                :recipient,
                :recipient_phone,
                :delivery_date,
                :delivery_time,
                :address,
                :product,
                :subtotal,
                :shipping,
                :discount_type,
                :discount_percent,
                :discount_amount,
                :discount_value,
                :total,
                :deposit,
                :balance,
                :payment,
                :status,
                :card,
                :notes
            )
        """),
        {
            "id": order_id,
            "created": data.get("created") or date.today(),
            "customer_id": customer_id,
            "recipient": data.get("recipient"),
            "recipient_phone": data.get("recipient_phone"),
            "delivery_date": data.get("delivery_date"),
            "delivery_time": data.get("delivery_time"),
            "address": data.get("address"),
            "product": product,
            "subtotal": subtotal,
            "shipping": shipping,
            "discount_type": discount_type,
            "discount_percent": discount_percent,
            "discount_amount": discount_amount,
            "discount_value": discount,
            "total": total,
            "deposit": deposit,
            "balance": balance,
            "payment": data.get("payment"),
            "status": status,
            "card": data.get("card"),
            "notes": data.get("notes")
        }
    )


    # =====================================================
    # COMMIT
    # =====================================================

    db.session.commit()


    return jsonify({
        "message": "Đã tạo đơn hàng.",
        "id": order_id
    }), 201
# =====================================================
# UPDATE ORDER
# =====================================================

@orders_bp.put("/api/orders/<order_id>")
def update_order(order_id):

    data = request.get_json() or {}

    # =====================================================
    # 1. KIỂM TRA ĐƠN HÀNG
    # =====================================================

    exists = db.session.execute(
        text("""
            SELECT id
            FROM orders
            WHERE id = :id
        """),
        {
            "id": order_id
        }
    ).first()

    if not exists:
        return jsonify({
            "error": "Không tìm thấy đơn hàng."
        }), 404

    # =====================================================
    # 2. THÔNG TIN KHÁCH HÀNG
    # =====================================================

    customer_id = (data.get("customer_id") or "").strip()

    if not customer_id:
        return jsonify({
            "error": "Vui lòng chọn khách hàng hoặc chọn Khách lẻ."
        }), 400

    # =====================================================
    # 3. XỬ LÝ KHÁCH LẺ
    # =====================================================

    if customer_id == "__guest__":

        # Tạo mã khách lẻ mới
        guest_customer_id = generate_guest_customer_id()

        now = datetime.now()

        guest_customer_name = (
            f"Khách lẻ_{now.strftime('%d%m%Y_%H%M')}"
        )

        guest_customer_phone = (
            data.get("guest_customer_phone") or ""
        ).strip()

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
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    NULL
                )
            """),
            {
                "id": guest_customer_id,
                "name": guest_customer_name,
                "phone": guest_customer_phone
            }
        )

        # Đơn hàng sẽ liên kết với khách lẻ vừa tạo
        customer_id = guest_customer_id

    # =====================================================
    # 4. NẾU ĐANG SỬA MỘT KHÁCH LẺ ĐÃ CÓ
    # =====================================================

    elif customer_id.startswith("KL"):

        guest_exists = db.session.execute(
            text("""
                SELECT id
                FROM customers
                WHERE id = :id
            """),
            {
                "id": customer_id
            }
        ).scalar()

        if not guest_exists:
            return jsonify({
                "error": "Không tìm thấy khách lẻ."
            }), 400

        # Khi sửa đơn của khách lẻ,
        # cập nhật luôn SĐT khách lẻ
        guest_customer_phone = (
            data.get("guest_customer_phone") or ""
        ).strip()

        db.session.execute(
            text("""
                UPDATE customers
                SET phone = :phone
                WHERE id = :id
            """),
            {
                "id": customer_id,
                "phone": guest_customer_phone
            }
        )

    # =====================================================
    # 5. THÔNG TIN SẢN PHẨM
    # =====================================================

    product = (data.get("product") or "").strip()

    if not product:
        return jsonify({
            "error": "Vui lòng nhập sản phẩm / mẫu hoa."
        }), 400

    # =====================================================
    # 6. THÔNG TIN TIỀN
    # =====================================================

    subtotal = float(
        data.get("subtotal") or 0
    )

    shipping = float(
        data.get("shipping") or 0
    )

    discount_type = (
        data.get("discount_type") or "none"
    )

    discount_percent = float(
        data.get("discount_percent") or 0
    )

    discount_amount = float(
        data.get("discount_amount") or 0
    )

    deposit = float(
        data.get("deposit") or 0
    )

    # =====================================================
    # 7. TÍNH LẠI DISCOUNT / TOTAL / BALANCE
    # =====================================================

    discount, total, balance = calculate_order(
        subtotal,
        shipping,
        discount_type,
        discount_percent,
        discount_amount,
        deposit
    )

    # =====================================================
    # 8. KIỂM TRA TRẠNG THÁI ĐƠN HÀNG
    # =====================================================

    status = (
        data.get("status") or "Chờ xác nhận"
    )

    if status not in STATUS_LIST:
        return jsonify({
            "error": "Trạng thái đơn hàng không hợp lệ."
        }), 400

    # =====================================================
    # 9. CẬP NHẬT ĐƠN HÀNG
    # =====================================================

    db.session.execute(
        text("""
            UPDATE orders
            SET
                created = :created,
                customer_id = :customer_id,
                recipient = :recipient,
                recipient_phone = :recipient_phone,
                delivery_date = :delivery_date,
                delivery_time = :delivery_time,
                address = :address,
                product = :product,

                subtotal = :subtotal,
                shipping = :shipping,

                discount_type = :discount_type,
                discount_percent = :discount_percent,
                discount_amount = :discount_amount,
                discount_value = :discount_value,

                total = :total,
                deposit = :deposit,
                balance = :balance,

                payment = :payment,
                status = :status,
                card = :card,
                notes = :notes

            WHERE id = :id
        """),
        {
            "id": order_id,

            "created": data.get("created") or date.today(),

            "customer_id": customer_id,

            "recipient": data.get("recipient"),
            "recipient_phone": data.get("recipient_phone"),

            "delivery_date": data.get("delivery_date"),
            "delivery_time": data.get("delivery_time"),

            "address": data.get("address"),

            "product": product,

            "subtotal": subtotal,
            "shipping": shipping,

            "discount_type": discount_type,
            "discount_percent": discount_percent,
            "discount_amount": discount_amount,
            "discount_value": discount,

            "total": total,
            "deposit": deposit,
            "balance": balance,

            "payment": data.get("payment"),
            "status": status,
            "card": data.get("card"),
            "notes": data.get("notes")
        }
    )

    # =====================================================
    # 10. COMMIT
    # =====================================================

    db.session.commit()

    # =====================================================
    # 11. RESPONSE
    # =====================================================

    return jsonify({
        "message": "Đã cập nhật đơn hàng.",
        "id": order_id
    }), 200
# =====================================================
# UPDATE STATUS ONLY
# =====================================================

@orders_bp.patch("/api/orders/<order_id>/status")
def update_order_status(order_id):

    data = request.get_json() or {}

    status = (
        data.get("status") or ""
    ).strip()

    if status not in STATUS_LIST:

        return jsonify({
            "error": "Trạng thái không hợp lệ."
        }), 400

    order = db.session.execute(
        text("""
            SELECT total
            FROM orders
            WHERE id = :id
        """),
        {"id": order_id}
    ).mappings().first()

    if not order:

        return jsonify({
            "error": "Không tìm thấy đơn hàng."
        }), 404

    db.session.execute(
        text("""
            UPDATE orders
            SET status = :status
            WHERE id = :id
        """),
        {
            "id": order_id,
            "status": status
        }
    )

    db.session.commit()

    return jsonify({
        "message": "Đã cập nhật trạng thái."
    })


# =====================================================
# DELETE ORDER
# =====================================================

@orders_bp.delete("/api/orders/<order_id>")
def delete_order(order_id):

    exists = db.session.execute(
        text("""
            SELECT id
            FROM orders
            WHERE id = :id
        """),
        {"id": order_id}
    ).first()

    if not exists:

        return jsonify({
            "error": "Không tìm thấy đơn hàng."
        }), 404

    db.session.execute(
        text("""
            DELETE FROM orders
            WHERE id = :id
        """),
        {"id": order_id}
    )

    db.session.commit()

    return jsonify({
        "message": "Đã xóa đơn hàng."
    })