"""Inference wrapper for the Phase 2 TF-IDF + Logistic Regression classifier."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import joblib

from app.ml.text_masking import MAX_CHARS, mask_source_cues
from app.ml.ood import DomainProfile
from app.ml.paths import ARTIFACT_DIR

VARIANT = "source_masked"  # less dependent on publisher shortcuts than the plain baseline


@dataclass(frozen=True)
class ClassifierResult:
    probability_unreliable: float  # P(class 1) = resembles the dataset's "fake/unreliable" label
    label: str
    domain_similarity: float | None = None  # similarity to the training-data centroid, None if no profile
    domain_threshold: float | None = None


class StyleClassifier:
    """Loads the saved vectorizer and model and scores new text.

    Only load artifacts that you trained yourself: joblib files are pickles.
    """

    def __init__(self, artifact_dir: Path = ARTIFACT_DIR, variant: str = VARIANT) -> None:
        vec_path = artifact_dir / f"{variant}_tfidf_vectorizer.joblib"
        model_path = artifact_dir / f"{variant}_logreg_model.joblib"
        if not (vec_path.exists() and model_path.exists()):
            raise FileNotFoundError("Classifier artifacts missing. Train them with `python -m app.ml.train` in backend/ (needs requirements-dev.txt), or use the committed files.")
        self._vectorizer = joblib.load(vec_path)
        self._model = joblib.load(model_path)
        self.variant = variant
        self.domain_profile = DomainProfile.load(artifact_dir)  # optional: run `python -m app.ml.domain_profile`
        self.metrics = self._load_test_metrics(artifact_dir, variant)

    @staticmethod
    def _load_test_metrics(artifact_dir: Path, variant: str) -> dict | None:
        path = artifact_dir / "metrics.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        for entry in data.get("variants", []):
            if entry["variant"] == variant:
                return {"test_accuracy": entry["test"]["accuracy"], "test_macro_f1": entry["test"]["macro_avg"]["f1"]}
        return None

    def predict(self, title: str, text: str) -> ClassifierResult:
        """Score text: the probability of the 'unreliable' label plus its similarity to the training data."""
        content = f"{title.strip()}. {text.strip()}".strip(" .")[:MAX_CHARS]
        features = self._vectorizer.transform([mask_source_cues(content)])
        p_unreliable = float(self._model.predict_proba(features)[0][1])
        label = "resembles_unreliable_sources" if p_unreliable >= 0.5 else "resembles_reliable_sources"
        similarity = self.domain_profile.similarity(features) if self.domain_profile else None
        threshold = self.domain_profile.threshold if self.domain_profile else None
        return ClassifierResult(p_unreliable, label, similarity, threshold)
