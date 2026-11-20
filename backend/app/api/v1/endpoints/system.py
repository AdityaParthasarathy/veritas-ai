"""VERITAS AI - System Information Endpoints."""

from fastapi import APIRouter, status
from app.schemas.system import SystemInfoResponse
from app.services.health_service import HealthService

router = APIRouter(prefix="/system", tags=["System Information"])


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="System Information",
    description="Returns high-level, non-sensitive runtime information including version and environment.",
)
def get_system_info() -> SystemInfoResponse:
    """Return public system metadata."""
    return HealthService.get_system_info()
