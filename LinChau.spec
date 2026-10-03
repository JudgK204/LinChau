# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


PROJECT_DIR = Path.cwd()


a = Analysis(
    ["run.py"],
    pathex=[str(PROJECT_DIR)],
    binaries=[],
    datas=[
        ("app/templates", "app/templates"),
        ("app/static", "app/static"),
        (".env", "."),
    ],
    hiddenimports=[
        "app",
        "app.models",
        "app.config",
        "app.routes.dashboard",
        "app.routes.customers",
        "app.routes.orders",
        "app.routes.inventory",
        "app.routes.movements",
        "app.routes.export",
        "flask",
        "flask_sqlalchemy",
        "sqlalchemy",
        "pyodbc",
        "dotenv",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)


pyz = PYZ(a.pure)


exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="LinChau",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
)