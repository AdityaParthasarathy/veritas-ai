"""Verifies the ML stack end to end: spaCy model, embeddings and FAISS search.

These tests use the locally downloaded models and skip (not fail) if they are absent.
"""

import numpy as np
import pytest

from tests.ml_support import needs_models

pytestmark = needs_models

PASSAGES = [
    "Vaccines train the immune system to recognise a pathogen without causing the disease.",
    "The Moon orbits the Earth roughly every 27 days and causes the ocean tides.",
    "Photosynthesis lets plants convert sunlight, water and carbon dioxide into sugar and oxygen.",
    "The stock market is a place where shares of public companies are bought and sold.",
    "Antibiotics treat bacterial infections and do not work against viruses.",
]


@pytest.fixture(scope="module")
def embedder():
    from app.ml.retrieval import Embedder

    return Embedder()


def test_embeddings_have_expected_shape_and_are_normalised(embedder):
    vectors = embedder.encode(PASSAGES)
    assert vectors.shape == (len(PASSAGES), 384)
    assert vectors.dtype == np.float32
    np.testing.assert_allclose(np.linalg.norm(vectors, axis=1), 1.0, atol=1e-4)


def test_faiss_search_is_semantic_not_keyword(embedder):
    from app.ml.retrieval import PassageIndex

    index = PassageIndex(embedder, PASSAGES)
    assert len(index) == len(PASSAGES)
    # Queries deliberately share no content words with their target passage.
    cases = {
        "How do plants make food from light?": 2,
        "What makes the sea level rise and fall each day?": 1,
        "Why shouldn't I take pills for the flu?": 4,
    }
    for query, expected in cases.items():
        hits = index.search(query, top_k=2)
        assert hits[0].index == expected, (query, hits)
        assert hits[0].score >= hits[1].score


def test_spacy_model_loads_and_tokenises():
    import spacy

    nlp = spacy.load("en_core_web_sm")
    doc = nlp("The World Health Organization is based in Geneva.")
    assert [e.text for e in doc.ents if e.label_ == "ORG"] == ["The World Health Organization"]
