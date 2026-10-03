from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.models import db


inventory_bp = Blueprint("inventory", __name__)


# =====================================================
# GET INVENTORY
# =====================================================

@inventory_bp.get("/api/inventory")
def get_inventory():

    """
    Lấy TOÀN BỘ nguyên liệu.

    Search và phân trang được xử lý ở frontend
    inventory.js.

    API này không phân trang và không lọc q.
    """

    sql = """
        SELECT
            i.id,
            i.name,
            i.category,
            i.unit,
            i.stock,
            i.min_stock,
            i.cost,

            CASE
                WHEN i.stock <= i.min_stock
                THEN 1
                ELSE 0
            END AS low_stock

        FROM inventory i

        ORDER BY
            CASE
                WHEN i.stock <= i.min_stock THEN 0
                ELSE 1
            END,
            i.name ASC
    """

    rows = db.session.execute(
        text(sql)
    ).mappings().all()

    result = []

    for row in rows:

        data = dict(row)

        # =================================================
        # DECIMAL -> FLOAT
        # =================================================

        for field in [
            "stock",
            "min_stock",
            "cost"
        ]:

            if data.get(field) is not None:

                data[field] = float(
                    data[field]
                )

        # =================================================
        # LOW STOCK -> BOOLEAN
        # =================================================

        if data.get("low_stock") is not None:

            data["low_stock"] = bool(
                data["low_stock"]
            )

        result.append(data)

    return jsonify(result)


# =====================================================
# GET ONE INVENTORY ITEM
# =====================================================

@inventory_bp.get("/api/inventory/<item_id>")
def get_inventory_item(item_id):

    row = db.session.execute(
        text("""
            SELECT
                i.id,
                i.name,
                i.category,
                i.unit,
                i.stock,
                i.min_stock,
                i.cost,

                CASE
                    WHEN i.stock <= i.min_stock
                    THEN 1
                    ELSE 0
                END AS low_stock

            FROM inventory i

            WHERE i.id = :id
        """),
        {
            "id": item_id
        }
    ).mappings().first()


    if not row:

        return jsonify({
            "error": "Không tìm thấy nguyên liệu."
        }), 404


    data = dict(row)


    # =================================================
    # DECIMAL -> FLOAT
    # =================================================

    for field in [
        "stock",
        "min_stock",
        "cost"
    ]:

        if data.get(field) is not None:

            data[field] = float(
                data[field]
            )


    # =================================================
    # LOW STOCK -> BOOLEAN
    # =================================================

    if data.get("low_stock") is not None:

        data["low_stock"] = bool(
            data["low_stock"]
        )


    return jsonify(data)


# =====================================================
# CREATE INVENTORY ITEM
# =====================================================

@inventory_bp.post("/api/inventory")
def create_inventory_item():

    data = request.get_json() or {}


    # =================================================
    # NAME
    # =================================================

    name = (
        data.get("name") or ""
    ).strip()


    if not name:

        return jsonify({
            "error": "Vui lòng nhập tên nguyên liệu."
        }), 400


    # =================================================
    # UNIT
    # =================================================

    unit = (
        data.get("unit") or ""
    ).strip()


    if not unit:

        return jsonify({
            "error": "Vui lòng nhập đơn vị."
        }), 400


    # =================================================
    # CHECK DUPLICATE NAME
    # =================================================

    exists = db.session.execute(
        text("""
            SELECT id
            FROM inventory
            WHERE name = :name
        """),
        {
            "name": name
        }
    ).first()


    if exists:

        return jsonify({
            "error": "Nguyên liệu này đã tồn tại."
        }), 409


    # =================================================
    # GENERATE ID
    # =================================================

    rows = db.session.execute(
        text("""
            SELECT id
            FROM inventory
            WHERE id LIKE 'NL%'
        """)
    ).fetchall()


    numbers = []


    for row in rows:

        try:

            number = int(
                str(row.id)[2:]
            )

            numbers.append(number)

        except Exception:

            pass


    next_number = (
        max(numbers) + 1
        if numbers
        else 1
    )


    item_id = (
        "NL" +
        str(next_number).zfill(4)
    )


    # =================================================
    # VALUES
    # =================================================

    stock = float(
        data.get("stock") or 0
    )


    min_stock = float(
        data.get("min_stock") or 0
    )


    cost = float(
        data.get("cost") or 0
    )


    # =================================================
    # VALIDATE
    # =================================================

    if stock < 0:

        return jsonify({
            "error": "Tồn kho không thể âm."
        }), 400


    if min_stock < 0:

        return jsonify({
            "error": "Tồn tối thiểu không thể âm."
        }), 400


    if cost < 0:

        return jsonify({
            "error": "Giá vốn không thể âm."
        }), 400


    # =================================================
    # INSERT
    # =================================================

    db.session.execute(
        text("""
            INSERT INTO inventory (
                id,
                name,
                category,
                unit,
                stock,
                min_stock,
                cost
            )
            VALUES (
                :id,
                :name,
                :category,
                :unit,
                :stock,
                :min_stock,
                :cost
            )
        """),
        {
            "id": item_id,

            "name": name,

            "category": (
                data.get("category") or ""
            ).strip(),

            "unit": unit,

            "stock": stock,

            "min_stock": min_stock,

            "cost": cost
        }
    )


    db.session.commit()


    return jsonify({
        "message": "Đã thêm nguyên liệu.",
        "id": item_id
    }), 201


# =====================================================
# UPDATE INVENTORY ITEM
# =====================================================

@inventory_bp.put("/api/inventory/<item_id>")
def update_inventory_item(item_id):

    data = request.get_json() or {}


    # =================================================
    # CHECK EXISTS
    # =================================================

    exists = db.session.execute(
        text("""
            SELECT id
            FROM inventory
            WHERE id = :id
        """),
        {
            "id": item_id
        }
    ).first()


    if not exists:

        return jsonify({
            "error": "Không tìm thấy nguyên liệu."
        }), 404


    # =================================================
    # NAME
    # =================================================

    name = (
        data.get("name") or ""
    ).strip()


    if not name:

        return jsonify({
            "error": "Vui lòng nhập tên nguyên liệu."
        }), 400


    # =================================================
    # UNIT
    # =================================================

    unit = (
        data.get("unit") or ""
    ).strip()


    if not unit:

        return jsonify({
            "error": "Vui lòng nhập đơn vị."
        }), 400


    # =================================================
    # CHECK DUPLICATE
    # =================================================

    duplicate = db.session.execute(
        text("""
            SELECT id
            FROM inventory
            WHERE name = :name
              AND id <> :id
        """),
        {
            "name": name,
            "id": item_id
        }
    ).first()


    if duplicate:

        return jsonify({
            "error": "Nguyên liệu này đã tồn tại."
        }), 409


    # =================================================
    # VALUES
    # =================================================

    stock = float(
        data.get("stock") or 0
    )


    min_stock = float(
        data.get("min_stock") or 0
    )


    cost = float(
        data.get("cost") or 0
    )


    # =================================================
    # VALIDATE
    # =================================================

    if stock < 0:

        return jsonify({
            "error": "Tồn kho không thể âm."
        }), 400


    if min_stock < 0:

        return jsonify({
            "error": "Tồn tối thiểu không thể âm."
        }), 400


    if cost < 0:

        return jsonify({
            "error": "Giá vốn không thể âm."
        }), 400


    # =================================================
    # UPDATE
    # =================================================

    db.session.execute(
        text("""
            UPDATE inventory
            SET
                name = :name,
                category = :category,
                unit = :unit,
                stock = :stock,
                min_stock = :min_stock,
                cost = :cost

            WHERE id = :id
        """),
        {
            "id": item_id,

            "name": name,

            "category": (
                data.get("category") or ""
            ).strip(),

            "unit": unit,

            "stock": stock,

            "min_stock": min_stock,

            "cost": cost
        }
    )


    db.session.commit()


    return jsonify({
        "message": "Đã cập nhật nguyên liệu."
    })


# =====================================================
# DELETE INVENTORY ITEM
# =====================================================

@inventory_bp.delete("/api/inventory/<item_id>")
def delete_inventory_item(item_id):

    # =================================================
    # CHECK EXISTS
    # =================================================

    exists = db.session.execute(
        text("""
            SELECT id
            FROM inventory
            WHERE id = :id
        """),
        {
            "id": item_id
        }
    ).first()


    if not exists:

        return jsonify({
            "error": "Không tìm thấy nguyên liệu."
        }), 404


    # =================================================
    # CHECK MOVEMENT HISTORY
    # =================================================

    movement = db.session.execute(
        text("""
            SELECT TOP 1 id
            FROM movements
            WHERE item_id = :item_id
        """),
        {
            "item_id": item_id
        }
    ).first()


    if movement:

        return jsonify({
            "error": (
                "Không thể xóa nguyên liệu vì "
                "đã có lịch sử nhập / xuất / hao hụt kho."
            )
        }), 409


    # =================================================
    # DELETE
    # =================================================

    db.session.execute(
        text("""
            DELETE FROM inventory
            WHERE id = :id
        """),
        {
            "id": item_id
        }
    )


    db.session.commit()


    return jsonify({
        "message": "Đã xóa nguyên liệu."
    })