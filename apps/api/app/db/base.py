"""
SQLAlchemy declarative base and shared column type helpers.
All models import Base from here to stay in the same metadata graph.

DialectJSON: Uses PostgreSQL JSONB in production and JSON everywhere else.
This lets tests run against SQLite without requiring PostgreSQL.
"""
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator


class DialectJSON(TypeDecorator):
    """
    Stores JSON data.
    - PostgreSQL: uses JSONB (binary JSON, indexed, queryable)
    - All other backends (SQLite for tests): uses plain JSON
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


class Base(DeclarativeBase):
    pass
