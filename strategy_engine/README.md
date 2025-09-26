Strategy Engine

This service receives pattern signals and sentiment inputs and computes weighted
trading decisions. It also accepts reward submissions which update an in-memory
leaderboard used to evaluate strategy/model performance.

Endpoints:
- POST /decide -> returns a list of decisions per symbol
- POST /submit_reward?symbol=...&model=...&reward=... -> submit reward for a model and symbol
- GET /leaderboard -> returns top performing (model,symbol) pairs
- GET /health -> health check

Usage (local):

```bash
# run locally
PYTHONPATH=. uvicorn strategy_engine.app:app --reload --port 8082

# call decide
curl -X POST http://localhost:8082/decide -H 'Content-Type: application/json' -d '{"signals":[{"symbol":"AAPL","score":0.8}]}'
```

Notes:
- This is an initial scaffold. In production you should persist rewards and leaderboard
  to a database and secure endpoints with auth.
- The `forward_to_execution` helper can call an execution engine at `/execute`.
