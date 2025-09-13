# db/init_db.py
import os
import psycopg2
from dotenv import load_dotenv

# Load variables from config/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "config", ".env"))

DB = dict(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
)
