"""Fit and evaluate the out-of-domain profile.

Run from ``backend`` after ``python -m app.ml.train``:

    python -m app.ml.domain_profile

Uses the same cleaning and split as training (seed 42). The threshold comes from the validation split only;
the held-out test split gives the false-flag rate, and ``data/evaluation/ood_samples.json`` (hand-written
texts of other genres) gives the detection rate. Results are written to ``ml_artifacts/domain_check.json``.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.metrics import roc_auc_score

from app.ml.classifier import VARIANT
from app.ml.data import clean, load_raw, mask_source_cues, split
from app.ml.ood import THRESHOLD_PERCENTILE, fit_profile
from app.ml.paths import ARTIFACT_DIR, BACKEND_DIR
from app.ml.train import RAW_CSV, SEED

OOD_SAMPLES = BACKEND_DIR / "data" / "evaluation" / "ood_samples.json"


def main() -> None:
    vectorizer = joblib.load(ARTIFACT_DIR / f"{VARIANT}_tfidf_vectorizer.joblib")
    cleaned, _ = clean(load_raw(RAW_CSV))
    parts = split(cleaned, seed=SEED)

    def vectors(texts):
        return vectorizer.transform([mask_source_cues(t) for t in texts])

    train_x = vectors(parts["train"]["content"])
    val_x = vectors(parts["validation"]["content"])
    test_x = vectors(parts["test"]["content"])
    profile = fit_profile(train_x, val_x)

    test_scores = np.asarray(test_x @ profile.centroid).ravel()
    val_scores = np.asarray(val_x @ profile.centroid).ravel()
    samples = json.loads(OOD_SAMPLES.read_text(encoding="utf-8"))["samples"]
    ood_scores = np.asarray(vectors([s["text"] for s in samples]) @ profile.centroid).ravel()

    auroc = float(roc_auc_score(np.r_[np.zeros(len(test_scores)), np.ones(len(ood_scores))], -np.r_[test_scores, ood_scores]))
    pct = lambda a, q: round(float(np.percentile(a, q)), 4)  # noqa: E731
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "method": "cosine similarity of the document TF-IDF vector to the training-set centroid (source-masked vectorizer)",
        "threshold_rule": f"{THRESHOLD_PERCENTILE:g}th percentile of the validation-split score",
        "threshold": round(profile.threshold, 4),
        "note_on_threshold_choice": "The 5th percentile was chosen after a first look at the out-of-domain set (the 2nd percentile detected only 44%), so the detection rate below is optimistic. The set is small and hand-written; treat it as indicative.",
        "in_domain": {
            "validation_percentiles": {f"p{q}": pct(val_scores, q) for q in (1, 5, 25, 50, 75)},
            "test_percentiles": {f"p{q}": pct(test_scores, q) for q in (1, 5, 25, 50, 75)},
            "test_false_flag_rate": round(float(np.mean(test_scores < profile.threshold)), 4),
            "test_documents": int(len(test_scores)),
        },
        "out_of_domain": {
            "documents": len(samples),
            "detected": int(np.sum(ood_scores < profile.threshold)),
            "detection_rate": round(float(np.mean(ood_scores < profile.threshold)), 4),
            "per_sample": [{"id": s["id"], "genre": s["genre"], "similarity": round(float(v), 4), "flagged": bool(v < profile.threshold)} for s, v in zip(samples, ood_scores)],
        },
        "auroc_test_vs_out_of_domain": round(auroc, 4),
        "limitations": [
            "Measures vocabulary and style distance from the training articles, not whether text is news or true.",
            "Very short texts also score low because they contain few known terms.",
            "About 5% of genuine in-domain articles are flagged by construction.",
            "The out-of-domain set has few documents and was written by the project author.",
        ],
    }
    path = profile.save()
    (ARTIFACT_DIR / "domain_check.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"saved {path.name}; threshold={profile.threshold:.4f}")
    print(f"in-domain test false-flag rate: {summary['in_domain']['test_false_flag_rate']:.2%} of {len(test_scores)}")
    print(f"out-of-domain detected: {summary['out_of_domain']['detected']}/{len(samples)}; AUROC {auroc:.3f}")
    for row in summary["out_of_domain"]["per_sample"]:
        print(f"  {row['id']:30s} {row['similarity']:.4f} {'FLAGGED' if row['flagged'] else 'missed'}")


if __name__ == "__main__":
    main()
