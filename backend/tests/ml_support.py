"""Skip conditions for tests that need the full ML runtime.

The tests run (and skip cleanly) in three situations: the full local environment, a minimal CI
environment without the large ML packages, and a checkout without the git-ignored model files.
"""

import importlib.util

import pytest

from app.ml.paths import ARTIFACT_DIR, EMBEDDING_MODEL_DIR

ML_PACKAGES = ("spacy", "faiss", "sentence_transformers", "torch")
MISSING_PACKAGES = [name for name in ML_PACKAGES if importlib.util.find_spec(name) is None]
FILES_PRESENT = EMBEDDING_MODEL_DIR.exists() and (ARTIFACT_DIR / "source_masked_logreg_model.joblib").exists()
ML_AVAILABLE = FILES_PRESENT and not MISSING_PACKAGES

SKIP_REASON = (
    f"ML runtime unavailable (missing packages: {MISSING_PACKAGES or 'none'}; model files present: {FILES_PRESENT})"
)
needs_models = pytest.mark.skipif(not ML_AVAILABLE, reason=SKIP_REASON)
