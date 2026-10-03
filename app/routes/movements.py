from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.models import db
from datetime import date


movements_bp = Blueprint("movements", __name__)


MOVEMENT_TYPES = [
    "in",
    "out",
    "waste"
]


# =====================================================
# GENERATE MOVEMENT ID
# =====================================================

def generate_movement_id():

    today = date.today().strftime("%Y%m%d")

    prefix = f"NK{today}-"

    rows = db.session.execute(
        text("""
            SELECT id
            FROM movements
            WHERE id LIKE :prefix
        """),
        {
            "prefix": prefix + "%"
        }
    ).fetchall()

    numbers = []

    for row in rows:

        try:

            number = int(
                str(row.id).split("-")[-1]
            )

            numbers.append(number)

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


# =====================================================
# GET MOVEMENTS
# =====================================================

@movements_bp.get("/api/movements")
def get_movements():

    keyword = (
        request.args.get("q", "")
        .strip()
    )

    movement_type = (
        request.args.get("type", "")
        .strip()
    )

    sql = """
        SELECT
            m.id,
            m.movement_date,
            m.item_id,

            i.name AS item_name,
            i.category AS item_category,
            i.unit AS item_unit,

            m.type,
            m.qty,
            m.unit_cost,
            m.note

        FROM movements m

        INNER JOIN inventory i
            ON i.id = m.item_id

        WHERE 1 = 1
    """

    params = {}

    # =================================================
    # SEARCH
    # =================================================

    if keyword:

        sql += """
            AND (
                m.id LIKE :keyword
                OR m.item_id LIKE :keyword
                OR i.name LIKE :keyword
                OR m.note LIKE :keyword
            )
        """

        params["keyword"] = f"%{keyword}%"

    # =================================================
    # TYPE FILTER
    # =================================================

    if movement_type:

        if movement_type not in MOVEMENT_TYPES:

            return jsonify({
                "error": "Loại biến động không hợp lệ."
            }), 400

        sql += """
            AND m.type = :movement_type
        """

        params["movement_type"] = movement_type

    # =================================================
    # ORDER
    # =================================================

    sql += """
        ORDER BY
            m.movement_date DESC,
            m.id DESC
    """

    rows = db.session.execute(
        text(sql),
        params
    ).mappings().all()

    result = []

    for row in rows:

        data = dict(row)

        if data.get("movement_date"):

            data["movement_date"] = (
                data["movement_date"].isoformat()
            )

        for field in [
            "qty",
            "unit_cost"
        ]:

            if data.get(field) is not None:

                data[field] = float(
                    data[field]
                )

        result.append(data)

    return jsonify(result)


# =====================================================
# GET ONE MOVEMENT
# =====================================================

@movements_bp.get("/api/movements/<movement_id>")
def get_movement(movement_id):

    row = db.session.execute(
        text("""
            SELECT
                m.id,
                m.movement_date,
                m.item_id,

                i.name AS item_name,
                i.category AS item_category,
                i.unit AS item_unit,

                m.type,
                m.qty,
                m.unit_cost,
                m.note

            FROM movements m

            INNER JOIN inventory i
                ON i.id = m.item_id

            WHERE m.id = :id
        """),
        {
            "id": movement_id
        }
    ).mappings().first()

    if not row:

        return jsonify({
            "error": "Không tìm thấy biến động kho."
        }), 404

    data = dict(row)

    if data.get("movement_date"):

        data["movement_date"] = (
            data["movement_date"].isoformat()
        )

    for field in [
        "qty",
        "unit_cost"
    ]:

        if data.get(field) is not None:

            data[field] = float(
                data[field]
            )

    return jsonify(data)


# =====================================================
# CREATE MOVEMENT
# =====================================================

@movements_bp.post("/api/movements")
def create_movement():

    data = request.get_json() or {}

    # =================================================
    # BASIC DATA
    # =================================================

    item_id = (
        data.get("item_id") or ""
    ).strip()

    if not item_id:

        return jsonify({
            "error": "Vui lòng chọn nguyên liệu."
        }), 400

    movement_type = (
        data.get("type") or ""
    ).strip()

    if movement_type not in MOVEMENT_TYPES:

        return jsonify({
            "error": "Loại biến động không hợp lệ."
        }), 400

    # =================================================
    # CHECK INVENTORY
    # =================================================

    item = db.session.execute(
        text("""
            SELECT
                id,
                name,
                unit,
                stock,
                cost
            FROM inventory
            WHERE id = :id
        """),
        {
            "id": item_id
        }
    ).mappings().first()

    if not item:

        return jsonify({
            "error": "Không tìm thấy nguyên liệu."
        }), 404

    # =================================================
    # QUANTITY
    # =================================================

    try:

        qty = float(
            data.get("qty") or 0
        )

    except (TypeError, ValueError):

        return jsonify({
            "error": "Số lượng không hợp lệ."
        }), 400

    if qty <= 0:

        return jsonify({
            "error": "Số lượng phải lớn hơn 0."
        }), 400

    # =================================================
    # UNIT COST
    # =================================================

    try:

        unit_cost = float(
            data.get("unit_cost")
            if data.get("unit_cost") is not None
            else item["cost"] or 0
        )

    except (TypeError, ValueError):

        return jsonify({
            "error": "Đơn giá không hợp lệ."
        }), 400

    if unit_cost < 0:

        return jsonify({
            "error": "Đơn giá không thể âm."
        }), 400

    # =================================================
    # MOVEMENT DATE
    # =================================================

    movement_date = (
        data.get("movement_date")
        or date.today()
    )

    # =================================================
    # CURRENT STOCK
    # =================================================

    current_stock = float(
        item["stock"] or 0
    )

    # =================================================
    # CALCULATE NEW STOCK
    # =================================================

    if movement_type == "in":

        new_stock = (
            current_stock + qty
        )

    else:

        if qty > current_stock:

            return jsonify({
                "error": (
                    f"Không đủ tồn kho. "
                    f"Tồn hiện tại: "
                    f"{current_stock:g} "
                    f"{item['unit']}."
                )
            }), 400

        new_stock = (
            current_stock - qty
        )

    # =================================================
    # GENERATE ID
    # =================================================

    movement_id = generate_movement_id()

    # =================================================
    # INSERT MOVEMENT
    # =================================================

    db.session.execute(
        text("""
            INSERT INTO movements (
                id,
                movement_date,
                item_id,
                type,
                qty,
                unit_cost,
                note
            )
            VALUES (
                :id,
                :movement_date,
                :item_id,
                :type,
                :qty,
                :unit_cost,
                :note
            )
        """),
        {
            "id": movement_id,
            "movement_date": movement_date,
            "item_id": item_id,
            "type": movement_type,
            "qty": qty,
            "unit_cost": unit_cost,
            "note": (
                data.get("note") or ""
            ).strip()
        }
    )

    # =================================================
    # UPDATE STOCK
    # =================================================

    db.session.execute(
        text("""
            UPDATE inventory
            SET stock = :stock
            WHERE id = :id
        """),
        {
            "id": item_id,
            "stock": new_stock
        }
    )

    db.session.commit()

    return jsonify({
        "message": "Đã ghi nhận biến động kho.",
        "id": movement_id,
        "item_id": item_id,
        "old_stock": current_stock,
        "new_stock": new_stock
    }), 201