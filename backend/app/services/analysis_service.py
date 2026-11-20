"""Orchestrates classification, linguistic signals, evidence retrieval and uncertainty.

The four parts stay separate in the response: a classifier output is never merged
with retrieved evidence, and nothing here claims to verify facts.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import asdict

from app.core.exceptions import ModelUnavailableException
from app.ml.uncertainty import RELEVANCE_THRESHOLD, assess
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ClassificationResult,
    EvidenceCollectionInfo,
    EvidenceHitOut,
    EvidenceListResponse,
    EvidenceResult,
    EvidenceSearchResponse,
    ModelInfo,
    SignalOut,
    UncertaintyOut,
)

logger = logging.getLogger("veritas.analysis")

OVERALL_DISCLAIMER = (
    "This output is an automated statistical and similarity analysis. It does not verify that any claim is true or false."
)
CLASSIFIER_DISCLAIMER = (
    "Describes how closely the writing resembles articles from sources labelled unreliable or reliable in the training data. "
    "It is not a fact-check."
)
EVIDENCE_DISCLAIMER = (
    "Passages are retrieved by semantic similarity from a small curated collection. They show related reference material only; "
    "the system does not determine whether they support or contradict the text."
)


class AnalysisService:
    """Lazily loads heavy ML components once and reuses them across requests."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._loaded = False
        self._nlp = None
        self._classifier = None
        self._evidence = None

    def _load(self) -> None:
        with self._lock:
            if self._loaded:
                return
            try:
                import spacy

                from app.ml.classifier import StyleClassifier
                from app.ml.evidence import EvidenceService
                from app.ml.retrieval import Embedder

                self._nlp = spacy.load("en_core_web_sm")
                self._classifier = StyleClassifier()
                self._evidence = EvidenceService(Embedder())
            except Exception as exc:  # missing artifacts, models or packages
                logger.error("ML components unavailable: %s", exc)
                raise ModelUnavailableException(
                    "Analysis components are not available. Install the ML requirements, download the models and train the classifier (see docs/ml-setup.md)."
                ) from exc
            self._loaded = True

    @property
    def evidence(self):
        self._load()
        return self._evidence

    def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        from app.ml.signals import compute_signals

        self._load()
        title = (request.title or "").strip()
        text = request.text.strip()

        signals = compute_signals(title, text, self._nlp)
        word_count = int(next(s.value for s in signals if s.key == "word_count"))

        result = self._classifier.predict(title, text)
        doc = self._nlp(text[:5000])
        hits = self._evidence.retrieve_for_article(title, [s.text.strip() for s in doc.sents])
        top_score = hits[0].score if hits else None
        uncertainty = assess(word_count, result.probability_unreliable, top_score)

        return AnalysisResponse(
            word_count=word_count,
            classification=ClassificationResult(
                label=result.label,
                probability_unreliable_style=round(result.probability_unreliable, 4),
                model=ModelInfo(
                    name=f"TF-IDF + Logistic Regression ({self._classifier.variant})",
                    trained_on="WELFake (about 62k de-duplicated articles)",
                    test_accuracy_on_dataset_labels=(self._classifier.metrics or {}).get("test_accuracy"),
                ),
                disclaimer=CLASSIFIER_DISCLAIMER,
            ),
            linguistic_signals=[SignalOut(**asdict(s)) for s in signals],
            evidence=EvidenceResult(
                collection_name=self._evidence.collection["name"],
                collection_size=len(self._evidence.passages),
                relevance_threshold=RELEVANCE_THRESHOLD,
                hits=[EvidenceHitOut(**asdict(h)) for h in hits],
                disclaimer=EVIDENCE_DISCLAIMER,
            ),
            uncertainty=UncertaintyOut(
                level=uncertainty.level,
                reasons=uncertainty.reasons,
                standing_caveats=uncertainty.standing_caveats,
            ),
            disclaimer=OVERALL_DISCLAIMER,
        )

    def list_passages(self, topic: str | None = None) -> EvidenceListResponse:
        service = self.evidence
        passages = [
            EvidenceHitOut(id=p["id"], score=0.0, relevant=False, topic=p["topic"], passage=p["passage"],
                           source_org=p["source_org"], source_title=p["source_title"], source_url=p["source_url"])
            for p in service.passages
            if topic is None or p["topic"].lower() == topic.lower()
        ]
        c = service.collection
        return EvidenceListResponse(
            collection=EvidenceCollectionInfo(name=c["name"], description=c["description"], size=len(service.passages), url_checked_on=c["url_checked_on"]),
            passages=passages,
        )

    def search_passages(self, query: str, top_k: int) -> EvidenceSearchResponse:
        hits = self.evidence.search(query, top_k=top_k)
        return EvidenceSearchResponse(query=query, relevance_threshold=RELEVANCE_THRESHOLD, hits=[EvidenceHitOut(**asdict(h)) for h in hits])


_service = AnalysisService()


def get_analysis_service() -> AnalysisService:
    """FastAPI dependency returning the shared service instance."""
    return _service
