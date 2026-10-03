/*
===========================================================
LinChau Floral
SQL Server Database
Based on LinChau Floral Local V1.1 Demo
===========================================================

Current source data groups:
1. customers
2. inventory
3. movements
4. orders

Workflow is represented by orders.status in the original app.
No separate workflow/product/production/delivery/user tables
are created at this stage.
*/

IF DB_ID(N'LinChauFloral') IS NULL
BEGIN
    CREATE DATABASE LinChauFloral;
END
GO

USE LinChauFloral;
GO

/* =========================================================
   1. CUSTOMERS
   ========================================================= */
IF OBJECT_ID(N'dbo.customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.customers
    (
        id              VARCHAR(20)      NOT NULL,
        name            NVARCHAR(150)    NOT NULL,
        phone           VARCHAR(30)      NOT NULL,
        birthday        DATE             NULL,
        colors          NVARCHAR(500)    NULL,
        flowers         NVARCHAR(500)    NULL,
        occasions       NVARCHAR(500)    NULL,
        notes           NVARCHAR(MAX)    NULL,

        CONSTRAINT PK_customers PRIMARY KEY (id)
    );
END
GO

/* =========================================================
   2. INVENTORY
   ========================================================= */
IF OBJECT_ID(N'dbo.inventory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventory
    (
        id              VARCHAR(20)      NOT NULL,
        name            NVARCHAR(150)    NOT NULL,
        category        NVARCHAR(100)    NULL,
        unit            NVARCHAR(50)     NULL,
        stock           DECIMAL(18,3)     NOT NULL
            CONSTRAINT DF_inventory_stock DEFAULT (0),
        min_stock       DECIMAL(18,3)     NOT NULL
            CONSTRAINT DF_inventory_min_stock DEFAULT (0),
        cost            DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_inventory_cost DEFAULT (0),

        CONSTRAINT PK_inventory PRIMARY KEY (id),
        CONSTRAINT CK_inventory_stock_nonnegative CHECK (stock >= 0),
        CONSTRAINT CK_inventory_min_stock_nonnegative CHECK (min_stock >= 0),
        CONSTRAINT CK_inventory_cost_nonnegative CHECK (cost >= 0)
    );
END
GO

/* =========================================================
   3. MOVEMENTS
   ========================================================= */
IF OBJECT_ID(N'dbo.movements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movements
    (
        id              VARCHAR(30)      NOT NULL,
        movement_date   DATE             NOT NULL,
        item_id         VARCHAR(20)      NOT NULL,
        type            VARCHAR(20)      NOT NULL,
        qty             DECIMAL(18,3)     NOT NULL,
        unit_cost       DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_movements_unit_cost DEFAULT (0),
        note            NVARCHAR(MAX)    NULL,

        CONSTRAINT PK_movements PRIMARY KEY (id),
        CONSTRAINT FK_movements_inventory
            FOREIGN KEY (item_id) REFERENCES dbo.inventory(id),
        CONSTRAINT CK_movements_type
            CHECK (type IN ('in', 'out', 'waste')),
        CONSTRAINT CK_movements_qty_positive
            CHECK (qty > 0),
        CONSTRAINT CK_movements_unit_cost_nonnegative
            CHECK (unit_cost >= 0)
    );
END
GO

/* =========================================================
   4. ORDERS
   ========================================================= */
IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.orders
    (
        id                  VARCHAR(40)      NOT NULL,
        created             DATE             NOT NULL,
        customer_id         VARCHAR(20)      NOT NULL,

        recipient            NVARCHAR(150)    NULL,
        recipient_phone      VARCHAR(30)      NULL,
        delivery_date        DATE             NULL,
        delivery_time        VARCHAR(10)      NULL,
        address              NVARCHAR(500)    NULL,

        product              NVARCHAR(500)    NULL,

        subtotal             DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_subtotal DEFAULT (0),
        shipping             DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_shipping DEFAULT (0),

        discount_type        VARCHAR(20)      NULL,
        discount_percent     DECIMAL(9,2)      NOT NULL
            CONSTRAINT DF_orders_discount_percent DEFAULT (0),
        discount_amount      DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_discount_amount DEFAULT (0),
        discount_value       DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_discount_value DEFAULT (0),

        total                 DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_total DEFAULT (0),
        deposit               DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_deposit DEFAULT (0),
        balance               DECIMAL(18,2)     NOT NULL
            CONSTRAINT DF_orders_balance DEFAULT (0),

        payment               NVARCHAR(100)    NULL,
        status                NVARCHAR(50)     NOT NULL,
        card                  NVARCHAR(1000)   NULL,
        notes                 NVARCHAR(MAX)    NULL,

        CONSTRAINT PK_orders PRIMARY KEY (id),
        CONSTRAINT FK_orders_customers
            FOREIGN KEY (customer_id) REFERENCES dbo.customers(id),

        CONSTRAINT CK_orders_subtotal_nonnegative CHECK (subtotal >= 0),
        CONSTRAINT CK_orders_shipping_nonnegative CHECK (shipping >= 0),
        CONSTRAINT CK_orders_discount_percent_nonnegative CHECK (discount_percent >= 0),
        CONSTRAINT CK_orders_discount_amount_nonnegative CHECK (discount_amount >= 0),
        CONSTRAINT CK_orders_discount_value_nonnegative CHECK (discount_value >= 0),
        CONSTRAINT CK_orders_total_nonnegative CHECK (total >= 0),
        CONSTRAINT CK_orders_deposit_nonnegative CHECK (deposit >= 0),
        CONSTRAINT CK_orders_balance_nonnegative CHECK (balance >= 0)
    );
END
GO

/* =========================================================
   INDEXES
   ========================================================= */

IF NOT EXISTS
(
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_orders_customer_id'
      AND object_id = OBJECT_ID(N'dbo.orders')
)
BEGIN
    CREATE INDEX IX_orders_customer_id
        ON dbo.orders(customer_id);
END
GO

IF NOT EXISTS
(
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_orders_delivery_date'
      AND object_id = OBJECT_ID(N'dbo.orders')
)
BEGIN
    CREATE INDEX IX_orders_delivery_date
        ON dbo.orders(delivery_date);
END
GO

IF NOT EXISTS
(
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_orders_status'
      AND object_id = OBJECT_ID(N'dbo.orders')
)
BEGIN
    CREATE INDEX IX_orders_status
        ON dbo.orders(status);
END
GO

IF NOT EXISTS
(
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_movements_item_id'
      AND object_id = OBJECT_ID(N'dbo.movements')
)
BEGIN
    CREATE INDEX IX_movements_item_id
        ON dbo.movements(item_id);
END
GO

IF NOT EXISTS
(
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_movements_date'
      AND object_id = OBJECT_ID(N'dbo.movements')
)
BEGIN
    CREATE INDEX IX_movements_date
        ON dbo.movements(movement_date);
END
GO

/* =========================================================
   VERIFY
   ========================================================= */
SELECT
    TABLE_SCHEMA,
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME IN ('customers', 'inventory', 'movements', 'orders')
ORDER BY TABLE_NAME;
GO
