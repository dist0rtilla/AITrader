#!/usr/bin/env python3
"""
Mock MCP (Model Context Protocol) Service
Simulates Zerodha MCP endpoints for local development and testing.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn
import os

app = FastAPI(
    title="Mock MCP Service",
    description="Mock implementation of Model Context Protocol for AITrader development",
    version="1.0.0"
)

# Mock data structures
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    status: str
    message: str

class Holding(BaseModel):
    symbol: str
    quantity: int
    price: float
    value: float
    pnl: float

class HoldingsResponse(BaseModel):
    holdings: List[Holding]
    total_value: float

# Mock data
MOCK_HOLDINGS = [
    Holding(symbol="AAPL", quantity=100, price=150.0, value=15000.0, pnl=500.0),
    Holding(symbol="GOOGL", quantity=50, price=2800.0, value=140000.0, pnl=-2000.0),
    Holding(symbol="MSFT", quantity=75, price=300.0, value=22500.0, pnl=1200.0),
    Holding(symbol="TSLA", quantity=25, price=800.0, value=20000.0, pnl=-800.0),
]

# Valid tokens for mock authentication
VALID_TOKENS = {"mock_token_123", "dev_token_456"}

@app.get("/")
async def root():
    return {
        "service": "Mock MCP",
        "status": "running",
        "version": "1.0.0",
        "endpoints": ["/mcp/login", "/mcp/holdings", "/health"]
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "mock-mcp"}

@app.post("/mcp/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Mock login endpoint - accepts any credentials for development"""
    if request.username and request.password:
        return LoginResponse(
            token="mock_token_123",
            status="success",
            message="Login successful (mock)"
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Username and password required"
        )

@app.get("/mcp/holdings", response_model=HoldingsResponse)
async def get_holdings(token: Optional[str] = None):
    """Mock holdings endpoint - returns sample portfolio data"""
    if not token or token not in VALID_TOKENS:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing token"
        )
    
    total_value = sum(holding.value for holding in MOCK_HOLDINGS)
    
    return HoldingsResponse(
        holdings=MOCK_HOLDINGS,
        total_value=total_value
    )

@app.get("/mcp/positions")
async def get_positions(token: Optional[str] = None):
    """Mock positions endpoint - returns sample position data"""
    if not token or token not in VALID_TOKENS:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing token"
        )
    
    return {
        "positions": [
            {"symbol": "AAPL", "quantity": 100, "side": "long"},
            {"symbol": "GOOGL", "quantity": 50, "side": "long"},
            {"symbol": "MSFT", "quantity": -25, "side": "short"},
        ]
    }

@app.get("/mcp/orders")
async def get_orders(token: Optional[str] = None):
    """Mock orders endpoint - returns sample order data"""
    if not token or token not in VALID_TOKENS:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing token"
        )
    
    return {
        "orders": [
            {
                "id": "mock_order_1",
                "symbol": "AAPL",
                "side": "buy",
                "quantity": 10,
                "price": 150.0,
                "status": "completed"
            },
            {
                "id": "mock_order_2", 
                "symbol": "TSLA",
                "side": "sell",
                "quantity": 5,
                "price": 800.0,
                "status": "pending"
            }
        ]
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 9000))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )