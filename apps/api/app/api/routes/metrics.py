"""Dashboard metrics route."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.metrics import DashboardMetrics
from app.services import metrics_service

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """Return all KPIs for the main dashboard. All values computed from real DB data."""
    return await metrics_service.get_dashboard_metrics(db)
