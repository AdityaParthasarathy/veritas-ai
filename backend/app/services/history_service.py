"""Saving and reading a user's analysis history."""

import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException
from app.models.analysis import Analysis
from app.models.user import User
from app.repositories import analysis_repository
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.schemas.history import HistoryItem, HistoryPage, StoredAnalysis

PREVIEW_CHARS = 160


def save(db: Session, user: User, request: AnalysisRequest, response: AnalysisResponse) -> uuid.UUID:
    """Persist the submitted text and full result for ``user``."""
    analysis = analysis_repository.create(
        db,
        user_id=user.id,
        title=(request.title or "").strip() or None,
        text=request.text.strip(),
        word_count=response.word_count,
        classifier_label=response.classification.label,
        probability_unreliable=response.classification.probability_unreliable_style,
        uncertainty_level=response.uncertainty.level,
        result=response.model_dump(mode="json", exclude={"analysis_id"}),
    )
    return analysis.id


def _to_item(analysis: Analysis) -> HistoryItem:
    text = " ".join(analysis.text.split())
    preview = text if len(text) <= PREVIEW_CHARS else text[:PREVIEW_CHARS].rstrip() + "…"
    return HistoryItem(
        id=analysis.id, title=analysis.title, preview=preview, word_count=analysis.word_count,
        classifier_label=analysis.classifier_label, probability_unreliable=analysis.probability_unreliable,
        uncertainty_level=analysis.uncertainty_level, created_at=analysis.created_at,
    )


def list_history(db: Session, user: User, limit: int, offset: int) -> HistoryPage:
    """Return a page of the user's saved analyses."""
    rows, total = analysis_repository.list_for_user(db, user.id, limit, offset)
    return HistoryPage(items=[_to_item(r) for r in rows], total=total, limit=limit, offset=offset)


def _get_owned(db: Session, user: User, analysis_id: uuid.UUID) -> Analysis:
    # Other users' analyses are reported as "not found" so their existence is not revealed.
    analysis = analysis_repository.get_for_user(db, analysis_id, user.id)
    if analysis is None:
        raise ResourceNotFoundException("Analysis", analysis_id)
    return analysis


def get_analysis(db: Session, user: User, analysis_id: uuid.UUID) -> StoredAnalysis:
    """Return a saved analysis the user owns, or raise not-found."""
    a = _get_owned(db, user, analysis_id)
    return StoredAnalysis(
        id=a.id, title=a.title, text=a.text, created_at=a.created_at,
        result=AnalysisResponse.model_validate({**a.result, "analysis_id": a.id}),
    )


def delete_analysis(db: Session, user: User, analysis_id: uuid.UUID) -> None:
    """Delete a saved analysis the user owns, or raise not-found."""
    analysis_repository.delete(db, _get_owned(db, user, analysis_id))
