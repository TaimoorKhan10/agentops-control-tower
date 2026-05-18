"""Prompt version service — CRUD and activation management."""
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PromptVersionNotFound
from app.models.prompt_version import PromptVersion
from app.schemas.prompt import PromptVersionCreate, PromptVersionActivateResponse


async def list_prompt_versions(db: AsyncSession) -> list[PromptVersion]:
    result = await db.execute(select(PromptVersion).order_by(PromptVersion.created_at.desc()))
    return list(result.scalars().all())


async def get_prompt_version(db: AsyncSession, version_id: uuid.UUID) -> PromptVersion:
    result = await db.execute(select(PromptVersion).where(PromptVersion.id == version_id))
    pv = result.scalar_one_or_none()
    if not pv:
        raise PromptVersionNotFound(str(version_id))
    return pv


async def create_prompt_version(db: AsyncSession, data: PromptVersionCreate) -> PromptVersion:
    pv = PromptVersion(**data.model_dump())
    db.add(pv)
    await db.flush()
    await db.refresh(pv)
    return pv


async def activate_prompt_version(
    db: AsyncSession, version_id: uuid.UUID
) -> PromptVersionActivateResponse:
    # Fetch all currently active versions to deactivate them
    active_result = await db.execute(
        select(PromptVersion.id).where(PromptVersion.is_active.is_(True))
    )
    previously_active = [row[0] for row in active_result.all() if row[0] != version_id]

    # Deactivate all
    await db.execute(update(PromptVersion).values(is_active=False))

    # Activate the target
    target = await get_prompt_version(db, version_id)
    target.is_active = True
    await db.flush()

    return PromptVersionActivateResponse(
        activated=version_id,
        deactivated=previously_active,
    )
