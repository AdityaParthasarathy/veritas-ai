"""Saved analyses: persistence, ownership isolation, pagination, deletion, and the performance endpoint."""

import uuid

import pytest

from app.ml.classifier import ARTIFACT_DIR
from app.ml.retrieval import DEFAULT_MODEL_DIR

MODELS_PRESENT = DEFAULT_MODEL_DIR.exists() and (ARTIFACT_DIR / "source_masked_logreg_model.joblib").exists()
needs_models = pytest.mark.skipif(not MODELS_PRESENT, reason="ML models/artifacts not available")

TEXT = (
    "NASA and NOAA scientists said on Tuesday that global average temperatures have continued to climb, according to new "
    "measurements. The agencies attributed the warming largely to greenhouse gases from burning fossil fuels."
)


def _analyze(client, headers=None, text=TEXT, title="Warming"):
    return client.post("/api/v1/analysis", json={"title": title, "text": text}, headers=headers or {})


def test_history_requires_authentication(client):
    assert client.get("/api/v1/analyses").status_code == 401
    assert client.get(f"/api/v1/analyses/{uuid.uuid4()}").status_code == 401
    assert client.delete(f"/api/v1/analyses/{uuid.uuid4()}").status_code == 401


@needs_models
def test_anonymous_analysis_is_not_saved(client, make_user):
    headers, _ = make_user()
    r = _analyze(client)
    assert r.status_code == 200 and r.json()["analysis_id"] is None
    assert client.get("/api/v1/analyses", headers=headers).json()["total"] == 0


@needs_models
def test_invalid_token_on_analysis_is_rejected_not_anonymous(client):
    assert _analyze(client, {"Authorization": "Bearer expired-or-garbage"}).status_code == 401


@needs_models
def test_signed_in_analysis_is_saved_and_retrievable(client, make_user):
    headers, _ = make_user()
    created = _analyze(client, headers).json()
    assert created["analysis_id"]

    listing = client.get("/api/v1/analyses", headers=headers).json()
    assert listing["total"] == 1
    item = listing["items"][0]
    assert item["id"] == created["analysis_id"] and item["title"] == "Warming"
    assert item["classifier_label"] == created["classification"]["label"]
    assert "text" not in item  # list view only carries a preview

    stored = client.get(f"/api/v1/analyses/{item['id']}", headers=headers).json()
    assert stored["text"] == TEXT
    assert stored["result"]["classification"]["probability_unreliable_style"] == created["classification"]["probability_unreliable_style"]
    assert stored["result"]["evidence"]["hits"][0]["id"] == created["evidence"]["hits"][0]["id"]


@needs_models
def test_users_cannot_see_or_delete_each_others_analyses(client, make_user):
    alice, _ = make_user("alice@example.com")
    bob, _ = make_user("bob@example.com")
    analysis_id = _analyze(client, alice).json()["analysis_id"]

    assert client.get("/api/v1/analyses", headers=bob).json()["total"] == 0
    assert client.get(f"/api/v1/analyses/{analysis_id}", headers=bob).status_code == 404
    assert client.delete(f"/api/v1/analyses/{analysis_id}", headers=bob).status_code == 404
    assert client.get(f"/api/v1/analyses/{analysis_id}", headers=alice).status_code == 200


@needs_models
def test_pagination_order_and_delete(client, make_user):
    headers, _ = make_user()
    ids = [_analyze(client, headers, title=f"Item {i}").json()["analysis_id"] for i in range(3)]

    page = client.get("/api/v1/analyses", params={"limit": 2, "offset": 0}, headers=headers).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert [i["id"] for i in page["items"]] == [ids[2], ids[1]]  # newest first
    rest = client.get("/api/v1/analyses", params={"limit": 2, "offset": 2}, headers=headers).json()
    assert [i["id"] for i in rest["items"]] == [ids[0]]

    assert client.delete(f"/api/v1/analyses/{ids[2]}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/analyses/{ids[2]}", headers=headers).status_code == 404
    assert client.get("/api/v1/analyses", headers=headers).json()["total"] == 2


def test_history_parameter_validation(client, make_user):
    headers, _ = make_user()
    assert client.get("/api/v1/analyses", params={"limit": 0}, headers=headers).status_code == 422
    assert client.get("/api/v1/analyses", params={"limit": 101}, headers=headers).status_code == 422
    assert client.get("/api/v1/analyses", params={"offset": -1}, headers=headers).status_code == 422
    assert client.get("/api/v1/analyses/not-a-uuid", headers=headers).status_code == 422


def test_model_performance_matches_saved_metrics(client):
    import json

    from app.services.performance_service import METRICS_PATH

    r = client.get("/api/v1/models/performance")
    assert r.status_code == 200
    body = r.json()
    saved = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    for variant, source in zip(body["variants"], saved["variants"]):
        assert variant["test"]["accuracy"] == source["test"]["accuracy"]  # served, not re-typed
        assert variant["test"]["confusion_matrix"]["matrix"] == source["test"]["confusion_matrix"]["matrix"]
    assert len(body["limitations"]) >= 5 and "not a measure of factual accuracy" in body["interpretation"]
