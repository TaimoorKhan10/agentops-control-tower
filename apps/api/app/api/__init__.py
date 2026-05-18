"""API router — registers all route modules under /api/v1."""
from fastapi import APIRouter

from app.api.routes import health, metrics, traces, evaluations, reviews, regression, prompts, ingest

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(metrics.router)
api_router.include_router(traces.router)
api_router.include_router(evaluations.router)
api_router.include_router(reviews.router)
api_router.include_router(regression.router)
api_router.include_router(prompts.router)
api_router.include_router(ingest.router)
