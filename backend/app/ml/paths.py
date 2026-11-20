"""Locations of ML files. Importable without any heavy ML package.

Defaults are ``<repo>/models`` and ``backend/ml_artifacts``; set MODELS_DIR / ARTIFACTS_DIR
(environment or .env) to relocate them, e.g. when running in a container.
"""

from pathlib import Path

from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent

MODELS_DIR = Path(settings.MODELS_DIR) if settings.MODELS_DIR else REPO_ROOT / "models"
ARTIFACT_DIR = Path(settings.ARTIFACTS_DIR) if settings.ARTIFACTS_DIR else BACKEND_DIR / "ml_artifacts"
EMBEDDING_MODEL_DIR = MODELS_DIR / "all-MiniLM-L6-v2"
EVIDENCE_COLLECTION_PATH = BACKEND_DIR / "data" / "evidence" / "reference_passages.json"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"
