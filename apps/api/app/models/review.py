"""
Review model — stores human reviewer feedback on a Trace.
One review per trace (enforced via UNIQUE constraint on trace_id).
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("traces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Verdict: good | bad | needs_improvement
    verdict: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Whether this review has been promoted to a regression test case
    promoted_to_regression: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationship
    trace: Mapped["Trace"] = relationship("Trace", back_populates="review")  # noqa: F821
