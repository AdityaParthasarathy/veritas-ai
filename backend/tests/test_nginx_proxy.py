"""The frontend's nginx must serve the SPA and proxy /api/ to the backend (one public address, no CORS).

These tests exercise the real Docker Compose stack, so they run only when it is up
(``docker compose up -d --build``) and skip otherwise, including in CI. Point them at another address with
``VERITAS_PROXY_URL`` (default http://localhost:5173).
"""

import os

import httpx
import pytest

BASE = os.environ.get("VERITAS_PROXY_URL", "http://localhost:5173").rstrip("/")


def _stack_is_up() -> bool:
    try:
        response = httpx.get(f"{BASE}/api/v1/health/live", timeout=3)
    except httpx.HTTPError:
        return False
    return response.headers.get("content-type", "").startswith("application/json")


pytestmark = pytest.mark.skipif(not _stack_is_up(), reason=f"the nginx + backend stack is not running at {BASE}")


def get(path: str, **kwargs) -> httpx.Response:
    return httpx.get(f"{BASE}{path}", timeout=15, **kwargs)


def test_live_health_check_goes_through_nginx_as_json():
    response = get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json()["status"] == "alive"


@pytest.mark.parametrize("path", ["/", "/analyze", "/casebook/03-misleading-sober", "/history/some-id"])
def test_frontend_routes_fall_back_to_the_single_page_app(path):
    response = get(path)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert 'id="root"' in response.text


def test_api_paths_never_return_index_html():
    response = get("/api/v1/this-route-does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")
    assert "<!doctype" not in response.text.lower()
    assert response.json() == {"detail": "Not Found"}  # FastAPI's own 404, so the request reached the backend


def test_authorization_header_reaches_the_backend():
    anonymous = get("/api/v1/auth/me")
    with_token = get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.real-token"})
    assert anonymous.status_code == with_token.status_code == 401
    # Only a request that carried the header is told its credentials were invalid.
    assert anonymous.json()["error"]["message"] == "Not authenticated"
    assert with_token.json()["error"]["message"] == "Could not validate credentials"


def test_request_body_and_path_are_preserved():
    response = httpx.post(f"{BASE}/api/v1/analysis", json={"text": "short"}, timeout=15)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_a_same_origin_post_is_not_blocked_by_cors():
    # Browsers send Origin on same-origin POSTs; the backend must still answer them normally.
    response = httpx.post(f"{BASE}/api/v1/analysis", json={"text": "short"}, headers={"Origin": BASE}, timeout=15)
    assert response.status_code == 422


def test_security_headers_are_sent_once():
    response = get("/api/v1/health/live")
    for name in ("x-content-type-options", "x-frame-options", "referrer-policy", "content-security-policy"):
        assert len(response.headers.get_list(name)) == 1, name
    assert response.headers["cache-control"] == "no-store"
