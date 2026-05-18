"""
PromptVersion model — tracks every system prompt version that has been deployed.
Allows traces to be linked back to the exact prompt that was active when they ran.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Human-readable label: "v1.0", "v1.2-context-injection"
    version_label: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The actual prompt template
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)

    # Only one version should be active at a time
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
