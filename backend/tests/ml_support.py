"""Skip conditions for tests that need the analysis runtime (spaCy with its model, scikit-learn, the classifier files).

The tests run (and skip cleanly) in two situations: a full environment, and a checkout without the classifier files.
"""

import importlib.util

import pytest

from app.ml.paths import ARTIFACT_DIR

ML_PACKAGES = ("spacy", "sklearn", "en_core_web_sm")
MISSING_PACKAGES = [name for name in ML_PACKAGES if importlib.util.find_spec(name) is None]
FILES_PRESENT = all((ARTIFACT_DIR / f"source_masked_{part}.joblib").exists() for part in ("logreg_model", "tfidf_vectorizer", "domain_profile"))
ML_AVAILABLE = FILES_PRESENT and not MISSING_PACKAGES

SKIP_REASON = f"analysis runtime unavailable (missing packages: {MISSING_PACKAGES or 'none'}; classifier files present: {FILES_PRESENT})"
needs_models = pytest.mark.skipif(not ML_AVAILABLE, reason=SKIP_REASON)
