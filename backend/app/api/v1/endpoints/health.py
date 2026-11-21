"""VERITAS AI - Health Check Endpoints."""

from fastapi import APIRouter, status
from app.schemas.health import LiveHealthResponse, ReadyHealthResponse
from app.services.health_service import HealthService

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.get(
    "/models",
    summary="ML component status",
    description="Reports whether the analysis models are loaded. Never depends on the database; does not trigger loading.",
)
def get_models_status() -> dict:
    """Report whether the ML components are loaded, without triggering loading."""
    from app.services.analysis_service import get_analysis_service

    service = get_analysis_service()
    return {"status": service.status, "load_seconds": service.load_seconds}


@router.get(
    "/live",
    response_model=LiveHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Liveness Check",
    description="Confirms that the FastAPI process is active and accepting requests. Does not depend on external services.",
)
def get_liveness() -> LiveHealthResponse:
    """Return process liveness state."""
    return HealthService.get_live_status()


@router.get(
    "/ready",
    response_model=ReadyHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Readiness Check",
    description=(
        "This edition has no database, so the process is ready as soon as it can answer requests; `database` is always "
        "`not_used`. The analysis components load on the first analysis request: see `/health/models`."
    ),
)
def get_readiness() -> ReadyHealthResponse:
    """Report readiness (there is no database dependency)."""
    return HealthService.get_ready_status()
