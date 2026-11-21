"""Quality behaviour: out-of-domain detection, low confidence, missing evidence, and the meaning of uncertainty.

Tests that need the ML runtime skip themselves when it is unavailable (see tests/ml_support.py).
"""

import json
from unittest.mock import patch

import pytest

from app.ml.classifier import ClassifierResult
from app.ml.paths import BACKEND_DIR
from app.ml.uncertainty import MEANING, RELEVANCE_THRESHOLD, assess

# A score below RELEVANCE_THRESHOLD is "not related"; half of it is safely "no related evidence" for the rule tests below.
WEAK_EVIDENCE = RELEVANCE_THRESHOLD / 2
from tests.ml_support import needs_models

SAMPLES = BACKEND_DIR.parent / "docs" / "samples"


def sample(name: str) -> str:
    return (SAMPLES / name).read_text(encoding="utf-8").strip()


# ---- uncertainty rules (pure logic) ----------------------------------------------------------------
def test_model_confidence_never_lowers_uncertainty():
    """A very confident classifier must not reduce uncertainty: confidence is not factual certainty."""
    confident = assess(200, 0.999, 0.8, 0.08, 0.06)
    hesitant = assess(200, 0.70, 0.8, 0.08, 0.06)
    very_confident_other_way = assess(200, 0.001, 0.8, 0.08, 0.06)
    assert confident.level == hesitant.level == very_confident_other_way.level == "moderate"
    assert confident.points == hesitant.points == very_confident_other_way.points


def test_uncertainty_states_what_it_does_and_does_not_mean():
    result = assess(500, 0.1, 0.9)
    assert "nothing about whether the content is true or false" in result.meaning
    assert result.meaning == MEANING
    assert any("not factual certainty" in caveat for caveat in result.standing_caveats)


def test_out_of_domain_raises_uncertainty_even_when_the_model_is_confident():
    result = assess(300, 0.999, 0.8, domain_similarity=0.03, domain_threshold=0.06)
    assert result.level == "high"
    assert any("unlike the articles the classifier was trained on" in r and "should not be relied on" in r for r in result.reasons)


def test_out_of_domain_without_related_evidence_is_very_high():
    assert assess(300, 0.99, WEAK_EVIDENCE, domain_similarity=0.03, domain_threshold=0.06).level == "very_high"


def test_in_domain_or_unavailable_profile_adds_no_domain_reason():
    for similarity, threshold in ((0.09, 0.06), (None, None), (0.03, None)):
        result = assess(300, 0.9, 0.8, similarity, threshold)
        assert not any("unlike the articles" in r for r in result.reasons)


def test_low_confidence_is_flagged_as_undecided():
    result = assess(300, 0.52, 0.8)
    assert result.level == "moderate" and result.points == 1
    assert any("effectively undecided" in r for r in result.reasons)
    assert assess(300, 0.52, WEAK_EVIDENCE).level == "high"  # undecided and no related evidence


def test_evidence_threshold_boundary():
    assert any("No passage" in r for r in assess(300, 0.1, RELEVANCE_THRESHOLD - 0.001).reasons)
    assert not any("No passage" in r for r in assess(300, 0.1, RELEVANCE_THRESHOLD).reasons)
    assert any("No passage" in r for r in assess(300, 0.1, None).reasons)


# ---- end to end on the demo samples ---------------------------------------------------------------------
def analyze(client, name: str) -> dict:
    r = client.post("/api/v1/analysis", json={"text": sample(name)})
    assert r.status_code == 200, r.text
    return r.json()


@needs_models
def test_out_of_domain_sample_is_flagged(client):
    body = analyze(client, "04-out-of-domain.txt")
    check = body["uncertainty"]["domain_check"]
    assert check["available"] and check["in_domain"] is False and check["similarity"] < check["threshold"]
    assert body["uncertainty"]["level"] in {"high", "very_high"}
    assert any("unlike the articles" in r for r in body["uncertainty"]["reasons"])
    assert not any(h["relevant"] for h in body["evidence"]["hits"])


@needs_models
def test_normal_news_sample_is_in_domain_with_related_evidence(client):
    body = analyze(client, "01-normal-news.txt")
    assert body["uncertainty"]["domain_check"]["in_domain"] is True
    assert body["uncertainty"]["level"] == "moderate"
    top = body["evidence"]["hits"][0]
    assert top["relevant"] and top["id"] in {"health-measles", "health-immunization"}
    assert top["source_url"].startswith("https://")


@needs_models
def test_unavailable_evidence_is_reported_without_inventing_matches(client):
    body = analyze(client, "05-insufficient-evidence.txt")
    assert not any(h["relevant"] for h in body["evidence"]["hits"])
    assert any("No passage in the reference collection is clearly related" in r for r in body["uncertainty"]["reasons"])
    assert all(h["score"] < RELEVANCE_THRESHOLD for h in body["evidence"]["hits"])
    assert body["evidence"]["retrieval_method"] == "tfidf_lexical"


@needs_models
def test_short_headline_is_very_uncertain(client):
    body = analyze(client, "06-short-headline.txt")
    assert body["uncertainty"]["level"] == "very_high"
    assert any("very short" in r for r in body["uncertainty"]["reasons"])


@needs_models
def test_sensational_sample_is_labelled_unreliable_style_and_still_gets_a_caveat(client):
    body = analyze(client, "02-misleading-sensational.txt")
    assert body["classification"]["label"] == "resembles_unreliable_sources"
    assert "not the probability that the content is true or false" in body["classification"]["confidence_note"]
    assert any("not factual certainty" in c for c in body["uncertainty"]["standing_caveats"])


@needs_models
def test_false_claim_in_sober_style_is_not_detected_and_the_system_does_not_pretend_otherwise(client):
    """Known limitation, kept as a test: style-based classification cannot see that a calmly written claim is false.

    The test pins what must stay true regardless of the label: the result carries the confidence caveat and the
    non-verification disclaimers, and evidence is presented as related material only.
    """
    body = analyze(client, "03-misleading-sober.txt")
    assert "not the probability that the content is true or false" in body["classification"]["confidence_note"]
    assert "does not verify" in body["disclaimer"].lower()
    assert "does not determine whether they support or contradict" in body["evidence"]["disclaimer"]
    assert "verdict" not in json.dumps(body).lower()
    assert body["uncertainty"]["meaning"] == MEANING


@needs_models
def test_low_confidence_prediction_end_to_end(client):
    undecided = ClassifierResult(0.52, "resembles_unreliable_sources", 0.09, 0.0589)
    with patch("app.ml.classifier.StyleClassifier.predict", return_value=undecided):
        body = analyze(client, "01-normal-news.txt")
    assert body["classification"]["probability_unreliable_style"] == 0.52
    assert any("effectively undecided" in r for r in body["uncertainty"]["reasons"])


@needs_models
def test_analysis_still_works_when_the_domain_profile_is_missing(client):
    from app.services.analysis_service import get_analysis_service

    classifier = get_analysis_service()
    classifier._load()
    original = classifier._classifier.domain_profile
    classifier._classifier.domain_profile = None
    try:
        body = analyze(client, "04-out-of-domain.txt")
    finally:
        classifier._classifier.domain_profile = original
    check = body["uncertainty"]["domain_check"]
    assert check["available"] is False and check["in_domain"] is None
    assert not any("unlike the articles" in r for r in body["uncertainty"]["reasons"])


def test_analyses_saved_before_the_new_fields_still_load():
    """Regression: stored results from earlier versions lack confidence_note, meaning and domain_check."""
    from app.schemas.analysis import AnalysisResponse

    legacy = {
        "word_count": 60,
        "classification": {"kind": "machine_learning_classification", "label": "resembles_reliable_sources", "probability_unreliable_style": 0.2,
                           "model": {"name": "m", "trained_on": "t", "test_accuracy_on_dataset_labels": 0.96}, "disclaimer": "d"},
        "linguistic_signals": [],
        "evidence": {"kind": "retrieved_reference_passages", "collection_name": "c", "collection_size": 34, "relevance_threshold": 0.35, "hits": [], "disclaimer": "d"},
        "uncertainty": {"level": "moderate", "reasons": [], "standing_caveats": []},
        "disclaimer": "d",
    }
    parsed = AnalysisResponse.model_validate(legacy)
    assert parsed.uncertainty.domain_check.available is False
    assert "not the probability" in parsed.classification.confidence_note
    assert parsed.uncertainty.meaning == MEANING


def test_domain_check_summary_is_consistent_with_the_saved_profile():
    path = BACKEND_DIR / "ml_artifacts" / "domain_check.json"
    if not path.exists():
        pytest.skip("domain_check.json not generated")
    summary = json.loads(path.read_text(encoding="utf-8"))
    assert summary["out_of_domain"]["detected"] <= summary["out_of_domain"]["documents"]
    assert 0 < summary["threshold"] < 0.2
    assert len(summary["out_of_domain"]["per_sample"]) == summary["out_of_domain"]["documents"]
