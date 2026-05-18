"""
Pydantic schemas for Evaluation.

The `evaluator` field records which scoring system produced these results.
In v1: "deterministic-v1" — keyword overlap + length heuristics.
In v2+: "llm-judge-gpt4o" or similar — swap in eval_service.py without API changes.
"""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EvaluationBase(BaseModel):
    groundedness: float | None = Field(default=None, ge=0.0, le=1.0)
    context_relevance: float | None = Field(default=None, ge=0.0, le=1.0)
    answer_completeness: float | None = Field(default=None, ge=0.0, le=1.0)
    citation_support: float | None = Field(default=None, ge=0.0, le=1.0)
    hallucination_risk: Literal["low", "medium", "high"] | None = None
    evaluator: str = "deterministic-v1"
    notes: str | None = None


class EvaluationCreate(EvaluationBase):
    trace_id: uuid.UUID


class EvaluationRead(EvaluationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    trace_id: uuid.UUID
    created_at: datetime


class EvaluationTriggerResponse(BaseModel):
    """Returned when a client triggers evaluation on a trace."""
    trace_id: uuid.UUID
    evaluation: EvaluationRead
    triggered_by: str = "api"
