"""
Pydantic schemas for Trace — request/response contracts for the API.

Separation from SQLAlchemy models is intentional:
- Models own persistence concerns (column types, FK constraints, indexes)
- Schemas own serialization concerns (field aliases, response shaping, validation)

Note on metadata: the field is named `trace_metadata` throughout to avoid
collision with SQLAlchemy's DeclarativeBase.metadata class attribute.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Sub-schemas for JSONB fields
# ---------------------------------------------------------------------------

class RetrievedChunk(BaseModel):
    content: str
    source: str
    score: float | None = None
    chunk_index: int | None = None


class ToolCall(BaseModel):
    name: str
    input: dict[str, Any] | None = None
    output: Any | None = None
    latency_ms: int | None = None
    status: str | None = None  # success | error


# ---------------------------------------------------------------------------
# Core trace schemas
# ---------------------------------------------------------------------------

class TraceBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_query: str
    system_prompt: str | None = None
    prompt_version_id: uuid.UUID | None = None
    model: str
    provider: str
    run_type: str = Field(default="rag", pattern="^(rag|agent|chat|regression|evaluation)$")
    environment: str = Field(default="development", pattern="^(development|staging|production)$")
    retrieved_chunks: list[RetrievedChunk] | None = None
    tool_calls: list[ToolCall] | None = None
    final_answer: str | None = None
    status: str = Field(pattern="^(success|error|timeout)$")
    error_message: str | None = None
    latency_ms: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    estimated_cost_usd: float | None = None
    tags: list[str] | None = None
    # Named trace_metadata to avoid collision with SQLAlchemy Base.metadata
    trace_metadata: dict[str, Any] | None = None


class TraceCreate(TraceBase):
    run_id: str = Field(max_length=64)


class TraceUpdate(BaseModel):
    """Partial update — only status and error fields are mutable post-creation."""
    status: str | None = Field(default=None, pattern="^(success|error|timeout)$")
    error_message: str | None = None
    final_answer: str | None = None
    latency_ms: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    estimated_cost_usd: float | None = None


class TraceRead(TraceBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    run_id: str
    created_at: datetime

    # Nested evaluation/review — must be eagerly loaded before serialization
    evaluation: "EvaluationRead | None" = None
    review: "ReviewRead | None" = None


class TraceSummary(BaseModel):
    """Compact representation for the trace list/table view."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    run_id: str
    created_at: datetime
    user_query: str
    model: str
    provider: str
    run_type: str
    environment: str
    prompt_version_id: uuid.UUID | None = None
    status: str
    latency_ms: int | None = None
    total_tokens: int | None = None
    estimated_cost_usd: float | None = None

    # Denormalised evaluation fields for the table row (joined at query time)
    groundedness: float | None = None
    hallucination_risk: str | None = None

    # Review status
    review_verdict: str | None = None


class TraceListResponse(BaseModel):
    items: list[TraceSummary]
    total: int
    page: int
    page_size: int


# Avoid circular import — resolved after EvaluationRead/ReviewRead are defined
from app.schemas.evaluation import EvaluationRead  # noqa: E402
from app.schemas.review import ReviewRead  # noqa: E402

TraceRead.model_rebuild()
