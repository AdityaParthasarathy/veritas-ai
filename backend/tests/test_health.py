"""VERITAS AI - Health Check Test Suite.

Verifies liveness, readiness, and failure-path handling.
"""

from unittest.mock import patch
from fastapi.testclient import TestClient


def test_live_health_check_returns_200(client: TestClient):
    """Test that GET /api/v1/health/live returns HTTP 200 with required structure."""
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert data["application"] == "VERITAS AI"


def test_ready_health_check_with_active_database(client: TestClient):
    """GET /api/v1/health/ready returns 200 against the real PostgreSQL database."""
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_ready_health_check_handles_database_unavailability(client: TestClient):
    """Test that GET /api/v1/health/ready returns HTTP 503 when database is disconnected.

    As required by specifications, mock is used exclusively for the explicit failure-path test.
    """
    with patch("app.services.health_service.check_db_connectivity", return_value=False):
        response = client.get("/api/v1/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"
        assert "detail" in data


def test_ready_failure_does_not_leak_internals(client: TestClient):
    """The 503 body must not contain credentials or driver errors."""
    with patch("app.services.health_service.check_db_connectivity", return_value=False):
        text = client.get("/api/v1/health/ready").text.lower()
    assert "password" not in text
    assert "postgresql" not in text
    assert "traceback" not in text


def test_cors_allows_local_frontend_only(client: TestClient):
    """Preflight from the configured frontend origin is allowed; unknown origins are not."""
    ok = client.options(
        "/api/v1/health/live",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options(
        "/api/v1/health/live",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in bad.headers
