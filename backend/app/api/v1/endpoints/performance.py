"""Model performance endpoint (public)."""

from fastapi import APIRouter

from app.schemas.performance import PerformanceResponse
from app.services import performance_service

router = APIRouter(prefix="/models", tags=["Model"])


@router.get("/performance", response_model=PerformanceResponse, summary="Evaluation metrics and dataset limitations")
def get_performance() -> PerformanceResponse:
    """Return the saved training metrics and the documented dataset limitations."""
    return performance_service.get_performance()
