"""Lexical (TF-IDF) retrieval over the 70 reference passages, and the spaCy model the indicators need."""

import json

import pytest

from app.ml.evidence import EvidenceService
from app.ml.lexical_retrieval import METHOD, LexicalIndex
from app.ml.paths import EVIDENCE_COLLECTION_PATH
from app.ml.uncertainty import RELEVANCE_THRESHOLD
from tests.ml_support import needs_models

PASSAGES = json.loads(EVIDENCE_COLLECTION_PATH.read_text(encoding="utf-8"))["passages"]


def test_all_70_reference_passages_load_unchanged():
    service = EvidenceService()
    assert len(service.passages) == 70
    assert [p["id"] for p in service.passages] == [p["id"] for p in PASSAGES]
    assert all(p["source_url"].startswith("https://") for p in service.passages)
    assert service.method == METHOD == "tfidf_lexical"


def test_a_passage_is_most_similar_to_its_own_wording():
    index = LexicalIndex([p["passage"] for p in PASSAGES])
    for position, passage in enumerate(PASSAGES):
        top = index.search(passage["passage"], top_k=1)[0]
        assert top.index == position and top.score == pytest.approx(1.0, abs=1e-6)


def test_scores_are_cosine_similarities_in_range_and_sorted():
    index = LexicalIndex([p["passage"] for p in PASSAGES])
    hits = index.search("Measles vaccination protects children and prevents deaths", top_k=5)
    scores = [h.score for h in hits]
    assert scores == sorted(scores, reverse=True) and all(0.0 <= s <= 1.0 + 1e-9 for s in scores)


@pytest.mark.parametrize("query", ["", "   "])
def test_empty_query_returns_nothing(query):
    assert LexicalIndex([p["passage"] for p in PASSAGES]).search(query) == []


def test_an_unrelated_query_scores_below_the_relevance_threshold():
    service = EvidenceService()
    hits = service.search("The bakery introduced a new loaf and customers queued on Saturday morning", top_k=3)
    assert hits and all(not h.relevant for h in hits), [(h.id, h.score) for h in hits]


def test_threshold_decides_the_relevant_flag():
    service = EvidenceService()
    for hit in service.search("Carbon dioxide concentrations measured at Mauna Loa remain high", top_k=5):
        assert hit.relevant == (hit.score >= RELEVANCE_THRESHOLD)


def test_title_and_sentence_queries_keep_each_passages_best_match():
    service = EvidenceService()
    hits = service.retrieve_for_article("Measles outbreak", ["Health officials urged parents to keep children up to date with their shots to prevent measles."])
    assert hits and len({h.id for h in hits}) == len(hits)
    assert all(h.matched_text for h in hits)


def test_a_headline_is_still_queried():
    hits = EvidenceService().retrieve_for_article("", ["Do vaccines work against measles?"])
    assert hits


@needs_models
def test_spacy_model_loads_and_finds_entities():
    import spacy

    doc = spacy.load("en_core_web_sm")("The World Health Organization said on Tuesday that NASA will open a centre in Geneva.")
    assert {e.text for e in doc.ents} & {"NASA", "Geneva", "the World Health Organization", "World Health Organization"}


def test_the_deployed_threshold_is_the_one_the_evaluation_recorded_and_respects_both_limits():
    results = json.loads((EVIDENCE_COLLECTION_PATH.parents[1] / "evaluation" / "lexical_retrieval_eval_results.json").read_text(encoding="utf-8"))
    assert results["deployed_threshold"] == RELEVANCE_THRESHOLD == 0.25
    deployed = results["chosen"]["at_deployed_threshold"]
    assert deployed["dev"]["false_related_rate_on_negatives"] <= 0.05
    assert deployed["articles_flagged_related"] <= 0.10
    assert results["chosen_variant"] == "char_wb_3-5gram"
