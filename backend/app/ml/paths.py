"""Locations of ML files. Importable without any heavy ML package.

The default is ``backend/ml_artifacts``; set ARTIFACTS_DIR (environment or .env) to relocate it.
"""

from pathlib import Path

from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent

ARTIFACT_DIR = Path(settings.ARTIFACTS_DIR) if settings.ARTIFACTS_DIR else BACKEND_DIR / "ml_artifacts"
EVIDENCE_COLLECTION_PATH = BACKEND_DIR / "data" / "evidence" / "reference_passages.json"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"
