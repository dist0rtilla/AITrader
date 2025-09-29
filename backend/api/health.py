from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import httpx
import os
from datetime import datetime
from typing import Optional
import re

router = APIRouter(prefix="/api")


async def _probe(url: str, timeout: float = 2.0) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=timeout) as c:
            r = await c.get(url)
            r.raise_for_status()
            data = r.json() if r.text else {}
            return {"ok": True, "details": data}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/status")
async def get_system_status() -> Dict[str, Any]:
    """Return a SystemStatus-like snapshot for the frontend.

    Aggregates lightweight /health probes from known services (configurable via
    environment or defaults). For unavailable services we return a not-ok entry
    and rely on the frontend fixture fallback to keep the UI usable.
    """
    # Canonical service host:port mappings used in docs/docker-compose.
    # We allow overriding via environment variables for flexible deployments.
    services = {
        # main API
        "backend": os.getenv("BACKEND_HOST", "localhost:8000"),
        # ML runtimes
        "onnx_runner": os.getenv("ONNX_HOST", "localhost:8001"),
        "sentiment_engine": os.getenv("SENTIMENT_HOST", "localhost:8002"),
        # FinBERT may be exposed at 8004 in compose, but the Flask app defaults to 5000.
        "finbert_server_8004": os.getenv("FINBERT_HOST", "localhost:8004"),
        "finbert_server_5000": os.getenv("FINBERT_LEGACY_HOST", "localhost:5000"),
        # Strategy/Pattern/Mock
        "strategy_engine": os.getenv("STRATEGY_HOST", "localhost:8005"),
        "pattern_engine": os.getenv("PATTERN_HOST", "localhost:8005"),
        "mock_mcp": os.getenv("MOCK_MCP_HOST", "localhost:9000"),
    }

    components: List[Dict[str, Any]] = []
    # Probe each service and normalize component ids expected by the frontend.
    finbert_found: Optional[Dict[str, Any]] = None
    for comp, host in services.items():
        probe_url = f"http://{host}/health"
        result = await _probe(probe_url)

        # Special handling: merge finbert candidates into a single frontend component
        if comp.startswith("finbert_server_"):
            if result.get("ok") and finbert_found is None:
                finbert_found = {"id": "finbert", "name": "Finbert", "status": "ok", "details": result.get("details")}
            # don't append per-candidate entry
            continue

        # Map some internal keys to frontend-friendly ids/names
        frontend_id = comp
        if comp == "onnx_runner":
            frontend_id = "onnx-runner"
        if comp == "mock_mcp":
            frontend_id = "mcp"

        components.append({
            "id": frontend_id,
            "name": frontend_id.replace("_", " ").replace("-", " ").title(),
            "status": "ok" if result.get("ok") else "error",
            "details": result.get("details") or result.get("error") or "no details",
        })

    # If any finbert candidate succeeded, add a single finbert component; otherwise add a not-ok finbert entry
    if finbert_found:
        components.append(finbert_found)
    else:
        components.append({"id": "finbert", "name": "Finbert", "status": "error", "details": "no finbert servers reachable"})

    return {"timestamp": datetime.utcnow().isoformat() + "Z", "components": components}


@router.get("/components/{component_id}/metrics")
async def get_component_metrics(component_id: str):
    """Return a tiny metrics blob for a component. Placeholder implementation.

    In a production setup this would query Prometheus, the component's /metrics
    endpoint, or an internal metrics store.
    """
    # Map component ids to candidate host:port used above
    mapping = {
        "backend": os.getenv("BACKEND_HOST", "localhost:8000"),
        "onnx-runner": os.getenv("ONNX_HOST", "localhost:8001"),
        "sentiment_engine": os.getenv("SENTIMENT_HOST", "localhost:8002"),
        "finbert": os.getenv("FINBERT_HOST", os.getenv("FINBERT_LEGACY_HOST", "localhost:8004")),
        "strategy_engine": os.getenv("STRATEGY_HOST", "localhost:8005"),
        "pattern_engine": os.getenv("PATTERN_HOST", "localhost:8005"),
        "mcp": os.getenv("MOCK_MCP_HOST", "localhost:9000"),
    }

    host = mapping.get(component_id)
    if host is None:
        # fallback: return empty metrics with timestamp
        return {"component": component_id, "metrics": {}, "timestamp": datetime.utcnow().isoformat() + "Z"}

    metrics_url = f"http://{host}/metrics"
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(metrics_url)
            r.raise_for_status()
            text = r.text
    except Exception:
        # metrics endpoint not available — fall back to health probe details (if available)
        health = await _probe(f"http://{host}/health")
        fallback_metrics = {
            "uptime": None,
            "status_ok": health.get("ok", False),
            "details": health.get("details") or health.get("error"),
        }
        return {"component": component_id, "metrics": fallback_metrics, "timestamp": datetime.utcnow().isoformat() + "Z"}

    # Parse a few Prometheus-style metrics from the text body (simple regex; not a full parser)
    def _extract_metric(name: str) -> Optional[float]:
        m = re.search(rf"^{re.escape(name)}\s+([0-9]+(?:\.[0-9]+)?)$", text, flags=re.M)
        if m:
            try:
                return float(m.group(1))
            except Exception:
                return None
        return None

    parsed = {
        "process_resident_memory_bytes": _extract_metric("process_resident_memory_bytes"),
        "process_cpu_seconds_total": _extract_metric("process_cpu_seconds_total"),
        "http_requests_total": _extract_metric("http_requests_total"),
    }

    # Return parsed metrics with timestamp
    return {"component": component_id, "metrics": parsed, "timestamp": datetime.utcnow().isoformat() + "Z"}


@router.post("/components/{component_id}/restart")
async def restart_component(component_id: str):
    """Attempt to restart a component. Here we only return a placeholder.

    Real implementation would call orchestration tooling or a restart API.
    """
    # Not implemented: return success=false with a message indicating manual action
    return {"success": False, "message": f"Restart for {component_id} not implemented in backend stub."}
