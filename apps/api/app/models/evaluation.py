"""
Evaluation model — stores structured quality scores for a Trace.

NOTE on scoring methodology:
In v1, all scores are produced by a deterministic heuristic evaluator
(see services/eval_service.py). The interface mirrors what an LLM-as-judge
would return so that upgrading to real evaluation in v2 is a drop-in swap.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

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

    # Scores — all on a 0.0–1.0 scale
    groundedness: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    context_relevance: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    answer_completeness: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    citation_support: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)

    # Hallucination risk: low | medium | high
    hallucination_risk: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)

    # Which evaluator produced these scores
    evaluator: Mapped[str] = mapped_column(String(32), nullable=False, default="deterministic-v1")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    trace: Mapped["Trace"] = relationship("Trace", back_populates="evaluation")  # noqa: F821
