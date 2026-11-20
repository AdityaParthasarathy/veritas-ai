"""Train and evaluate TF-IDF + Logistic Regression baselines on WELFake.

Run from the ``backend`` directory:

    python -m app.ml.train

Two variants are trained with identical splits and settings:

* ``baseline``       - cleaned text as-is.
* ``source_masked``  - publisher cues (agency datelines, outlet names) removed, to
                       measure how much performance depends on source shortcuts.

The hyper-parameter C is chosen on the validation split only. The test split is
scored exactly once per variant, after selection. Every number written to
``ml_artifacts/metrics.json`` comes from that run; nothing is hand-entered.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

from app.ml.data import clean, load_raw, mask_source_cues, split

BACKEND_DIR = Path(__file__).resolve().parents[2]
RAW_CSV = BACKEND_DIR.parent / "data" / "raw" / "WELFake_Dataset.csv"
ARTIFACT_DIR = BACKEND_DIR / "ml_artifacts"
SEED = 42
C_GRID = [0.5, 2.0, 8.0, 32.0, 128.0]
CLASS_NAMES = ["real", "fake"]  # index = is_fake


def evaluate(y_true, y_pred) -> dict:
    """Accuracy, per-class and macro precision/recall/F1, and the confusion matrix."""
    precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, labels=[0, 1], zero_division=0)
    macro = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "per_class": {
            name: {
                "precision": float(precision[i]),
                "recall": float(recall[i]),
                "f1": float(f1[i]),
                "support": int(support[i]),
            }
            for i, name in enumerate(CLASS_NAMES)
        },
        "macro_avg": {"precision": float(macro[0]), "recall": float(macro[1]), "f1": float(macro[2])},
        "confusion_matrix": {
            "labels": CLASS_NAMES,
            "rows_are": "true class",
            "columns_are": "predicted class",
            "matrix": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
        },
    }


def top_features(vectorizer, model, n: int = 20) -> dict:
    """Highest-weight n-grams per class, to expose shortcut features for inspection."""
    names = np.array(vectorizer.get_feature_names_out())
    order = np.argsort(model.coef_[0])
    return {"most_real": names[order[:n]].tolist(), "most_fake": names[order[-n:][::-1]].tolist()}


def run_variant(name: str, parts: dict, transform) -> dict:
    """Fit on train, select C on validation, score test once, save artifacts."""
    started = time.time()
    texts = {k: v["content"].map(transform) for k, v in parts.items()}
    y = {k: v["is_fake"].to_numpy() for k, v in parts.items()}

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=5,
        max_df=0.9,
        max_features=200_000,
        sublinear_tf=True,
        dtype=np.float32,
    )
    x_train = vectorizer.fit_transform(texts["train"])  # fitted on train only
    x_val = vectorizer.transform(texts["validation"])
    x_test = vectorizer.transform(texts["test"])

    search = []
    best = None
    for c in C_GRID:
        model = LogisticRegression(C=c, max_iter=2000, solver="liblinear", class_weight="balanced", random_state=SEED)
        model.fit(x_train, y["train"])
        val_f1 = precision_recall_fscore_support(y["validation"], model.predict(x_val), average="macro", zero_division=0)[2]
        search.append({"C": c, "validation_macro_f1": float(val_f1)})
        if best is None or val_f1 > best[0]:
            best = (val_f1, c, model)
    _, best_c, model = best

    result = {
        "variant": name,
        "vectorizer": {"vocabulary_size": len(vectorizer.vocabulary_), **{k: str(v) for k, v in vectorizer.get_params().items() if k in ("ngram_range", "min_df", "max_df", "max_features", "stop_words", "sublinear_tf")}},
        "model": {"type": "LogisticRegression", "selected_C": best_c, "class_weight": "balanced", "c_search": search},
        "validation": evaluate(y["validation"], model.predict(x_val)),
        "test": evaluate(y["test"], model.predict(x_test)),
        "top_features": top_features(vectorizer, model),
        "train_seconds": round(time.time() - started, 1),
    }
    ARTIFACT_DIR.mkdir(exist_ok=True)
    joblib.dump(vectorizer, ARTIFACT_DIR / f"{name}_tfidf_vectorizer.joblib", compress=3)
    joblib.dump(model, ARTIFACT_DIR / f"{name}_logreg_model.joblib", compress=3)
    return result


def main() -> None:
    raw = load_raw(RAW_CSV)
    cleaned, report = clean(raw)
    parts = split(cleaned, seed=SEED)  # raises on any cross-split leakage

    split_sizes = {
        k: {"rows": len(v), "fake": int(v["is_fake"].sum()), "real": int((v["is_fake"] == 0).sum())}
        for k, v in parts.items()
    }
    print("cleaning:", report)
    print("splits:", split_sizes)

    results = [
        run_variant("baseline", parts, lambda t: t),
        run_variant("source_masked", parts, mask_source_cues),
    ]
    for r in results:
        t = r["test"]
        print(f"{r['variant']}: C={r['model']['selected_C']} test acc={t['accuracy']:.4f} macro-F1={t['macro_avg']['f1']:.4f}")

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dataset": {"name": "WELFake", "source": "https://zenodo.org/records/4561253", "license": "CC-BY-4.0"},
        "label_convention": "is_fake: 1 = fake/unreliable, 0 = real (as found in the distributed CSV)",
        "cleaning": report.__dict__,
        "split": {"strategy": "stratified 70/15/15", "seed": SEED, "sizes": split_sizes, "leakage_check": "passed (content, body text and serial number disjoint across splits)"},
        "library_versions": {"scikit-learn": sklearn.__version__, "numpy": np.__version__},
        "variants": results,
    }
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"wrote {ARTIFACT_DIR / 'metrics.json'}")


if __name__ == "__main__":
    main()
