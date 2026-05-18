"""
Pydantic schemas for RegressionCase.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class RegressionCaseBase(BaseModel):
    name: str
    user_query: str
    expected_behavior: str
    reference_context: list[dict[str, Any]] | None = None
    tags: list[str] | None = None
    prompt_version_a: uuid.UUID | None = None
    prompt_version_b: uuid.UUID | None = None


class RegressionCaseCreate(RegressionCaseBase):
    source_trace_id: uuid.UUID | None = None


class RegressionCaseRead(RegressionCaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    source_trace_id: uuid.UUID | None = None
    comparison_result: dict[str, Any] | None = None


class CompareRequest(BaseModel):
    """Request body for the A/B comparison endpoint."""
    prompt_version_a: uuid.UUID
    prompt_version_b: uuid.UUID


class CompareResult(BaseModel):
    """
    Result of comparing prompt version A vs B on a regression case.

    In v1, comparison uses deterministic mock scoring.
    The structure is designed to accept real LLM execution results in v2.
    """
    case_id: uuid.UUID
    prompt_version_a: uuid.UUID
    prompt_version_b: uuid.UUID
    result_a: dict[str, Any]
    result_b: dict[str, Any]
    winner: str | None  # "a" | "b" | "tie" | null if inconclusive
    comparison_method: str  # "deterministic-mock-v1" in MVP
    notes: str | None = None
