"""VERITAS AI - Test fixtures.

Integration tests run against the real PostgreSQL database configured in the
root ``.env`` (start it with ``docker compose up -d db``). Only the explicit
failure-path test mocks the connectivity check.
"""

import os
import sys
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client (runs the lifespan startup/shutdown)."""
    with TestClient(app) as test_client:
        yield test_client
