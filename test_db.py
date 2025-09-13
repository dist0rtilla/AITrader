# test_db.py
import os, datetime
import psycopg2

DB = dict(
    dbname=os.getenv("DB_NAME","trading"),
    user=os.getenv("DB_USER","trader"),
    password=os.getenv("DB_PASS","trader"),
    host=os.getenv("DB_HOST","localhost"),
    port=os.getenv("DB_PORT","5432"),
)

def insert_dummy():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO trades (timestamp, symbol, side, qty, price, fees, pnl, strategy_tag, notes)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING trade_id;
    """, (datetime.datetime.now(), "SMOKE", "BUY", 1, 1.0, 0.0, 0.0, "smoke_test", "inserted by test_db"))
    tid = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Dummy trade inserted. trade_id={tid}")

if __name__ == "__main__":
    insert_dummy()
