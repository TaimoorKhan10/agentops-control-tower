"""Review routes — human feedback queue."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.review import ReviewCreate, ReviewRead, ReviewUpdate, PendingReviewItem
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewRead])
async def list_reviews(
    verdict: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.list_reviews(db, verdict)


@router.get("/pending", response_model=list[PendingReviewItem])
async def list_pending(db: AsyncSession = Depends(get_db)):
    """Traces awaiting human review — sorted by recency."""
    return await review_service.list_pending_reviews(db)


@router.post("/{trace_id}", response_model=ReviewRead, status_code=201)
async def submit_review(
    trace_id: uuid.UUID,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
):
    data.trace_id = trace_id
    return await review_service.submit_review(db, data)


@router.patch("/{trace_id}", response_model=ReviewRead)
async def update_review(
    trace_id: uuid.UUID,
    data: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.update_review(db, trace_id, data)
