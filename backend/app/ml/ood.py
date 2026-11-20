"""Out-of-domain detection for the classifier.

The classifier only saw WELFake (mostly US political news, 2016-2017). For text that looks nothing like that,
its output is not meaningful, however confident it is. We measure how close a document is to the training
data with one number: the cosine similarity between the document's TF-IDF vector and the centroid (mean
vector) of the training documents. Documents below a threshold are flagged as out of domain.

The threshold is the 5th percentile of the score on the *validation* split, so by construction about 5% of
in-domain text is flagged. Held-out test false-flag rate and detection on a hand-written out-of-domain set are
reported by ``python -m app.ml.domain_profile`` and stored in ``ml_artifacts/domain_check.json``.

This is a heuristic. It detects vocabulary/style distance, not "being news" or "being true".
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np

from app.ml.paths import ARTIFACT_DIR

PROFILE_NAME = "source_masked_domain_profile.joblib"
THRESHOLD_PERCENTILE = 5.0


@dataclass(frozen=True)
class DomainProfile:
    centroid: np.ndarray  # unit-length mean TF-IDF vector of the training documents
    threshold: float
    percentile: float

    def similarity(self, features) -> float:
        """Cosine similarity of one TF-IDF row (already L2-normalised) to the training centroid."""
        return float(np.asarray(features @ self.centroid).ravel()[0])

    def is_in_domain(self, similarity: float) -> bool:
        return similarity >= self.threshold

    def save(self, directory: Path = ARTIFACT_DIR) -> Path:
        path = directory / PROFILE_NAME
        joblib.dump({"centroid": self.centroid.astype(np.float32), "threshold": self.threshold, "percentile": self.percentile}, path, compress=3)
        return path

    @classmethod
    def load(cls, directory: Path = ARTIFACT_DIR) -> "DomainProfile | None":
        path = directory / PROFILE_NAME
        if not path.exists():
            return None
        data = joblib.load(path)
        return cls(np.asarray(data["centroid"], dtype=np.float32), float(data["threshold"]), float(data["percentile"]))


def fit_profile(train_matrix, validation_matrix, percentile: float = THRESHOLD_PERCENTILE) -> DomainProfile:
    """Build the centroid from training vectors and the threshold from validation vectors."""
    centroid = np.asarray(train_matrix.mean(axis=0)).ravel().astype(np.float32)
    centroid /= np.linalg.norm(centroid)
    validation_scores = np.asarray(validation_matrix @ centroid).ravel()
    return DomainProfile(centroid, float(np.percentile(validation_scores, percentile)), percentile)


def load_check_summary(directory: Path = ARTIFACT_DIR) -> dict | None:
    path = directory / "domain_check.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
