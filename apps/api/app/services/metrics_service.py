"""
Metrics service — computes all dashboard KPIs from real DB data.
Pure aggregation logic, no business rules mixed in.

NOTE on p95 latency:
  func.percentile_cont() is PostgreSQL-only. For tests using SQLite we fall
  back to a Python-side approximation over the raw latency values.
  In production (PostgreSQL) the SQL-native percentile is always used.
"""
from sqlalchemy import func, select, cast, Float, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trace import Trace
from app.models.evaluation import Evaluation
from app.schemas.metrics import DashboardMetrics, HallucinationBreakdown, RecentFailure, StatusBreakdown


def _p95_python(values: list[float]) -> float | None:
    """Fallback p95 calculation in Python for non-PostgreSQL backends (e.g. SQLite in tests)."""
    if not values:
        return None
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * 0.95)
    return float(sorted_vals[min(idx, len(sorted_vals) - 1)])


async def _get_p95_latency(db: AsyncSession) -> float | None:
    """
    Attempt PostgreSQL percentile_cont. On failure (e.g. SQLite in tests),
    fall back to Python-side p95 over all latency values.
    """
    try:
        row = await db.execute(
            select(
                func.percentile_cont(0.95)
                .within_group(Trace.latency_ms)
                .label("p95")
            ).where(Trace.latency_ms.isnot(None))
        )
        result = row.scalar_one_or_none()
        return float(result) if result is not None else None
    except Exception:
        # SQLite and other non-PG backends don't support percentile_cont.
        # Fetch all latency values and compute in Python.
        rows = await db.execute(
            select(Trace.latency_ms).where(Trace.latency_ms.isnot(None))
        )
        values = [float(r[0]) for r in rows.all()]
        return _p95_python(values)


async def get_dashboard_metrics(db: AsyncSession) -> DashboardMetrics:
    # --- Run counts by status ---
    status_rows = await db.execute(
        select(Trace.status, func.count(Trace.id).label("count"))
        .group_by(Trace.status)
    )
    status_map: dict[str, int] = {row.status: row.count for row in status_rows}

    total = sum(status_map.values())
    success = status_map.get("success", 0)
    error = status_map.get("error", 0)
    timeout = status_map.get("timeout", 0)

    # --- Average latency ---
    avg_row = await db.execute(
        select(func.avg(cast(Trace.latency_ms, Float)).label("avg_latency"))
        .where(Trace.latency_ms.isnot(None))
    )
    avg_latency = avg_row.scalar_one_or_none()

    # --- P95 latency (PostgreSQL-native with Python fallback) ---
    p95_latency = await _get_p95_latency(db)

    # --- Cost & tokens ---
    agg_row = await db.execute(
        select(
            func.coalesce(func.sum(cast(Trace.estimated_cost_usd, Float)), 0.0).label("total_cost"),
            func.coalesce(func.sum(Trace.total_tokens), 0).label("total_tokens"),
        )
    )
    agg = agg_row.one()

    # --- Evaluation averages ---
    eval_row = await db.execute(
        select(func.avg(cast(Evaluation.groundedness, Float)).label("avg_groundedness"))
    )
    avg_groundedness = eval_row.scalar_one_or_none()

    # --- Hallucination risk breakdown ---
    hall_rows = await db.execute(
        select(Evaluation.hallucination_risk, func.count(Evaluation.id).label("count"))
        .where(Evaluation.hallucination_risk.isnot(None))
        .group_by(Evaluation.hallucination_risk)
    )
    hall_map: dict[str, int] = {row.hallucination_risk: row.count for row in hall_rows}

    # --- Recent failures (last 5) ---
    failure_rows = await db.execute(
        select(Trace)
        .where(Trace.status.in_(["error", "timeout"]))
        .order_by(Trace.created_at.desc())
        .limit(5)
    )
    failures = failure_rows.scalars().all()

    return DashboardMetrics(
        total_runs=total,
        successful_runs=success,
        failed_runs=error,
        timeout_runs=timeout,
        avg_latency_ms=round(float(avg_latency), 1) if avg_latency is not None else None,
        p95_latency_ms=round(p95_latency, 1) if p95_latency is not None else None,
        total_estimated_cost_usd=round(float(agg.total_cost), 4),
        total_tokens=int(agg.total_tokens),
        avg_groundedness=round(float(avg_groundedness), 3) if avg_groundedness is not None else None,
        hallucination_counts=HallucinationBreakdown(
            low=hall_map.get("low", 0),
            medium=hall_map.get("medium", 0),
            high=hall_map.get("high", 0),
        ),
        runs_by_status=StatusBreakdown(success=success, error=error, timeout=timeout),
        recent_failures=[
            RecentFailure(
                run_id=t.run_id,
                user_query=t.user_query[:120],
                status=t.status,
                error_message=t.error_message,
                latency_ms=t.latency_ms,
                created_at=t.created_at.isoformat(),
            )
            for t in failures
        ],
    )
