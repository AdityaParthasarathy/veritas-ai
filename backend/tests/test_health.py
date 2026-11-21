"""VERITAS AI - Health Check Test Suite.

Verifies liveness and readiness (there is no database), CORS, and that the account routes are gone.
"""

from fastapi.testclient import TestClient


def test_live_health_check_returns_200(client: TestClient):
    """Test that GET /api/v1/health/live returns HTTP 200 with required structure."""
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert data["application"] == "VERITAS AI"


def test_ready_health_check_needs_no_database(client: TestClient):
    """This edition has no database: readiness only means the process answers, and says so."""
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "not_used"}


def test_removed_account_and_history_routes_are_gone(client: TestClient):
    """There are no accounts and no saved analyses in this edition."""
    for method, path in (("post", "/api/v1/auth/login"), ("post", "/api/v1/auth/register"), ("get", "/api/v1/auth/me"), ("get", "/api/v1/analyses")):
        assert getattr(client, method)(path).status_code == 404, path


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
