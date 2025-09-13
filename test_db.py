import os, datetime
import psycopg2

DB = dict(
    dbname=os.getenv("DB_NAME","trading"),
    user=os.getenv("DB_USER","trader"),
    password=os.getenv("DB_PASS","trader"),
    host=os.getenv("DB_HOST","localhost"),
    port=os.getenv("DB_PORT","5432"),
)

conn = psycopg2.connect(**DB)
cur = conn.cursor()
cur.execute("""
 INSERT INTO trades (timestamp, symbol, side, qty, price, fees, pnl, strategy_tag)
 VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
""", (datetime.datetime.now(), "TEST", "BUY", 1, 100.0, 0.0, 0.0, "smoke_test"))
conn.commit()
cur.close()
conn.close()
print("✅ Dummy trade inserted")
