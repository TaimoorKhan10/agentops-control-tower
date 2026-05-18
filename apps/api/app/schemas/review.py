"""
Pydantic schemas for Review (human feedback on a Trace).
"""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ReviewBase(BaseModel):
    verdict: Literal["good", "bad", "needs_improvement"]
    reviewer_notes: str | None = None


class ReviewCreate(ReviewBase):
    trace_id: uuid.UUID


class ReviewUpdate(BaseModel):
    verdict: Literal["good", "bad", "needs_improvement"] | None = None
    reviewer_notes: str | None = None
    promoted_to_regression: bool | None = None


class ReviewRead(ReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    trace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    promoted_to_regression: bool


class PendingReviewItem(BaseModel):
    """A trace that has no human review yet — used by the review queue endpoint."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: str
    created_at: datetime
    user_query: str
    status: str
    hallucination_risk: str | None = None
    groundedness: float | None = None
