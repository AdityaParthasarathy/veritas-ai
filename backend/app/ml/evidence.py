"""Evidence retrieval over the curated reference collection.

Retrieval is purely semantic similarity (MiniLM embeddings + FAISS). It returns
topically related passages; it does not decide whether a passage supports or
contradicts the submitted text.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from app.ml.paths import EVIDENCE_COLLECTION_PATH
from app.ml.retrieval import Embedder, PassageIndex
from app.ml.uncertainty import RELEVANCE_THRESHOLD

COLLECTION_PATH = EVIDENCE_COLLECTION_PATH
MAX_QUERY_SENTENCES = 8
MIN_SENTENCE_WORDS = 6


@dataclass(frozen=True)
class EvidenceHit:
    id: str
    score: float
    relevant: bool
    passage: str
    topic: str
    source_org: str
    source_title: str
    source_url: str
    matched_text: str | None = None


class EvidenceService:
    def __init__(self, embedder: Embedder, collection_path: Path = COLLECTION_PATH) -> None:
        data = json.loads(collection_path.read_text(encoding="utf-8"))
        self.collection = data["collection"]
        self.passages = data["passages"]
        self._index = PassageIndex(embedder, [p["passage"] for p in self.passages])

    def _hit(self, i: int, score: float, matched: str | None = None) -> EvidenceHit:
        p = self.passages[i]
        return EvidenceHit(p["id"], round(score, 4), score >= RELEVANCE_THRESHOLD, p["passage"], p["topic"],
                           p["source_org"], p["source_title"], p["source_url"], matched)

    def search(self, query: str, top_k: int = 5) -> list[EvidenceHit]:
        return [self._hit(h.index, h.score) for h in self._index.search(query, top_k=top_k)]

    def retrieve_for_article(self, title: str, sentences: list[str], top_k: int = 3) -> list[EvidenceHit]:
        """Query with the title and the first sentences; keep each passage's best match."""
        queries = ([title.strip()] if title and title.strip() else []) + [
            s for s in sentences if len(s.split()) >= MIN_SENTENCE_WORDS
        ][:MAX_QUERY_SENTENCES]
        if not queries:  # very short input (e.g. a headline): query with the whole text
            queries = [" ".join(sentences)[:500]] if sentences else []
        best: dict[int, tuple[float, str]] = {}
        for query in queries:
            for hit in self._index.search(query, top_k=3):
                if hit.index not in best or hit.score > best[hit.index][0]:
                    best[hit.index] = (hit.score, query)
        ranked = sorted(best.items(), key=lambda kv: kv[1][0], reverse=True)[:top_k]
        return [self._hit(i, score, matched[:300]) for i, (score, matched) in ranked]
