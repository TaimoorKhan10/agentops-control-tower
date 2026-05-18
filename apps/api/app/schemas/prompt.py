"""
Pydantic schemas for PromptVersion.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PromptVersionBase(BaseModel):
    version_label: str = Field(max_length=32)
    description: str | None = None
    system_prompt: str
    is_active: bool = False


class PromptVersionCreate(PromptVersionBase):
    pass


class PromptVersionRead(PromptVersionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class PromptVersionActivateResponse(BaseModel):
    activated: uuid.UUID
    deactivated: list[uuid.UUID]
