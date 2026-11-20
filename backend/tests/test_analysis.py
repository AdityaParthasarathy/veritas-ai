"""Tests for signals, uncertainty, the evidence collection and the analysis API."""

import json
from unittest.mock import patch

import pytest

from app.core.exceptions import ModelUnavailableException
from tests.ml_support import needs_models
from app.ml.paths import EVIDENCE_COLLECTION_PATH as COLLECTION_PATH
from app.ml.uncertainty import assess


CLIMATE_TEXT = (
    "NASA and NOAA scientists said on Tuesday that global average temperatures have continued to climb, according to new "
    "measurements. The agencies attributed the warming largely to greenhouse gases from burning fossil fuels, and carbon dioxide "
    "concentrations measured at Mauna Loa remain far above pre-industrial levels."
)
SENSATIONAL_TEXT = (
    "SHOCKING!!! You won't believe what they are hiding from you!!! This BOMBSHELL scandal has been EXPOSED and the "
    "mainstream media will not tell you. Share this before it is deleted!!! WAKE UP people, this is URGENT."
)


# ---- evidence collection integrity -------------------------------------------------
def test_reference_collection_is_well_formed():
    data = json.loads(COLLECTION_PATH.read_text(encoding="utf-8"))
    passages = data["passages"]
    assert len(passages) >= 30
    ids = [p["id"] for p in passages]
    assert len(ids) == len(set(ids))
    for p in passages:
        assert p["source_url"].startswith("https://")
        assert len(p["passage"].split()) >= 10
        assert p["source_org"] and p["source_title"] and p["topic"]


# ---- uncertainty rules -----------------------------------------------------------------
def test_uncertainty_is_never_low():
    result = assess(word_count=500, probability_unreliable=0.05, top_evidence_score=0.8)
    assert result.level == "moderate"
    assert result.reasons == []
    assert result.standing_caveats


def test_uncertainty_escalates_for_short_borderline_unrelated_text():
    result = assess(word_count=12, probability_unreliable=0.52, top_evidence_score=0.1)
    assert result.level == "very_high"
    assert len(result.reasons) == 3


# ---- signals -----------------------------------------------------------------------------
@needs_models
def test_signals_detect_sensational_style():
    import spacy

    from app.ml.signals import compute_signals

    nlp = spacy.load("en_core_web_sm")
    loud = {s.key: s.value for s in compute_signals("", SENSATIONAL_TEXT, nlp)}
    calm = {s.key: s.value for s in compute_signals("", CLIMATE_TEXT, nlp)}
    assert loud["exclamation_marks"] > calm["exclamation_marks"] == 0
    assert loud["sensational_terms"] > calm["sensational_terms"]
    assert loud["all_caps_ratio"] > calm["all_caps_ratio"]
    assert calm["attribution_markers"] > loud["attribution_markers"]


# ---- API ----------------------------------------------------------------------------------
@needs_models
def test_analysis_response_keeps_sections_separate(client):
    r = client.post("/api/v1/analysis", json={"title": "Record warming", "text": CLIMATE_TEXT})
    assert r.status_code == 200
    d = r.json()
    assert d["classification"]["kind"] == "machine_learning_classification"
    assert d["evidence"]["kind"] == "retrieved_reference_passages"
    assert 0 <= d["classification"]["probability_unreliable_style"] <= 1
    assert d["uncertainty"]["level"] in {"moderate", "high", "very_high"}
    assert "does not verify" in d["disclaimer"].lower()
    # Evidence is retrieved independently of the classifier: a climate text surfaces climate passages.
    top = d["evidence"]["hits"][0]
    assert top["relevant"] and top["id"].startswith("climate-")
    assert top["source_url"].startswith("https://")


@needs_models
def test_unrelated_text_yields_no_relevant_evidence_and_higher_uncertainty(client):
    text = "The local bakery introduced a new sourdough loaf this week and customers queued around the block on Saturday morning."
    d = client.post("/api/v1/analysis", json={"text": text}).json()
    assert not any(h["relevant"] for h in d["evidence"]["hits"])
    assert any("No passage" in reason for reason in d["uncertainty"]["reasons"])


@needs_models
def test_short_input_is_flagged_very_uncertain(client):
    d = client.post("/api/v1/analysis", json={"text": "Scientists announce shocking new discovery today"}).json()
    assert d["uncertainty"]["level"] in {"high", "very_high"}
    assert any("very short" in r for r in d["uncertainty"]["reasons"])


@needs_models
def test_evidence_endpoints(client):
    listing = client.get("/api/v1/evidence/passages").json()
    assert listing["collection"]["size"] == len(listing["passages"]) >= 30
    health = client.get("/api/v1/evidence/passages", params={"topic": "health"}).json()
    assert 0 < len(health["passages"]) < len(listing["passages"])
    hits = client.get("/api/v1/evidence/search", params={"q": "why do we have seasons", "top_k": 2}).json()["hits"]
    assert hits[0]["id"] == "space-seasons"


@pytest.mark.parametrize(
    "payload",
    [{}, {"text": "too short"}, {"text": "x" * 20_001}, {"text": "   " + "a" * 5 + "   " * 10}, {"title": "t" * 301, "text": "a" * 50}],
)
def test_analysis_validates_input(client, payload):
    r = client.post("/api/v1/analysis", json=payload)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_analysis_returns_503_when_models_missing(client):
    from app.services.analysis_service import AnalysisService

    with patch.object(AnalysisService, "_load", side_effect=ModelUnavailableException()):
        r = client.post("/api/v1/analysis", json={"text": CLIMATE_TEXT})
    assert r.status_code == 503
    body = r.text.lower()
    assert r.json()["error"]["code"] == "MODEL_UNAVAILABLE"
    assert "traceback" not in body and "c:\\" not in body


@needs_models
def test_short_headline_still_gets_evidence_query(client):
    d = client.post("/api/v1/analysis", json={"text": "Do vaccines work against measles?"}).json()
    assert d["evidence"]["hits"], "short inputs must still be queried"
    assert d["evidence"]["hits"][0]["id"] in {"health-measles", "health-immunization"}
