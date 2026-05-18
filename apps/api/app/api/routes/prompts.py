"""Prompt version management routes."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.prompt import PromptVersionCreate, PromptVersionRead, PromptVersionActivateResponse
from app.services import prompt_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptVersionRead])
async def list_versions(db: AsyncSession = Depends(get_db)):
    return await prompt_service.list_prompt_versions(db)


@router.post("", response_model=PromptVersionRead, status_code=201)
async def create_version(data: PromptVersionCreate, db: AsyncSession = Depends(get_db)):
    return await prompt_service.create_prompt_version(db, data)


@router.get("/{version_id}", response_model=PromptVersionRead)
async def get_version(version_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await prompt_service.get_prompt_version(db, version_id)


@router.patch("/{version_id}/activate", response_model=PromptVersionActivateResponse)
async def activate_version(version_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Set this version as active. Deactivates all other versions."""
    return await prompt_service.activate_prompt_version(db, version_id)
