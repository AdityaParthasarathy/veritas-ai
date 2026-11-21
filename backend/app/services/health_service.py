"""VERITAS AI - Health & System Service Layer.

Encapsulates application health and diagnostic logic separate from route handlers.
"""

from app.core.config import settings
from app.schemas.health import LiveHealthResponse, ReadyHealthResponse
from app.schemas.system import SystemInfoResponse


class HealthService:
    """Service handling system diagnostics and dependency health checks."""

    @staticmethod
    def get_live_status() -> LiveHealthResponse:
        """Confirm application process is active. Does not verify external dependencies."""
        return LiveHealthResponse(
            status="alive",
            application=settings.PROJECT_NAME,
        )

    @staticmethod
    def get_ready_status() -> ReadyHealthResponse:
        """Report readiness. There is no database in this edition, so the process being up is enough."""
        return ReadyHealthResponse(status="ready", database="not_used")

    @staticmethod
    def get_system_info() -> SystemInfoResponse:
        """Provide public, non-sensitive runtime metadata."""
        return SystemInfoResponse(
            application=settings.PROJECT_NAME,
            version=settings.VERSION,
            environment=settings.ENVIRONMENT,
            docs_url="/docs",
        )
