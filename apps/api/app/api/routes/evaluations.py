"""Evaluation routes."""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.evaluation import EvaluationRead, EvaluationTriggerResponse
from app.services import eval_service

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("", response_model=list[EvaluationRead])
async def list_evaluations(
    hallucination_risk: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await eval_service.list_evaluations(db, hallucination_risk, page, page_size)


@router.get("/{trace_id}", response_model=EvaluationRead)
async def get_evaluation(trace_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await eval_service.get_evaluation_by_trace(db, trace_id)


@router.post("/{trace_id}/run", response_model=EvaluationTriggerResponse)
async def trigger_evaluation(trace_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Run the evaluation pipeline on a specific trace and persist the result."""
    evaluation = await eval_service.run_evaluation(db, trace_id)
    return EvaluationTriggerResponse(trace_id=trace_id, evaluation=evaluation)
