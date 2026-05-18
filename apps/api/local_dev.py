"""
Local development bootstrap — runs FastAPI with SQLite.
Use this when Docker/PostgreSQL is not available.

Usage (from apps/api/):
    python local_dev.py

This will:
1. Point the app at a local SQLite file (agentops_dev.db)
2. Create all tables
3. Seed realistic demo data
4. Start Uvicorn on port 8000

The CORS origin http://localhost:3000 is pre-configured in the app for
the Next.js frontend. No further configuration needed for local development.
"""
import asyncio
import os

# Override DB URLs before any app imports so the engine picks them up
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./agentops_dev.db"
os.environ["DATABASE_URL_SYNC"] = "sqlite:///./agentops_dev.db"
os.environ.setdefault("DEBUG", "true")


async def _bootstrap() -> None:
    from app.db.init_db import init_db
    from app.db.session import AsyncSessionLocal
    from app.seed.seed import seed

    print("[*] Creating SQLite tables...")
    await init_db()

    print("[*] Seeding demo data...")
    async with AsyncSessionLocal() as db:
        await seed(db)

    print("[*] Bootstrap complete.\n")


if __name__ == "__main__":
    asyncio.run(_bootstrap())

    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
