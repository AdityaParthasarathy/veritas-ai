"""VERITAS AI - Health Check Endpoints."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.exceptions import DatabaseUnavailableException
from app.schemas.health import (
    LiveHealthResponse,
    ReadyHealthResponse,
    HealthNotReadyResponse,
)
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
    responses={
        status.HTTP_200_OK: {
            "model": ReadyHealthResponse,
            "description": "Database and backend ready to accept traffic",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": HealthNotReadyResponse,
            "description": "Database connection is unavailable",
        },
    },
    status_code=status.HTTP_200_OK,
    summary="Application Readiness Check",
    description="Performs an actual query against the PostgreSQL database to verify operational readiness.",
)
def get_readiness():
    """Verify that the database is connected and queries can be executed."""
    try:
        return HealthService.get_ready_status()
    except DatabaseUnavailableException as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=HealthNotReadyResponse(
                status="not_ready",
                database="disconnected",
                detail=exc.message,
            ).model_dump(),
        )
