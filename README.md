# AITrader

Small utility repository for bootstrapping and testing a PostgreSQL-backed trading data store.

This repo currently contains a minimal DB schema and two helper scripts for initializing and testing the database connection.

Files
-----
- `test_db.py` — quick smoke-test script that connects to Postgres and inserts a dummy trade row into the `trades` table. Useful to verify connectivity and that the schema has been applied. Defaults (can be overridden with environment variables):
	- DB_NAME: `trading`
	- DB_USER: `trader`
	- DB_PASS: `trader`
	- DB_HOST: `localhost`
	- DB_PORT: `5432`

- `db/init_db.py` — idempotent database bootstrap script. Reads and executes `db/schema.sql` against the configured Postgres database. Prints the list of tables in the `public` schema after applying the DDL. Defaults (can be overridden with environment variables):
	- DB_NAME: `trading`
	- DB_USER: `trader`
	- DB_PASS: `securepass`
	- DB_HOST: `localhost`
	- DB_PORT: `5432`

- `db/schema.sql` — the SQL DDL used by the migrator. Contains `CREATE TABLE IF NOT EXISTS` statements for:
	- `trades` (individual executions)
	- `positions` (current holdings)
	- `portfolio` (daily snapshots)
	- `risk_events` (risk log)
	- An index `idx_trades_timestamp` on `trades(timestamp)`

Prerequisites
-------------
- Python 3.8+ (Windows)
- PostgreSQL server accessible with the configured credentials
- Python DB driver. For development on Windows install the wheel-friendly package:

```powershell
pip install psycopg2-binary
```

Usage (PowerShell)
------------------
1. Set DB environment variables (optional). Example using built-in defaults will attempt to connect to a DB named `trading` with user `trader`:

```powershell
$env:DB_NAME = 'trading'
$env:DB_USER = 'trader'
$env:DB_PASS = 'trader'
$env:DB_HOST = 'localhost'
$env:DB_PORT = '5432'
```

2. Initialize the database schema (runs `db/schema.sql`):

```powershell
python .\db\init_db.py
```

Expected output: DDL will be applied (idempotently), followed by a printed list of tables found in the `public` schema.

3. Run the smoke test to insert a dummy trade:

```powershell
python .\test_db.py
```

Expected output: a confirmation line like "✅ Dummy trade inserted. trade_id=..."

Notes & Troubleshooting
-----------------------
- If the scripts fail to connect, verify your Postgres server is running and reachable at `DB_HOST:DB_PORT` and that the user/database exist and accept the provided password.
- To create the database and user quickly from `psql` (adjust password and names as needed):

```sql
CREATE USER trader WITH PASSWORD 'trader';
CREATE DATABASE trading OWNER trader;
GRANT ALL PRIVILEGES ON DATABASE trading TO trader;
```

- On Windows, `psycopg2-binary` simplifies installation. For production deployments prefer `psycopg2` built from source or other proper packaging.

Security
--------
Do not commit real credentials. Use environment variables or a secrets manager in production.

Next steps (suggestions)
------------------------
- Add `requirements.txt` or `pyproject.toml` to pin dependencies.
- Add a small integration test harness that boots a temporary Postgres (Docker) for CI.
- Replace the simple DDL-runner with a proper migration tool (Alembic, Flyway, etc.) if schema evolution is required.

License
-------
No license specified. Add one if you intend to open-source the repository.
