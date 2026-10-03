"""
LinChau Floral - SQLAlchemy Models

These models mirror the current SQL Server schema generated from
LinChau Floral Local V1.1 Demo.

Current entities:
- Customer
- Inventory
- Movement
- Order

Workflow is represented by Order.status, matching the original app.
"""

from datetime import date
from decimal import Decimal

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.Unicode(150), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    birthday = db.Column(db.Date, nullable=True)
    colors = db.Column(db.Unicode(500), nullable=True)
    flowers = db.Column(db.Unicode(500), nullable=True)
    occasions = db.Column(db.Unicode(500), nullable=True)
    notes = db.Column(db.UnicodeText, nullable=True)

    orders = db.relationship(
        "Order",
        back_populates="customer",
        lazy=True,
    )

    def __repr__(self):
        return f"<Customer {self.id} - {self.name}>"


class Inventory(db.Model):
    __tablename__ = "inventory"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.Unicode(150), nullable=False)
    category = db.Column(db.Unicode(100), nullable=True)
    unit = db.Column(db.Unicode(50), nullable=True)

    stock = db.Column(
        db.Numeric(18, 3),
        nullable=False,
        default=Decimal("0"),
    )
    min_stock = db.Column(
        db.Numeric(18, 3),
        nullable=False,
        default=Decimal("0"),
    )
    cost = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    movements = db.relationship(
        "Movement",
        back_populates="inventory_item",
        lazy=True,
    )

    def __repr__(self):
        return f"<Inventory {self.id} - {self.name}>"


class Movement(db.Model):
    __tablename__ = "movements"

    id = db.Column(db.String(30), primary_key=True)
    movement_date = db.Column(db.Date, nullable=False)

    item_id = db.Column(
        db.String(20),
        db.ForeignKey("inventory.id"),
        nullable=False,
        index=True,
    )

    type = db.Column(db.String(20), nullable=False)
    qty = db.Column(db.Numeric(18, 3), nullable=False)
    unit_cost = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )
    note = db.Column(db.UnicodeText, nullable=True)

    inventory_item = db.relationship(
        "Inventory",
        back_populates="movements",
    )

    def __repr__(self):
        return f"<Movement {self.id} - {self.type}>"


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.String(40), primary_key=True)
    created = db.Column(db.Date, nullable=False)

    customer_id = db.Column(
        db.String(20),
        db.ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    recipient = db.Column(db.Unicode(150), nullable=True)
    recipient_phone = db.Column(db.String(30), nullable=True)

    delivery_date = db.Column(db.Date, nullable=True, index=True)
    delivery_time = db.Column(db.String(10), nullable=True)
    address = db.Column(db.Unicode(500), nullable=True)

    product = db.Column(db.Unicode(500), nullable=True)

    subtotal = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )
    shipping = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    discount_type = db.Column(db.String(20), nullable=True)
    discount_percent = db.Column(
        db.Numeric(9, 2),
        nullable=False,
        default=Decimal("0"),
    )
    discount_amount = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )
    discount_value = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    total = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )
    deposit = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )
    balance = db.Column(
        db.Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    payment = db.Column(db.Unicode(100), nullable=True)
    status = db.Column(db.Unicode(50), nullable=False, index=True)
    card = db.Column(db.Unicode(1000), nullable=True)
    notes = db.Column(db.UnicodeText, nullable=True)

    customer = db.relationship(
        "Customer",
        back_populates="orders",
    )

    def __repr__(self):
        return f"<Order {self.id}>"
