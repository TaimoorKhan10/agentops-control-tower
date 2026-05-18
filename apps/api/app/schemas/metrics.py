"""
Pydantic schemas for the /metrics/dashboard endpoint.
All fields are aggregated from real DB data — no hardcoded values.
"""
from pydantic import BaseModel


class StatusBreakdown(BaseModel):
    success: int
    error: int
    timeout: int


class HallucinationBreakdown(BaseModel):
    low: int
    medium: int
    high: int


class RecentFailure(BaseModel):
    run_id: str
    user_query: str
    status: str
    error_message: str | None
    latency_ms: int | None
    created_at: str  # ISO string for JSON serialization


class DashboardMetrics(BaseModel):
    # Run counts
    total_runs: int
    successful_runs: int
    failed_runs: int
    timeout_runs: int

    # Latency (ms)
    avg_latency_ms: float | None
    p95_latency_ms: float | None

    # Cost & tokens
    total_estimated_cost_usd: float
    total_tokens: int

    # Evaluation
    avg_groundedness: float | None
    hallucination_counts: HallucinationBreakdown

    # Status breakdown (for chart)
    runs_by_status: StatusBreakdown

    # Recent failures (last 5)
    recent_failures: list[RecentFailure]
