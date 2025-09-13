# test_db.py
import os, datetime
import psycopg2
from dotenv import load_dotenv

# insert at top of test_db.py after loading dotenv
print("DB config ->", {
    "DB_NAME": os.getenv("DB_NAME"),
    "DB_USER": os.getenv("DB_USER"),
    "DB_HOST": os.getenv("DB_HOST"),
    "DB_PORT": os.getenv("DB_PORT")
})

# Load env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "config", ".env"))

DB = dict(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
)

def insert_dummy():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO trades (timestamp, symbol, side, qty, price, fees, pnl, strategy_tag, notes)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING trade_id;
    """, (datetime.datetime.now(), "SMOKE", "BUY", 1, 1.0, 0.0, 0.0, "smoke_test", "via .env"))
    tid = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Dummy trade inserted. trade_id={tid}")

if __name__ == "__main__":
    insert_dummy()
