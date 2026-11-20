"""Database access for stored analyses. Every query is scoped to the owning user."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analysis import Analysis


def create(db: Session, **fields) -> Analysis:
    """Insert and return an analysis."""
    analysis = Analysis(**fields)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def get_for_user(db: Session, analysis_id: uuid.UUID, user_id: uuid.UUID) -> Analysis | None:
    """Return the analysis if it belongs to ``user_id``, otherwise None."""
    return db.scalar(select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id))


def list_for_user(db: Session, user_id: uuid.UUID, limit: int, offset: int) -> tuple[list[Analysis], int]:
    """Return one page of a user's analyses (newest first) and the total count."""
    total = db.scalar(select(func.count()).select_from(Analysis).where(Analysis.user_id == user_id)) or 0
    rows = db.scalars(
        select(Analysis)
        .where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return list(rows), total


def delete(db: Session, analysis: Analysis) -> None:
    """Delete an analysis."""
    db.delete(analysis)
    db.commit()
