"""
Database initialization helper.
Creates all tables on startup if they don't exist.
In production, use Alembic migrations instead of create_all.
"""
from app.db.base import Base
from app.db.session import engine

# Import all models so SQLAlchemy knows about them before create_all
from app.models import trace, evaluation, review, regression_case, prompt_version  # noqa: F401


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
