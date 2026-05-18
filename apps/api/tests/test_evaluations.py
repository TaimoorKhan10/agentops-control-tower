"""Tests for evaluation triggering and retrieval."""
import pytest


TRACE = {
    "run_id": "eval_test_001",
    "user_query": "What are the leave policies?",
    "model": "gpt-4o",
    "provider": "openai",
    "run_type": "rag",
    "environment": "development",
    "status": "success",
    "final_answer": "Employees get 16 weeks paid parental leave per the HR handbook.",
    "retrieved_chunks": [
        {"content": "Employees receive 16 weeks of paid parental leave.", "source": "hr-handbook.pdf", "score": 0.95}
    ],
    "latency_ms": 900,
    "total_tokens": 320,
    "estimated_cost_usd": 0.00192,
}


@pytest.mark.asyncio
async def test_trigger_evaluation(client):
    create = await client.post("/api/v1/traces", json=TRACE)
    assert create.status_code == 201
    trace_id = create.json()["id"]

    response = await client.post(f"/api/v1/evaluations/{trace_id}/run")
    assert response.status_code == 200
    data = response.json()
    assert "evaluation" in data
    eval_data = data["evaluation"]
    assert eval_data["evaluator"] == "deterministic-v1"
    assert eval_data["hallucination_risk"] in ("low", "medium", "high")


@pytest.mark.asyncio
async def test_get_evaluation(client):
    create = await client.post("/api/v1/traces", json={**TRACE, "run_id": "eval_test_002"})
    trace_id = create.json()["id"]
    await client.post(f"/api/v1/evaluations/{trace_id}/run")

    response = await client.get(f"/api/v1/evaluations/{trace_id}")
    assert response.status_code == 200
    assert response.json()["trace_id"] == trace_id


@pytest.mark.asyncio
async def test_evaluation_not_found(client):
    response = await client.get("/api/v1/evaluations/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
