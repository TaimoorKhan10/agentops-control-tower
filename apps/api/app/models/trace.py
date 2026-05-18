"""
Trace model — the central entity in AgentOps Control Tower.
Every AI invocation (RAG query, agent run, LLM call) produces one Trace.

Fields `run_type` and `environment` allow filtering across different
execution contexts. Future: traces will also support child spans
(see docs/roadmap.md — trace_spans table design).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, DialectJSON


class Trace(Base):
    __tablename__ = "traces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Execution context
    # run_type: rag | agent | chat | regression | evaluation
    run_type: Mapped[str] = mapped_column(String(16), nullable=False, default="rag", index=True)
    # environment: development | staging | production
    environment: Mapped[str] = mapped_column(
        String(16), nullable=False, default="development", index=True
    )

    # Query and prompt
    user_query: Mapped[str] = mapped_column(Text, nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # Model and provider
    model: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    # RAG context and tool calls (stored as JSONB for flexibility)
    retrieved_chunks: Mapped[list | None] = mapped_column(DialectJSON, nullable=True)
    tool_calls: Mapped[list | None] = mapped_column(DialectJSON, nullable=True)

    # Output
    final_answer: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status: success | error | timeout
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Performance
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Flexible metadata
    tags: Mapped[list | None] = mapped_column(DialectJSON, nullable=True)
    trace_metadata: Mapped[dict | None] = mapped_column("trace_metadata", DialectJSON, nullable=True)

    # Relationships
    evaluation: Mapped["Evaluation"] = relationship(  # noqa: F821
        "Evaluation", back_populates="trace", uselist=False, cascade="all, delete-orphan"
    )
    review: Mapped["Review"] = relationship(  # noqa: F821
        "Review", back_populates="trace", uselist=False, cascade="all, delete-orphan"
    )
