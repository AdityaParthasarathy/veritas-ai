"""Startup preload, model status, security headers and request-size limits."""

import pytest

from app.core.exceptions import ModelUnavailableException
from app.ml.paths import ARTIFACT_DIR
from tests.ml_support import needs_models
from app.services.analysis_service import AnalysisService



def test_new_service_reports_not_loaded():
    assert AnalysisService().status == "not_loaded"


@needs_models
def test_preload_loads_once_and_is_idempotent():
    service = AnalysisService()
    service.preload()
    assert service.status == "ready" and service.load_seconds is not None
    first = service.load_seconds
    service.preload()
    assert service.load_seconds == first  # second call is a no-op


def test_preload_failure_is_reported_not_raised(monkeypatch):
    service = AnalysisService()
    monkeypatch.setattr("app.ml.classifier.ARTIFACT_DIR", ARTIFACT_DIR / "does-not-exist")
    monkeypatch.setattr("app.ml.classifier.StyleClassifier.__init__.__defaults__", (ARTIFACT_DIR / "does-not-exist", "source_masked"))
    service.preload()  # must not raise
    assert service.status == "unavailable"
    with pytest.raises(ModelUnavailableException):
        service._load()


def test_models_health_endpoint_never_triggers_loading(client):
    r = client.get("/api/v1/health/models")
    assert r.status_code == 200 and r.json()["status"] in {"not_loaded", "loading", "ready", "unavailable"}


def test_security_headers_on_api_and_docs(client):
    api = client.get("/api/v1/health/live")
    assert api.headers["x-content-type-options"] == "nosniff"
    assert api.headers["x-frame-options"] == "DENY"
    assert api.headers["referrer-policy"] == "no-referrer"
    assert api.headers["cache-control"] == "no-store"
    assert "default-src 'none'" in api.headers["content-security-policy"]
    docs = client.get("/docs")  # Swagger needs scripts, so it gets no API-only CSP
    assert docs.status_code == 200 and "content-security-policy" not in docs.headers
    assert docs.headers["x-content-type-options"] == "nosniff"


def test_oversized_request_body_is_rejected_early(client):
    r = client.post("/api/v1/analysis", content=b"x" * 1_100_000, headers={"Content-Type": "application/json"})
    assert r.status_code == 413 and r.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_errors_never_leak_internals(client):
    r = client.get("/api/v1/nonexistent")
    assert r.status_code == 404
    assert "Traceback" not in r.text and "site-packages" not in r.text
