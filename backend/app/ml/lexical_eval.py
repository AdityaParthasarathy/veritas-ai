"""Evaluate lexical (TF-IDF) evidence retrieval and choose its relevance threshold.

Run from ``backend`` (needs only scikit-learn and numpy):

    python -m app.ml.lexical_eval

Same protocol as the evaluation of the semantic (MiniLM) retrieval that the full edition uses:
the labelled queries in ``data/evaluation/retrieval_eval.json`` go through the real retrieval function
(``EvidenceService.retrieve_for_article``) and are split deterministically into a dev half (md5 of the query is even)
and a test half. Everything is chosen on dev; test is reported afterwards.

Selection rule (in code): among the candidate vectorizer settings and thresholds, take the one with the highest strict F1
on dev **subject to two limits on false "related" flags**: at most 5% of negative labelled queries on dev, and at most 10%
of article-length text that the collection does not cover (``ARTICLE_SAMPLE`` held-out WELFake test articles: US political
news, 150+ words). Ties go to the stricter threshold. Calling an unrelated passage "related" is the more misleading error
for this tool than missing a related one.

History and disclosure (read this before trusting the numbers):
1. The first version of the rule had only the labelled-query limit. It chose threshold 0.20, and a review then showed that on
   article-length text 44.8% of out-of-collection articles got a "related" flag (the labelled queries are single sentences;
   articles use up to 8 sentence queries and keep the best score).
2. The article-level limit was **added after seeing that result**, and 0.25 follows from it. Test-half numbers for the
   candidates had also been seen in an earlier feasibility run. So no untouched test set remains; the numbers below describe
   the chosen configuration honestly but are not a blind estimate.
3. Article-level flags are an upper bound on false matches: the articles were not read one by one, and some may genuinely
   mention a topic in the collection.
Queries and labels were written by the project author.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone

import numpy as np

from app.ml.evidence import EvidenceService
from app.ml.lexical_retrieval import LexicalIndex
from app.ml.paths import BACKEND_DIR

EVAL_PATH = BACKEND_DIR / "data" / "evaluation" / "retrieval_eval.json"
RESULTS_PATH = BACKEND_DIR / "data" / "evaluation" / "lexical_retrieval_eval_results.json"
GRID = [round(x, 2) for x in np.arange(0.02, 0.71, 0.01)]
MAX_DEV_FALSE_RELATED = 0.05
MAX_ARTICLE_FALSE_RELATED = 0.10
ARTICLE_SAMPLE = 600
# The threshold the application uses (app.ml.uncertainty.RELEVANCE_THRESHOLD). The rule below selects 0.26 (identical dev metrics,
# ties go to the stricter value); the project owner chose 0.25, which satisfies both limits. The results file reports both.
DEPLOYED_THRESHOLD = 0.25
ARTICLE_SEED = 7
WELFAKE_CSV = BACKEND_DIR.parent / "data" / "raw" / "WELFake_Dataset.csv"
_SENTENCES = re.compile(r"(?<=[.!?])\s+")

CANDIDATES = {
    "word_1gram_stopwords": {"stop_words": "english", "sublinear_tf": True},
    "word_1-2gram_stopwords": {"stop_words": "english", "sublinear_tf": True, "ngram_range": (1, 2)},
    "word_1gram": {"sublinear_tf": True},
    "word_1-2gram": {"sublinear_tf": True, "ngram_range": (1, 2)},
    "char_wb_3-5gram": {"analyzer": "char_wb", "ngram_range": (3, 5), "sublinear_tf": True},
    "char_wb_4-6gram": {"analyzer": "char_wb", "ngram_range": (4, 6), "sublinear_tf": True},
}


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


def score_queries(queries: list[dict], params: dict) -> list[dict]:
    """Run every labelled query through the production retrieval function with the given vectorizer settings."""
    probe = EvidenceService()
    service = EvidenceService(index=LexicalIndex([p["passage"] for p in probe.passages], params))
    ids = {p["id"] for p in service.passages}
    rows = []
    for item in queries:
        if not set(item["expected"]) <= ids:
            raise ValueError(f"unknown passage id in {item}")
        hits = service.retrieve_for_article("", _SENTENCES.split(item["q"].strip()), top_k=3)
        top = hits[0] if hits else None
        rows.append({"q": item["q"], "expected": item["expected"], "borderline": bool(item.get("borderline")),
                     "split": split_of(item["q"]), "top1": top.id if top else None, "score": top.score if top else 0.0})
    return rows


def article_sentences() -> list[tuple[str, list[str]]]:
    """Held-out WELFake test articles (outside the collection's topics) as (title, sentences), split like production."""
    import spacy

    from app.ml.data import clean, load_raw, split  # training-side helpers: need pandas (requirements-dev.txt)

    test_df = split(clean(load_raw(WELFAKE_CSV))[0], seed=42)["test"]
    test_df = test_df[test_df["text"].str.split().str.len() >= 150].sample(ARTICLE_SAMPLE, random_state=ARTICLE_SEED)
    nlp = spacy.load("en_core_web_sm", exclude=["ner", "lemmatizer"])
    docs = nlp.pipe(test_df["text"].str.slice(0, 5000), batch_size=32)
    return [(title.strip(), [s.text.strip() for s in doc.sents]) for title, doc in zip(test_df["title"], docs)]


def article_top_scores(articles: list[tuple[str, list[str]]], params: dict) -> np.ndarray:
    """Best retrieval score per article for one vectorizer setting."""
    probe = EvidenceService()
    service = EvidenceService(index=LexicalIndex([p["passage"] for p in probe.passages], params))
    tops = []
    for title, sentences in articles:
        hits = service.retrieve_for_article(title, sentences)
        tops.append(hits[0].score if hits else 0.0)
    return np.array(tops)


def main() -> None:
    """Evaluate every candidate, choose one on dev, and write the results file."""
    queries = json.loads(EVAL_PATH.read_text(encoding="utf-8"))["queries"]
    articles = article_sentences()
    report = {}
    for name, params in CANDIDATES.items():
        rows = score_queries(queries, params)
        article_tops = article_top_scores(articles, params)
        dev = [r for r in rows if r["split"] == "dev"]
        test = [r for r in rows if r["split"] == "test"]
        admissible = [
            m for m in (metrics(dev, t) for t in GRID)
            if (m["false_related_rate_on_negatives"] or 0) <= MAX_DEV_FALSE_RELATED and float(np.mean(article_tops >= m["threshold"])) <= MAX_ARTICLE_FALSE_RELATED
        ]
        best = max(admissible, key=lambda m: (m["f1"], m["threshold"])) if admissible else None
        positives = [r for r in rows if r["expected"]]
        report[name] = {
            "params": {k: (list(v) if isinstance(v, tuple) else v) for k, v in params.items()},
            "top1_retrieval_accuracy_on_positives_all": round(sum(r["top1"] in r["expected"] for r in positives) / len(positives), 4),
            "dev_at_chosen": best,
            "test_at_chosen": metrics(test, best["threshold"]) if best else None,
            "all_at_chosen": metrics(rows, best["threshold"]) if best else None,
            "at_deployed_threshold": {
                "threshold": DEPLOYED_THRESHOLD,
                "dev": metrics(dev, DEPLOYED_THRESHOLD),
                "test": metrics(test, DEPLOYED_THRESHOLD),
                "articles_flagged_related": round(float(np.mean(article_tops >= DEPLOYED_THRESHOLD)), 4),
            },
            "article_level": {
                "articles": len(article_tops),
                "top_score_percentiles_p50_p75_p90_p95_p99": [round(float(x), 3) for x in np.percentile(article_tops, [50, 75, 90, 95, 99])],
                "flagged_related_at_chosen": round(float(np.mean(article_tops >= best["threshold"])), 4) if best else None,
                "flagged_related_at": {f"{t:.3f}": round(float(np.mean(article_tops >= t)), 4) for t in (0.20, 0.225, 0.25, 0.275, 0.30, 0.35)},
            },
        }
    eligible = {k: v for k, v in report.items() if v["dev_at_chosen"]}
    chosen = max(eligible, key=lambda k: (eligible[k]["dev_at_chosen"]["f1"], eligible[k]["dev_at_chosen"]["threshold"]))
    final = report[chosen]
    previous = json.loads((BACKEND_DIR / "data" / "evaluation" / "retrieval_eval_results.json").read_text(encoding="utf-8"))
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "retrieval_method": "tfidf_lexical (vectorizer fitted on the 70 passages only)",
        "collection_size": len(EvidenceService().passages),
        "queries": {"total": len(queries), "positive": sum(bool(q["expected"]) for q in queries)},
        "selection_rule": f"maximise strict F1 on dev subject to a false-related rate <= {MAX_DEV_FALSE_RELATED:.0%} on negative labelled queries (dev) and <= {MAX_ARTICLE_FALSE_RELATED:.0%} on {ARTICLE_SAMPLE} held-out out-of-collection WELFake articles; ties go to the stricter threshold (the article limit was added after seeing the first result, see the module docstring)",
        "chosen_variant": chosen,
        "rule_selected_threshold": final["dev_at_chosen"]["threshold"],
        "deployed_threshold": DEPLOYED_THRESHOLD,
        "deployed_threshold_note": "Chosen by the project owner. It satisfies both limits for the chosen variant and sits one grid step below the rule's own pick; dev metrics are identical, the rule's tie-break prefers the stricter value.",
        "chosen_threshold": DEPLOYED_THRESHOLD,
        "chosen": final,
        "all_candidates": report,
        "semantic_minilm_reference_from_the_full_edition": {
            "threshold": previous["chosen_threshold"],
            "top1_retrieval_accuracy_on_positives_all": previous["top1_retrieval_accuracy_on_positives_all"],
            "test_at_chosen": previous["test_at_chosen"],
            "note": "Recorded by the full edition (data/evaluation/retrieval_eval_results.json). Not re-run here: this edition does not ship the embedding model.",
        },
        "limitations": [
            "Queries and labels were written by the project author; the test half is not independent of the author's judgement.",
            "The queries paraphrase the passages and deliberately avoid copying their wording, which is the hardest case for lexical matching. Text that reuses a passage's vocabulary will match better.",
            "No untouched test set remains: the article-level limit was added after the first result, and test-half numbers for these candidates were seen in an earlier feasibility run (see the module docstring).",
            "Article-level flags are an upper bound on false matches; the articles were not read one by one.",
            "Scores are vocabulary overlap, not meaning: a high score means shared words, not that the text is accurate or that the passage supports it.",
        ],
    }
    RESULTS_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"chosen variant: {chosen}  rule-selected threshold={result['rule_selected_threshold']}  deployed threshold={DEPLOYED_THRESHOLD}")
    print("at deployed threshold:", final["at_deployed_threshold"])
    print("top-1 on positives:", final["top1_retrieval_accuracy_on_positives_all"])
    print("dev :", final["dev_at_chosen"])
    print("test:", final["test_at_chosen"])
    print("article-level false-related at chosen:", final["article_level"]["flagged_related_at_chosen"], final["article_level"]["flagged_related_at"])
    print("MiniLM reference test:", result["semantic_minilm_reference_from_the_full_edition"]["test_at_chosen"])
    for name, v in report.items():
        t = v["test_at_chosen"]
        print(f"  {name:26s} top1={v['top1_retrieval_accuracy_on_positives_all']:.3f} thr={v['dev_at_chosen']['threshold'] if v['dev_at_chosen'] else None} dev_f1={v['dev_at_chosen']['f1'] if v['dev_at_chosen'] else None} | test F1={t['f1'] if t else None} P={t['precision'] if t else None} R={t['recall'] if t else None} FPneg={t['false_related_rate_on_negatives'] if t else None}")


if __name__ == "__main__":
    main()
