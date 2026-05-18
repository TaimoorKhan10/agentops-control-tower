"""
Application configuration via pydantic-settings.
All values are read from environment variables or the .env file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://agentops:agentops@localhost:5432/agentops"
    database_url_sync: str = "postgresql+psycopg2://agentops:agentops@localhost:5432/agentops"

    # App
    app_name: str = "AgentOps Control Tower"
    app_version: str = "0.1.0"
    debug: bool = False
    # CORS — covers common Next.js dev ports (3000, 3001, 3002).
    # Override via CORS_ORIGINS env var in production.
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ]

    # OpenAI (optional — used by demo RAG app)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Evaluation
    # In v1, scoring is deterministic (keyword overlap + length heuristics).
    # This flag is a placeholder for switching to LLM-as-judge in v2.
    use_llm_evaluator: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
