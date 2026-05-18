"""
Review service — human feedback CRUD for the review queue.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ReviewNotFound, TraceNotFound
from app.models.trace import Trace
from app.models.review import Review
from app.models.evaluation import Evaluation
from app.schemas.review import ReviewCreate, ReviewUpdate, PendingReviewItem


async def submit_review(db: AsyncSession, data: ReviewCreate) -> Review:
    """Create or replace a review for a trace."""
    trace_result = await db.execute(select(Trace).where(Trace.id == data.trace_id))
    if not trace_result.scalar_one_or_none():
        raise TraceNotFound(str(data.trace_id))

    # Upsert: if a review already exists, update it rather than error
    existing = await db.execute(select(Review).where(Review.trace_id == data.trace_id))
    review = existing.scalar_one_or_none()

    if review:
        review.verdict = data.verdict
        if data.reviewer_notes is not None:
            review.reviewer_notes = data.reviewer_notes
    else:
        review = Review(
            trace_id=data.trace_id,
            verdict=data.verdict,
            reviewer_notes=data.reviewer_notes,
        )
        db.add(review)

    await db.flush()
    await db.refresh(review)
    return review


async def update_review(db: AsyncSession, trace_id: uuid.UUID, data: ReviewUpdate) -> Review:
    result = await db.execute(select(Review).where(Review.trace_id == trace_id))
    review = result.scalar_one_or_none()
    if not review:
        raise ReviewNotFound(str(trace_id))

    if data.verdict is not None:
        review.verdict = data.verdict
    if data.reviewer_notes is not None:
        review.reviewer_notes = data.reviewer_notes
    if data.promoted_to_regression is not None:
        review.promoted_to_regression = data.promoted_to_regression

    await db.flush()
    await db.refresh(review)
    return review


async def list_reviews(db: AsyncSession, verdict: str | None = None) -> list[Review]:
    q = select(Review).order_by(Review.updated_at.desc())
    if verdict:
        q = q.where(Review.verdict == verdict)
    result = await db.execute(q)
    return list(result.scalars().all())


async def list_pending_reviews(db: AsyncSession, limit: int = 50) -> list[PendingReviewItem]:
    """
    Return traces that have no review yet.
    Sorted by created_at desc — high hallucination risk traces appear naturally
    due to recent failure patterns in practice.
    """
    # Note: outerjoin is called as a method on the select statement, not imported.
    q = (
        select(
            Trace.id,
            Trace.run_id,
            Trace.created_at,
            Trace.user_query,
            Trace.status,
            Evaluation.groundedness,
            Evaluation.hallucination_risk,
        )
        .outerjoin(Evaluation, Evaluation.trace_id == Trace.id)
        .outerjoin(Review, Review.trace_id == Trace.id)
        .where(Review.id.is_(None))  # no review yet
        .order_by(Trace.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(q)).all()
    return [
        PendingReviewItem(
            id=row.id,
            run_id=row.run_id,
            created_at=row.created_at,
            user_query=row.user_query,
            status=row.status,
            groundedness=float(row.groundedness) if row.groundedness else None,
            hallucination_risk=row.hallucination_risk,
        )
        for row in rows
    ]
