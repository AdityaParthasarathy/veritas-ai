"""Content analysis and evidence endpoints."""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import DbSession, OptionalUser
from app.services import history_service
from app.core.config import settings
from app.core.throttle import RateLimiter
from app.schemas.analysis import (
    SourceInfo,
    UrlAnalysisRequest,
    AnalysisRequest,
    AnalysisResponse,
    EvidenceListResponse,
    EvidenceSearchResponse,
)
from app.services import url_ingest
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
        "retrieved reference passages and an uncertainty assessment. It does not verify factual claims. "
        "Anonymous requests are analysed but not stored; with a valid bearer token the analysis is saved to the user's history."
    ),
)
def analyze_text(payload: AnalysisRequest, service: Service, db: DbSession, user: OptionalUser) -> AnalysisResponse:
    """Analyze submitted text; saved to the signed-in user's history when a valid token is sent."""
    result = service.analyze(payload)
    if user is not None:
        result.analysis_id = history_service.save(db, user, payload, result)
    return result


url_rate_limiter = RateLimiter(settings.URL_RATE_LIMIT_PER_MINUTE, 60)


@analysis_router.post(
    "/url",
    response_model=AnalysisResponse,
    summary="Fetch an article from a URL and analyze it",
    description=(
        "Fetches a public http(s) page with SSRF protections (public addresses only, standard ports, size/time limits, "
        "revalidated redirects), extracts the article text and metadata, then runs the same analysis as POST /analysis. "
        "Extracted metadata is automatic and may be incomplete or wrong."
    ),
)
def analyze_url(payload: UrlAnalysisRequest, request: Request, service: Service, db: DbSession, user: OptionalUser) -> AnalysisResponse:
    """Fetch a public article URL safely, extract its text, then run the standard analysis."""
    url_rate_limiter.hit(request.client.host if request.client else "unknown")
    article = url_ingest.ingest_url(payload.url)
    result = service.analyze(AnalysisRequest(title=article.title, text=article.text))
    result.source = SourceInfo(**{k: v for k, v in asdict(article).items() if k != "text"})
    if user is not None:
        result.analysis_id = history_service.save(db, user, AnalysisRequest(title=article.title, text=article.text), result)
    return result


@evidence_router.get("/passages", response_model=EvidenceListResponse, summary="List the reference collection")
def list_passages(service: Service, topic: str | None = Query(default=None, max_length=50)) -> EvidenceListResponse:
    """List the reference collection, optionally filtered by topic."""
    return service.list_passages(topic)


@evidence_router.get("/search", response_model=EvidenceSearchResponse, summary="Semantic search over the reference collection")
def search_passages(
    service: Service,
    q: str = Query(..., min_length=3, max_length=500),
    top_k: int = Query(default=5, ge=1, le=10),
) -> EvidenceSearchResponse:
    """Return the reference passages most similar in meaning to the query."""
    return service.search_passages(q, top_k)
