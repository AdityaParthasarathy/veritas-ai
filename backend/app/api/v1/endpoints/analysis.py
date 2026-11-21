"""Content analysis and evidence endpoints."""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

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
from app.services.extraction_quality import assess_extraction
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
        "retrieved reference passages (lexical TF-IDF similarity) and an uncertainty assessment. It does not verify factual claims. "
        "Nothing is stored: there are no accounts and no saved analyses."
    ),
)
def analyze_text(payload: AnalysisRequest, service: Service) -> AnalysisResponse:
    """Analyze submitted text. Nothing is stored."""
    return service.analyze(payload)


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
def analyze_url(payload: UrlAnalysisRequest, request: Request, service: Service) -> AnalysisResponse:
    """Fetch a public article URL safely, extract its text, then run the standard analysis."""
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()  # set by the hosting platform
    url_rate_limiter.hit(forwarded or (request.client.host if request.client else "unknown"))
    article = url_ingest.ingest_url(payload.url)
    warning = assess_extraction(article.text).warning
    result = service.analyze(AnalysisRequest(title=article.title, text=article.text), extraction_warning=warning)
    result.source = SourceInfo(**{k: v for k, v in asdict(article).items() if k != "text"}, extraction_warning=warning)
    return result


@evidence_router.get("/passages", response_model=EvidenceListResponse, summary="List the reference collection")
def list_passages(service: Service, topic: str | None = Query(default=None, max_length=50)) -> EvidenceListResponse:
    """List the reference collection, optionally filtered by topic."""
    return service.list_passages(topic)


@evidence_router.get("/search", response_model=EvidenceSearchResponse, summary="Lexical (TF-IDF) search over the reference collection")
def search_passages(
    service: Service,
    q: str = Query(..., min_length=3, max_length=500),
    top_k: int = Query(default=5, ge=1, le=10),
) -> EvidenceSearchResponse:
    """Return the reference passages that share the most vocabulary with the query (TF-IDF cosine similarity)."""
    return service.search_passages(q, top_k)
