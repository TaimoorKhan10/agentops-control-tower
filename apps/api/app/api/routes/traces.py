"""Trace routes — list, detail, create, delete."""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.trace import TraceCreate, TraceRead, TraceListResponse
from app.services import trace_service

router = APIRouter(prefix="/traces", tags=["traces"])


@router.get("", response_model=TraceListResponse)
async def list_traces(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    status: str | None = None,
    model: str | None = None,
    provider: str | None = None,
    run_type: str | None = None,
    environment: str | None = None,
    prompt_version_id: uuid.UUID | None = None,
    hallucination_risk: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await trace_service.list_traces(
        db,
        page=page,
        page_size=page_size,
        status=status,
        model=model,
        provider=provider,
        run_type=run_type,
        environment=environment,
        prompt_version_id=prompt_version_id,
        hallucination_risk=hallucination_risk,
        search=search,
    )


@router.post("", response_model=TraceRead, status_code=201)
async def create_trace(data: TraceCreate, db: AsyncSession = Depends(get_db)):
    """Create a trace. Used by the demo RAG app and the /ingest/trace endpoint."""
    return await trace_service.create_trace(db, data)


@router.get("/{trace_id}", response_model=TraceRead)
async def get_trace(trace_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await trace_service.get_trace(db, trace_id)


@router.delete("/{trace_id}", status_code=204)
async def delete_trace(trace_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await trace_service.delete_trace(db, trace_id)
