"""Schemas for saved analyses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.analysis import AnalysisResponse


class HistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    preview: str
    word_count: int
    classifier_label: str
    probability_unreliable: float
    uncertainty_level: str
    created_at: datetime


class HistoryPage(BaseModel):
    items: list[HistoryItem]
    total: int
    limit: int
    offset: int


class StoredAnalysis(BaseModel):
    id: uuid.UUID
    title: str | None
    text: str
    created_at: datetime
    result: AnalysisResponse
