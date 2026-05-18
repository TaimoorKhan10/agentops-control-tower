"""Regression test case routes."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.regression import RegressionCaseCreate, RegressionCaseRead, CompareRequest, CompareResult
from app.services import regression_service

router = APIRouter(prefix="/regression", tags=["regression"])


@router.get("", response_model=list[RegressionCaseRead])
async def list_cases(db: AsyncSession = Depends(get_db)):
    return await regression_service.list_regression_cases(db)


@router.post("", response_model=RegressionCaseRead, status_code=201)
async def create_case(data: RegressionCaseCreate, db: AsyncSession = Depends(get_db)):
    return await regression_service.create_regression_case(db, data)


@router.get("/{case_id}", response_model=RegressionCaseRead)
async def get_case(case_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await regression_service.get_regression_case(db, case_id)


@router.post("/{case_id}/compare", response_model=CompareResult)
async def compare(
    case_id: uuid.UUID,
    data: CompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run A/B prompt comparison on a regression case (deterministic mock in v1)."""
    return await regression_service.run_comparison(
        db, case_id, data.prompt_version_a, data.prompt_version_b
    )
