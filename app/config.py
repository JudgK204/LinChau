import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


# Thư mục gốc của ứng dụng
BASE_DIR = Path(__file__).resolve().parent.parent

# Đọc file .env nằm cùng thư mục với run.py / LinChau.exe
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)


server = os.getenv("DB_SERVER")
database = os.getenv("DB_NAME")
driver = os.getenv("DB_DRIVER")


if not server:
    raise RuntimeError("Thiếu DB_SERVER trong file .env")

if not database:
    raise RuntimeError("Thiếu DB_NAME trong file .env")

if not driver:
    raise RuntimeError("Thiếu DB_DRIVER trong file .env")


connection_string = (
    f"DRIVER={{{driver}}};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"Trusted_Connection=yes;"
    f"TrustServerCertificate=yes;"
)


class Config:
    SQLALCHEMY_DATABASE_URI = (
        "mssql+pyodbc:///?odbc_connect="
        + quote_plus(connection_string)
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False