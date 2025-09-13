# db/init_db.py
"""
Idempotent DB bootstrap for AITrader.
Run from Windows VS Code terminal (uses psycopg2 and local env vars).
It will create all required tables if missing.
"""

import os
import psycopg2
from psycopg2 import sql

# Load DB settings from env (falls back to defaults)
DB = dict(
    dbname=os.getenv("DB_NAME", "trading"),
    user=os.getenv("DB_USER", "trader"),
    password=os.getenv("DB_PASS", "securepass"),
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
)

DDL = open(os.path.join(os.path.dirname(__file__), "schema.sql"), "r", encoding="utf-8").read()

def run_migration():
    print("Connecting to Postgres at {host}:{port} db={dbname} user={user}".format(**DB))
    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()

    print("Applying DDL...")
    cur.execute(DDL)
    print("DDL applied.")

    # sanity: show created tables
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public'
        ORDER BY table_name;
        """
    )
    rows = cur.fetchall()
    print("Tables in public schema:")
    for r in rows:
        print(" -", r[0])

    cur.close()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    run_migration()
