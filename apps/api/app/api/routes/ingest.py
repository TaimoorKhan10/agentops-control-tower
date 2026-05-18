"""
Ingest route — receives traces from the demo RAG app.
Automatically triggers evaluation after ingestion.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.trace import TraceCreate, TraceRead
from app.services import trace_service, eval_service

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/trace", response_model=TraceRead, status_code=201)
async def ingest_trace(data: TraceCreate, db: AsyncSession = Depends(get_db)):
    """
    Ingest a trace from an external system (e.g. the demo RAG app).
    Automatically runs deterministic evaluation after creation.
    """
    trace = await trace_service.create_trace(db, data)

    # Auto-evaluate — errors here are non-fatal; trace is still persisted
    try:
        await eval_service.run_evaluation(db, trace.id)
    except Exception:
        pass  # Evaluation is best-effort; log in production

    # Reload with relationships populated
    return await trace_service.get_trace(db, trace.id)
