-- trades table
CREATE TABLE trades (
    trade_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(4) CHECK (side IN ('BUY','SELL')),
    qty INT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    fees NUMERIC(10,2) DEFAULT 0,
    pnl NUMERIC(10,2) DEFAULT 0,
    strategy_tag VARCHAR(50)
);

-- positions table
CREATE TABLE positions (
    symbol VARCHAR(20) PRIMARY KEY,
    avg_entry_price NUMERIC(10,2),
    qty INT,
    current_price NUMERIC(10,2),
    unrealized_pnl NUMERIC(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT now()
);

-- portfolio snapshots
CREATE TABLE portfolio (
    date DATE PRIMARY KEY,
    cash_balance NUMERIC(12,2),
    equity_value NUMERIC(12,2),
    total_value NUMERIC(12,2),
    realized_pnl NUMERIC(12,2),
    unrealized_pnl NUMERIC(12,2),
    drawdown NUMERIC(12,2)
);

-- risk events log
CREATE TABLE risk_events (
    event_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT now(),
    event_type VARCHAR(50),
    details TEXT
);
