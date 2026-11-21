"""VERITAS AI - Core Application Configuration.

Loads settings from environment variables or an optional ``.env`` file using Pydantic Settings. The Vercel edition
has no database and no accounts, so there are no required settings and no secrets: every value has a safe default.
"""

from pathlib import Path

from pydantic import Field
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

    # ML runtime
    ARTIFACTS_DIR: str | None = Field(default=None, description="Folder with trained classifier files (default: backend/ml_artifacts)")
    PRELOAD_MODELS: bool = Field(
        default=False,
        description="Load the analysis components while the app starts (blocking). Off by default: they load on the first analysis request.",
    )

    # URL ingestion
    URL_FETCH_TIMEOUT_SECONDS: float = 8.0
    URL_MAX_BYTES: int = 5_000_000
    URL_MAX_REDIRECTS: int = 3
    URL_RATE_LIMIT_PER_MINUTE: int = 20

    # CORS: only needed when a browser on another origin calls the API directly (the Vercel setup is same-origin).
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        """Explicit list of allowed browser origins."""
        origin = self.FRONTEND_URL.rstrip("/")
        origins = [origin]
        if "localhost" in origin:
            origins.append(origin.replace("localhost", "127.0.0.1"))
        return origins


settings = Settings()
