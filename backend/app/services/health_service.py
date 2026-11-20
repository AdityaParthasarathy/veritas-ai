"""VERITAS AI - Health & System Service Layer.

Encapsulates application health monitoring and diagnostic logic separate from route handlers.
"""

from app.core.config import settings
from app.core.exceptions import DatabaseUnavailableException
from app.database.session import check_db_connectivity
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
        """Verify that the primary database is active and accepting queries.

        Raises DatabaseUnavailableException if connection fails.
        """
        is_connected = check_db_connectivity()
        if not is_connected:
            raise DatabaseUnavailableException(
                message="Primary database is currently unreachable",
            )
        return ReadyHealthResponse(
            status="ready",
            database="connected",
        )

    @staticmethod
    def get_system_info() -> SystemInfoResponse:
        """Provide public, non-sensitive runtime metadata."""
        return SystemInfoResponse(
            application=settings.PROJECT_NAME,
            version=settings.VERSION,
            environment=settings.ENVIRONMENT,
            docs_url="/docs",
        )
