"""Tests for trace creation, retrieval, and filtering."""
import pytest


TRACE_PAYLOAD = {
    "run_id": "test_run_001",
    "user_query": "What is the data retention policy?",
    "model": "gpt-4o",
    "provider": "openai",
    "run_type": "rag",
    "environment": "development",
    "status": "success",
    "final_answer": "Customer data is retained for 36 months.",
    "latency_ms": 1200,
    "prompt_tokens": 400,
    "completion_tokens": 80,
    "total_tokens": 480,
    "estimated_cost_usd": 0.00288,
    "retrieved_chunks": [
        {"content": "Data retained for 36 months per GDPR.", "source": "policy.pdf", "score": 0.91}
    ],
}


@pytest.mark.asyncio
async def test_create_trace(client):
    response = await client.post("/api/v1/traces", json=TRACE_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["run_id"] == "test_run_001"
    assert data["status"] == "success"
    assert data["run_type"] == "rag"
    assert data["environment"] == "development"


@pytest.mark.asyncio
async def test_get_trace(client):
    create = await client.post("/api/v1/traces", json={**TRACE_PAYLOAD, "run_id": "test_run_002"})
    trace_id = create.json()["id"]
    response = await client.get(f"/api/v1/traces/{trace_id}")
    assert response.status_code == 200
    assert response.json()["id"] == trace_id


@pytest.mark.asyncio
async def test_list_traces(client):
    response = await client.get("/api/v1/traces?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_list_traces_filter_status(client):
    response = await client.get("/api/v1/traces?status=success")
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["status"] == "success"


@pytest.mark.asyncio
async def test_trace_not_found(client):
    response = await client.get("/api/v1/traces/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
