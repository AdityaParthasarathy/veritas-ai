"""Semantic retrieval foundation: sentence embeddings + FAISS similarity search.

The embedding model is loaded from a local folder (see docs/ml-setup.md for the
download command) so inference never needs network access. Embeddings are
L2-normalised, so the FAISS inner-product index returns cosine similarity.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from app.ml.paths import EMBEDDING_MODEL_DIR

DEFAULT_MODEL_DIR = EMBEDDING_MODEL_DIR
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@dataclass(frozen=True)
class SearchHit:
    """One retrieved passage with its cosine similarity to the query."""

    index: int
    score: float
    text: str


class Embedder:
    """Wraps a local SentenceTransformer model (CPU)."""

    def __init__(self, model_dir: Path = DEFAULT_MODEL_DIR) -> None:
        if not model_dir.exists():
            raise FileNotFoundError(
                f"Embedding model not found at {model_dir}. Download it with the command in docs/ml-setup.md."
            )
        self._model = SentenceTransformer(str(model_dir), device="cpu")

    @property
    def dimension(self) -> int:
        return int(self._model.get_embedding_dimension())

    def encode(self, texts: list[str]) -> np.ndarray:
        """Return float32 unit-length embeddings, shape (len(texts), dimension)."""
        vectors = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
        return np.ascontiguousarray(vectors, dtype=np.float32)


class PassageIndex:
    """In-memory FAISS index over a list of passages."""

    def __init__(self, embedder: Embedder, passages: list[str]) -> None:
        if not passages:
            raise ValueError("At least one passage is required")
        self._embedder = embedder
        self._passages = list(passages)
        self._index = faiss.IndexFlatIP(embedder.dimension)
        self._index.add(embedder.encode(self._passages))

    def __len__(self) -> int:
        return self._index.ntotal

    def search(self, query: str, top_k: int = 3) -> list[SearchHit]:
        """Return the ``top_k`` most similar passages, best first."""
        k = min(top_k, len(self))
        scores, ids = self._index.search(self._embedder.encode([query]), k)
        return [SearchHit(int(i), float(s), self._passages[i]) for s, i in zip(scores[0], ids[0]) if i >= 0]
