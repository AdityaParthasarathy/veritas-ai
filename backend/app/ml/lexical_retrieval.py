"""Lexical retrieval over the curated reference passages (TF-IDF cosine similarity).

The Vercel edition has no embedding model. A passage is found when it shares *words* with the query, so a passage on
the same subject written in different words can be missed (measured in ``data/evaluation/lexical_retrieval_eval_results.json``).
The score is the cosine similarity of L2-normalised TF-IDF vectors, in the range 0 to 1, fitted on the 70 passages only.
It shows vocabulary overlap, not meaning, support or contradiction.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

METHOD = "tfidf_lexical"

# Chosen by app.ml.lexical_eval on the development half of the labelled queries (see that module for the rule).
VECTORIZER_PARAMS: dict = {"analyzer": "char_wb", "ngram_range": (3, 5), "sublinear_tf": True}


@dataclass(frozen=True)
class SearchHit:
    """One retrieved passage with its TF-IDF cosine similarity to the query."""

    index: int
    score: float
    text: str


class LexicalIndex:
    """In-memory TF-IDF index over a list of passages."""

    def __init__(self, passages: list[str], params: dict | None = None) -> None:
        if not passages:
            raise ValueError("At least one passage is required")
        self._passages = list(passages)
        self._vectorizer = TfidfVectorizer(**(params or VECTORIZER_PARAMS))
        self._matrix = self._vectorizer.fit_transform(self._passages)

    def __len__(self) -> int:
        return len(self._passages)

    def search(self, query: str, top_k: int = 3) -> list[SearchHit]:
        """Return the ``top_k`` most similar passages, best first (ties keep collection order)."""
        if not query or not query.strip():
            return []
        scores = (self._vectorizer.transform([query]) @ self._matrix.T).toarray()[0]
        order = np.argsort(-scores, kind="stable")[: min(top_k, len(self))]
        return [SearchHit(int(i), float(scores[i]), self._passages[i]) for i in order]
