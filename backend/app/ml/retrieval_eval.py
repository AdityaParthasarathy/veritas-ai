"""Evaluate and tune the evidence relevance threshold on labelled queries.

Run from ``backend`` (needs the embedding model and ML packages):

    python -m app.ml.retrieval_eval

Queries come from ``data/evaluation/retrieval_eval.json`` and go through the real retrieval function used by
the analysis API. They are split deterministically into a dev half (md5 of the query is even) and a test half.
The threshold is chosen on dev only; test is reported afterwards. Results are written to
``data/evaluation/retrieval_eval_results.json``.

Definitions (a query is "positive" when the collection should contain a relevant passage):
  TP  positive query, top-1 passage is an acceptable one and its score >= threshold
  FP  score >= threshold but the query is negative or the top-1 passage is not an acceptable one
  FN  positive query that is not a TP
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone

import numpy as np

from app.ml.evidence import EvidenceService
from app.ml.paths import BACKEND_DIR
from app.ml.retrieval import Embedder

EVAL_PATH = BACKEND_DIR / "data" / "evaluation" / "retrieval_eval.json"
RESULTS_PATH = BACKEND_DIR / "data" / "evaluation" / "retrieval_eval_results.json"
GRID = [round(x, 2) for x in np.arange(0.20, 0.71, 0.01)]
_SENTENCES = re.compile(r"(?<=[.!?])\s+")


def split_of(query: str) -> str:
    """Assign a query to the dev or test half by hash."""
    return "dev" if int(hashlib.md5(query.encode("utf-8"), usedforsecurity=False).hexdigest(), 16) % 2 == 0 else "test"


def metrics(rows: list[dict], threshold: float) -> dict:
    """Strict precision, recall and F1 of the relevance decision at ``threshold``."""
    tp = fp = fn = 0
    neg = [r for r in rows if not r["expected"]]
    for r in rows:
        above = r["score"] >= threshold
        correct = r["top1"] in r["expected"]
        if r["expected"]:
            if above and correct:
                tp += 1
            else:
                fn += 1
            if above and not correct:
                fp += 1
        elif above:
            fp += 1
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "threshold": threshold, "tp": tp, "fp": fp, "fn": fn,
        "precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4),
        "false_related_rate_on_negatives": round(sum(r["score"] >= threshold for r in neg) / len(neg), 4) if neg else None,
    }


def main() -> None:
    """Run the evaluation and write the results file."""
    queries = json.loads(EVAL_PATH.read_text(encoding="utf-8"))["queries"]
    service = EvidenceService(Embedder())
    ids = {p["id"] for p in service.passages}
    rows = []
    for item in queries:
        if not set(item["expected"]) <= ids:
            raise ValueError(f"unknown passage id in {item}")
        hits = service.retrieve_for_article("", _SENTENCES.split(item["q"].strip()), top_k=3)
        top = hits[0] if hits else None
        rows.append({
            "q": item["q"], "expected": item["expected"], "borderline": bool(item.get("borderline")),
            "near_miss": bool(item.get("near_miss")), "split": split_of(item["q"]),
            "top1": top.id if top else None, "score": top.score if top else 0.0,
        })
    dev = [r for r in rows if r["split"] == "dev"]
    test = [r for r in rows if r["split"] == "test"]

    dev_curve = [metrics(dev, t) for t in GRID]
    best = max(dev_curve, key=lambda m: (m["f1"], m["threshold"]))  # ties go to the stricter threshold
    chosen = best["threshold"]

    positives = [r for r in rows if r["expected"]]
    top1_accuracy = sum(r["top1"] in r["expected"] for r in positives) / len(positives)
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "collection_size": len(service.passages),
        "queries": {"total": len(rows), "positive": len(positives), "negative": len(rows) - len(positives),
                    "near_miss_negative": sum(r["near_miss"] for r in rows), "borderline": sum(r["borderline"] for r in rows),
                    "dev": len(dev), "test": len(test)},
        "threshold_selection": "maximise strict F1 on the dev half; ties go to the higher threshold",
        "chosen_threshold": chosen,
        "previous_threshold": 0.35,
        "top1_retrieval_accuracy_on_positives_all": round(top1_accuracy, 4),
        "dev_at_chosen": best,
        "test_at_chosen": metrics(test, chosen),
        "test_at_previous": metrics(test, 0.35),
        "all_at_chosen": metrics(rows, chosen),
        "all_at_previous": metrics(rows, 0.35),
        "all_at_chosen_excluding_borderline": metrics([r for r in rows if not r["borderline"]], chosen),
        "test_curve": [metrics(test, t) for t in GRID[::5]],
        "score_summary": {
            "positives_top1_correct": {f"p{q}": round(float(np.percentile([r["score"] for r in positives if r["top1"] in r["expected"]], q)), 3) for q in (5, 25, 50, 75)},
            "negatives": {f"p{q}": round(float(np.percentile([r["score"] for r in rows if not r["expected"]], q)), 3) for q in (50, 75, 95, 100)},
        },
        "limitations": [
            "Queries and labels were written by the project author; the test half is not independent of the author's judgement.",
            "Queries are short news-style sentences. Long articles use several sentence queries, which can raise the best score.",
            "The collection covers narrow topics, so a high score means topical similarity, not that the text is accurate.",
        ],
        "errors_on_test_at_chosen": [
            {"q": r["q"], "expected": r["expected"], "top1": r["top1"], "score": r["score"]}
            for r in test
            if (r["expected"] and not (r["top1"] in r["expected"] and r["score"] >= chosen)) or (not r["expected"] and r["score"] >= chosen)
        ],
    }
    RESULTS_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"collection={len(service.passages)} queries={len(rows)} dev={len(dev)} test={len(test)}")
    print(f"top-1 accuracy on positives (all): {top1_accuracy:.3f}")
    print(f"chosen threshold (dev F1): {chosen}   dev: {best}")
    print(f"test @ {chosen}: {result['test_at_chosen']}")
    print(f"test @ 0.35 : {result['test_at_previous']}")
    print(f"score summary: {result['score_summary']}")
    print(f"test errors at chosen: {len(result['errors_on_test_at_chosen'])}")
    for e in result["errors_on_test_at_chosen"][:12]:
        print("  ", e["top1"], e["score"], "expected", e["expected"], "|", e["q"][:70])


if __name__ == "__main__":
    main()
