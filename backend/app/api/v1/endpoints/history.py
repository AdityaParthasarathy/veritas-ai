"""Saved-analysis endpoints (require sign-in)."""

import uuid

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.history import HistoryPage, StoredAnalysis
from app.services import history_service

router = APIRouter(prefix="/analyses", tags=["History"])


@router.get("", response_model=HistoryPage, summary="List my saved analyses, newest first")
def list_analyses(
    user: CurrentUser, db: DbSession, limit: int = Query(default=20, ge=1, le=100), offset: int = Query(default=0, ge=0)
) -> HistoryPage:
    """List the signed-in user's saved analyses, newest first."""
    return history_service.list_history(db, user, limit, offset)


@router.get("/{analysis_id}", response_model=StoredAnalysis, summary="Get one saved analysis")
def get_analysis(analysis_id: uuid.UUID, user: CurrentUser, db: DbSession) -> StoredAnalysis:
    """Return one saved analysis owned by the signed-in user."""
    return history_service.get_analysis(db, user, analysis_id)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete one saved analysis")
def delete_analysis(analysis_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    """Delete one saved analysis owned by the signed-in user."""
    history_service.delete_analysis(db, user, analysis_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
