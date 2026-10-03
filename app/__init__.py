from flask import Flask

from .config import Config
from .models import db


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    db.init_app(app)

    # Dashboard
    from .routes.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp)

    # Customers
    from .routes.customers import customers_bp
    app.register_blueprint(customers_bp)

    # Orders
    from .routes.orders import orders_bp
    app.register_blueprint(orders_bp)

    # Inventory
    from .routes.inventory import inventory_bp
    app.register_blueprint(inventory_bp)

    # Movements
    from .routes.movements import movements_bp
    app.register_blueprint(movements_bp)

    # Export / Backup / Data
    from .routes.export import export_bp
    app.register_blueprint(export_bp)
    
    return app