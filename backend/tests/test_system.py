"""VERITAS AI - System Information and Security Test Suite."""

from fastapi.testclient import TestClient


def test_system_info_returns_expected_fields(client: TestClient):
    """Test that GET /api/v1/system/info returns application metadata."""
    response = client.get("/api/v1/system/info")
    assert response.status_code == 200
    data = response.json()
    assert data["application"] == "VERITAS AI"
    assert "version" in data
    assert "environment" in data
    assert data["docs_url"] == "/docs"


def test_system_info_does_not_leak_secrets(client: TestClient):
    """Test that system info never exposes passwords, secrets, or internal paths."""
    response = client.get("/api/v1/system/info")
    data_str = response.text.lower()
    assert "secret" not in data_str
    assert "password" not in data_str
    assert "c:\\" not in data_str
    assert "/home" not in data_str


def test_root_endpoint_metadata(client: TestClient):
    """Test that GET / returns root discovery metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["application"] == "VERITAS AI"
    assert "documentation" in data
    assert data["api_v1"] == "/api/v1"
