"""Schemas for the content-analysis and evidence endpoints."""

import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.ml.uncertainty import MEANING

MAX_TEXT_CHARS = 20_000
CONFIDENCE_NOTE = (
    "Model confidence describes how strongly the text matches patterns in the training labels. "
    "It is not the probability that the content is true or false."
)


class AnalysisRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300, description="Optional headline")
    text: str = Field(..., min_length=20, max_length=MAX_TEXT_CHARS, description="Headline or article body")

    @field_validator("text")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if len(value.strip()) < 20:
            raise ValueError("text must contain at least 20 non-whitespace characters")
        return value


class ModelInfo(BaseModel):
    name: str
    trained_on: str
    test_accuracy_on_dataset_labels: float | None


class ClassificationResult(BaseModel):
    kind: Literal["machine_learning_classification"] = "machine_learning_classification"
    label: Literal["resembles_unreliable_sources", "resembles_reliable_sources"]
    probability_unreliable_style: float = Field(..., ge=0, le=1)
    confidence_note: str = CONFIDENCE_NOTE  # default keeps analyses saved before this field existed readable
    model: ModelInfo
    disclaimer: str


class SignalOut(BaseModel):
    key: str
    label: str
    value: float
    unit: str
    description: str


class EvidenceHitOut(BaseModel):
    id: str
    score: float
    relevant: bool
    topic: str
    passage: str
    source_org: str
    source_title: str
    source_url: str
    matched_text: str | None = None


class EvidenceResult(BaseModel):
    kind: Literal["retrieved_reference_passages"] = "retrieved_reference_passages"
    retrieval_method: Literal["tfidf_lexical"] = Field(default="tfidf_lexical", description="Lexical TF-IDF cosine similarity: vocabulary overlap, not meaning")
    collection_name: str
    collection_size: int
    relevance_threshold: float
    hits: list[EvidenceHitOut]
    disclaimer: str


class DomainCheck(BaseModel):
    """Whether the text resembles the classifier's training data."""

    available: bool
    in_domain: bool | None = None
    similarity: float | None = None
    threshold: float | None = None


class UncertaintyOut(BaseModel):
    level: Literal["moderate", "high", "very_high"]
    meaning: str = MEANING
    reasons: list[str]
    standing_caveats: list[str]
    domain_check: DomainCheck = DomainCheck(available=False)


class UrlAnalysisRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048, description="Public http(s) URL of an article")


class SourceInfo(BaseModel):
    """Metadata of the fetched page. Extracted automatically and may be wrong or missing."""

    url: str
    final_url: str
    domain: str
    title: str | None
    author: str | None
    published: str | None
    extracted_chars: int
    truncated: bool
    extraction_warning: str | None = Field(
        default=None,
        description="Set when the extracted text looks like a menu, feed or index page instead of one article.",
    )


class AnalysisResponse(BaseModel):
    source: SourceInfo | None = Field(default=None, description="Set when the input came from a URL")
    analysis_id: uuid.UUID | None = Field(default=None, description="Always null: this edition stores nothing (kept so responses stay compatible with the full edition)")
    word_count: int
    classification: ClassificationResult
    linguistic_signals: list[SignalOut]
    evidence: EvidenceResult
    uncertainty: UncertaintyOut
    disclaimer: str


class EvidenceCollectionInfo(BaseModel):
    name: str
    description: str
    size: int
    url_checked_on: str


class EvidenceListResponse(BaseModel):
    collection: EvidenceCollectionInfo
    passages: list[EvidenceHitOut]


class EvidenceSearchResponse(BaseModel):
    query: str
    retrieval_method: Literal["tfidf_lexical"] = "tfidf_lexical"
    relevance_threshold: float
    hits: list[EvidenceHitOut]
