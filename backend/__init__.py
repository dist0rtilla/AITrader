"""Backend package initializer.

This file makes `backend` a Python package so modules like
`backend.main` can perform relative imports and be importable by uvicorn.
"""

__all__ = ["main", "ws_broadcaster", "api"]
