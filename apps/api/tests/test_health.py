"""Tests for the /api/v1/health endpoints."""
import pytest


@pytest.mark.asyncio
async def test_liveness(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_db_readiness(client):
    response = await client.get("/api/v1/health/db")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
