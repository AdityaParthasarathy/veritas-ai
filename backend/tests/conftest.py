"""VERITAS AI - Test fixtures.

The Vercel edition has no database, so the fixtures are small: a test client and a clean URL rate limiter.
"""

import os
import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ["PRELOAD_MODELS"] = "false"  # the components load on the first analysis request; preload is tested explicitly

from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def clean_state() -> None:
    """Reset the in-memory URL rate limiter before every test."""
    from app.api.v1.endpoints import analysis as analysis_endpoint

    analysis_endpoint.url_rate_limiter.reset()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client (runs the lifespan startup/shutdown)."""
    with TestClient(app) as test_client:
        yield test_client
