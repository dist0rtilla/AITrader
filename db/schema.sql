-- db/schema.sql
-- (kept for reference; the Python migrator will run CREATE TABLE IF NOT EXISTS)

-- trades table (individual executions)
CREATE TABLE IF NOT EXISTS trades (
    trade_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(4) CHECK (side IN ('BUY','SELL')),
    qty INT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    fees NUMERIC(12,2) DEFAULT 0,
    pnl NUMERIC(12,2) DEFAULT 0,
    strategy_tag VARCHAR(100),
    notes TEXT
);

-- positions table (current holdings)
CREATE TABLE IF NOT EXISTS positions (
    symbol VARCHAR(50) PRIMARY KEY,
    avg_entry_price NUMERIC(12,2),
    qty INT,
    current_price NUMERIC(12,2),
    unrealized_pnl NUMERIC(12,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT now()
);

-- portfolio snapshots (daily metrics)
CREATE TABLE IF NOT EXISTS portfolio (
    date DATE PRIMARY KEY,
    cash_balance NUMERIC(18,2),
    equity_value NUMERIC(18,2),
    total_value NUMERIC(18,2),
    realized_pnl NUMERIC(18,2),
    unrealized_pnl NUMERIC(18,2),
    drawdown NUMERIC(18,2)
);

-- risk events log
CREATE TABLE IF NOT EXISTS risk_events (
    event_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT now(),
    event_type VARCHAR(100),
    details TEXT
);

-- index on trades.timestamp for fast queries
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades (timestamp);
