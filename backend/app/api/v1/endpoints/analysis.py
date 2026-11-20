"""Content analysis and evidence endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    EvidenceListResponse,
    EvidenceSearchResponse,
)
from app.services.analysis_service import AnalysisService, get_analysis_service

analysis_router = APIRouter(prefix="/analysis", tags=["Analysis"])
evidence_router = APIRouter(prefix="/evidence", tags=["Evidence"])

Service = Annotated[AnalysisService, Depends(get_analysis_service)]


@analysis_router.post(
    "",
    response_model=AnalysisResponse,
    summary="Analyze submitted text",
    description=(
        "Returns, as separate sections: a machine-learning style classification, linguistic signals, "
        "retrieved reference passages and an uncertainty assessment. It does not verify factual claims."
    ),
)
def analyze_text(payload: AnalysisRequest, service: Service) -> AnalysisResponse:
    return service.analyze(payload)


@evidence_router.get("/passages", response_model=EvidenceListResponse, summary="List the reference collection")
def list_passages(service: Service, topic: str | None = Query(default=None, max_length=50)) -> EvidenceListResponse:
    return service.list_passages(topic)


@evidence_router.get("/search", response_model=EvidenceSearchResponse, summary="Semantic search over the reference collection")
def search_passages(
    service: Service,
    q: str = Query(..., min_length=3, max_length=500),
    top_k: int = Query(default=5, ge=1, le=10),
) -> EvidenceSearchResponse:
    return service.search_passages(q, top_k)
