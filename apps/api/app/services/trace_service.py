"""
Trace service — CRUD and filtering for the Trace entity.
Pagination uses offset/limit. Filtering is additive (all filters AND-ed).
"""
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import TraceNotFound
from app.models.trace import Trace
from app.models.evaluation import Evaluation
from app.models.review import Review
from app.schemas.trace import TraceCreate, TraceSummary, TraceListResponse


async def list_traces(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    status: str | None = None,
    model: str | None = None,
    provider: str | None = None,
    run_type: str | None = None,
    environment: str | None = None,
    prompt_version_id: uuid.UUID | None = None,
    hallucination_risk: str | None = None,
    search: str | None = None,
) -> TraceListResponse:
    """Return a paginated, filtered list of traces with denormalized eval/review columns."""
    filters = []
    if status:
        filters.append(Trace.status == status)
    if model:
        filters.append(Trace.model == model)
    if provider:
        filters.append(Trace.provider == provider)
    if run_type:
        filters.append(Trace.run_type == run_type)
    if environment:
        filters.append(Trace.environment == environment)
    if prompt_version_id:
        filters.append(Trace.prompt_version_id == prompt_version_id)
    if search:
        filters.append(Trace.user_query.ilike(f"%{search}%"))

    # Build the base query with left joins to evaluation and review
    base_q = (
        select(
            Trace,
            Evaluation.groundedness,
            Evaluation.hallucination_risk.label("hallucination_risk_eval"),
            Review.verdict.label("review_verdict"),
        )
        .outerjoin(Evaluation, Evaluation.trace_id == Trace.id)
        .outerjoin(Review, Review.trace_id == Trace.id)
        .order_by(Trace.created_at.desc())
    )
    # Apply filters after base query construction to avoid .where() with no args
    if filters:
        base_q = base_q.where(*filters)

    if hallucination_risk:
        base_q = base_q.where(Evaluation.hallucination_risk == hallucination_risk)

    # Total count
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginated data
    data_q = base_q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(data_q)).all()

    items = [
        TraceSummary(
            id=row.Trace.id,
            run_id=row.Trace.run_id,
            created_at=row.Trace.created_at,
            user_query=row.Trace.user_query,
            model=row.Trace.model,
            provider=row.Trace.provider,
            run_type=row.Trace.run_type,
            environment=row.Trace.environment,
            prompt_version_id=row.Trace.prompt_version_id,
            status=row.Trace.status,
            latency_ms=row.Trace.latency_ms,
            total_tokens=row.Trace.total_tokens,
            estimated_cost_usd=float(row.Trace.estimated_cost_usd) if row.Trace.estimated_cost_usd else None,
            groundedness=float(row.groundedness) if row.groundedness else None,
            hallucination_risk=row.hallucination_risk_eval,
            review_verdict=row.review_verdict,
        )
        for row in rows
    ]

    return TraceListResponse(items=items, total=total, page=page, page_size=page_size)


async def get_trace(db: AsyncSession, trace_id: uuid.UUID) -> Trace:
    """Fetch full trace detail including evaluation and review."""
    result = await db.execute(
        select(Trace)
        .options(selectinload(Trace.evaluation), selectinload(Trace.review))
        .where(Trace.id == trace_id)
    )
    trace = result.scalar_one_or_none()
    if not trace:
        raise TraceNotFound(str(trace_id))
    return trace


async def create_trace(db: AsyncSession, data: TraceCreate) -> Trace:
    """Insert a new trace. Called by the demo RAG app and the ingest endpoint."""
    trace = Trace(
        run_id=data.run_id,
        user_query=data.user_query,
        system_prompt=data.system_prompt,
        prompt_version_id=data.prompt_version_id,
        model=data.model,
        provider=data.provider,
        run_type=data.run_type,
        environment=data.environment,
        retrieved_chunks=[c.model_dump() for c in data.retrieved_chunks] if data.retrieved_chunks else None,
        tool_calls=[t.model_dump() for t in data.tool_calls] if data.tool_calls else None,
        final_answer=data.final_answer,
        status=data.status,
        error_message=data.error_message,
        latency_ms=data.latency_ms,
        prompt_tokens=data.prompt_tokens,
        completion_tokens=data.completion_tokens,
        total_tokens=data.total_tokens,
        estimated_cost_usd=data.estimated_cost_usd,
        tags=data.tags,
        trace_metadata=data.trace_metadata,
    )
    db.add(trace)
    await db.flush()
    # Reload with relationships eagerly populated to avoid lazy-load in async context
    return await get_trace(db, trace.id)


async def delete_trace(db: AsyncSession, trace_id: uuid.UUID) -> None:
    trace = await get_trace(db, trace_id)
    await db.delete(trace)
