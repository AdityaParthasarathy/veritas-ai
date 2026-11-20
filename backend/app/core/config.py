"""VERITAS AI - Core Application Configuration.

Loads settings from environment variables or the repository's ``.env`` file using
Pydantic Settings. Secrets are required (no insecure defaults) and are never
exposed in representations.
"""

from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_REPO_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings with validation. Real environment variables win over files."""

    model_config = SettingsConfigDict(
        env_file=(_REPO_ROOT / ".env", _BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application metadata
    PROJECT_NAME: str = "VERITAS AI"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")

    # Security (required; used by JWT in a later phase)
    SECRET_KEY: SecretStr = Field(..., description="Secret used to sign tokens")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database (required; SQLAlchemy 2.x + Psycopg 3)
    DATABASE_URL: SecretStr = Field(..., description="PostgreSQL connection string")
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # ML runtime
    MODELS_DIR: str | None = Field(default=None, description="Folder containing all-MiniLM-L6-v2 (default: <repo>/models)")
    ARTIFACTS_DIR: str | None = Field(default=None, description="Folder with trained classifier files (default: backend/ml_artifacts)")
    PRELOAD_MODELS: bool = Field(default=True, description="Load ML components in the background at startup")

    # URL ingestion
    URL_FETCH_TIMEOUT_SECONDS: float = 8.0
    URL_MAX_BYTES: int = 5_000_000
    URL_MAX_REDIRECTS: int = 3
    URL_RATE_LIMIT_PER_MINUTE: int = 20

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    @field_validator("SECRET_KEY")
    @classmethod
    def _secret_key_is_strong(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value()
        if len(raw) < 32 or raw.startswith("CHANGE_ME"):
            raise ValueError("SECRET_KEY must be a random string of at least 32 characters")
        return value

    @property
    def database_url(self) -> str:
        """Unwrapped database URL for the engine. Never log or return this value."""
        return self.DATABASE_URL.get_secret_value()

    @property
    def secret_key(self) -> str:
        """Unwrapped signing key. Never log or return this value."""
        return self.SECRET_KEY.get_secret_value()

    @property
    def cors_origins(self) -> list[str]:
        """Explicit list of allowed browser origins."""
        origin = self.FRONTEND_URL.rstrip("/")
        origins = [origin]
        if "localhost" in origin:
            origins.append(origin.replace("localhost", "127.0.0.1"))
        return origins


settings = Settings()
