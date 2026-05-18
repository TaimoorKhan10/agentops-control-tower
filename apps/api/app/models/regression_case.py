"""
RegressionCase model — stores test cases for prompt regression testing.
Cases can be created manually or promoted from a reviewed Trace.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, DialectJSON


class RegressionCase(Base):
    __tablename__ = "regression_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    user_query: Mapped[str] = mapped_column(Text, nullable=False)
    expected_behavior: Mapped[str] = mapped_column(Text, nullable=False)

    # Reference context chunks (list of {content, source})
    reference_context: Mapped[list | None] = mapped_column(DialectJSON, nullable=True)

    tags: Mapped[list | None] = mapped_column(DialectJSON, nullable=True)

    # Origin: which trace this was promoted from (null if manually created)
    source_trace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("traces.id", ondelete="SET NULL"),
        nullable=True,
    )

    # A/B prompt comparison fields
    prompt_version_a: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prompt_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt_version_b: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prompt_versions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Result of A/B comparison run — null until compare endpoint is called
    comparison_result: Mapped[dict | None] = mapped_column(DialectJSON, nullable=True)
