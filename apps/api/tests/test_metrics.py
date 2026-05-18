"""
Tests for the /api/v1/metrics/dashboard endpoint.
Verifies the endpoint returns the correct shape with real (seeded) data.
The p95 latency falls back to the Python implementation under SQLite.
"""
import pytest


TRACE_BASE = {
    "model": "gpt-4o",
    "provider": "openai",
    "run_type": "rag",
    "environment": "development",
    "total_tokens": 400,
    "latency_ms": 1200,
    "estimated_cost_usd": 0.00240,
}


async def _create_trace(client, run_id: str, status: str, **kwargs):
    payload = {
        "run_id": run_id,
        "user_query": "Test query for metrics",
        "status": status,
        **TRACE_BASE,
        **kwargs,
    }
    resp = await client.post("/api/v1/traces", json=payload)
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_dashboard_empty(client):
    """Dashboard should return valid zero-state when no traces exist."""
    response = await client.get("/api/v1/metrics/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_runs" in data
    assert "runs_by_status" in data
    assert "recent_failures" in data
    assert "hallucination_counts" in data


@pytest.mark.asyncio
async def test_dashboard_with_data(client):
    """Dashboard counts should reflect seeded traces."""
    await _create_trace(client, "metrics_test_001", "success")
    await _create_trace(client, "metrics_test_002", "error",
                        error_message="Tool failed", latency_ms=5000)
    await _create_trace(client, "metrics_test_003", "timeout",
                        error_message="Timed out", latency_ms=30000)

    response = await client.get("/api/v1/metrics/dashboard")
    assert response.status_code == 200
    data = response.json()

    assert data["total_runs"] >= 3
    assert data["successful_runs"] >= 1
    assert data["failed_runs"] >= 1
    assert data["timeout_runs"] >= 1
    assert data["total_tokens"] >= 1200
    assert data["avg_latency_ms"] is not None
    # p95 should be present (Python fallback handles SQLite)
    assert data["p95_latency_ms"] is not None
    assert len(data["recent_failures"]) >= 1
