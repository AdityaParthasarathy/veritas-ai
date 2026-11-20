"""Reads the saved training metrics and pairs them with documented limitations."""

import json
from pathlib import Path

from app.core.exceptions import ModelUnavailableException
from app.schemas.performance import Limitation, PerformanceResponse, VariantPerformance

from app.ml.paths import METRICS_PATH  # noqa: E402

VARIANT_DESCRIPTIONS = {
    "baseline": "Cleaned text as-is.",
    "source_masked": "Publisher cues (agency datelines, outlet names, Twitter markers) removed before training and scoring. This is the variant used by the analysis API.",
}

INTERPRETATION = (
    "These figures measure agreement with the dataset's labels on held-out articles from the same dataset. "
    "They are not a measure of factual accuracy and do not predict performance on other sources, topics, formats or time periods."
)

LIMITATIONS = [
    Limitation(title="Labels reflect sources, not fact-checks", detail="A 'fake' label means the article came from a source labelled unreliable; a 'real' label means a source labelled reliable. Reliable outlets publish errors and unreliable outlets publish accurate statements."),
    Limitation(title="Source and style shortcuts", detail="The model leans on publisher and formatting cues such as agency datelines, 'featured image', 'getty images' and weekday names. Masking outlet names lowered accuracy only slightly because many other cues remain."),
    Limitation(title="Narrow time and topic range", detail="WELFake merges four earlier datasets concentrated on US politics around 2016-2017. Performance is expected to drop on other topics, regions, recent events, headlines and social posts."),
    Limitation(title="Label mapping discrepancy", detail="The dataset description says 0 = fake and 1 = real, but the distributed file behaves the opposite way (counts and content). VERITAS AI treats 1 as fake; this was inferred, not confirmed by the authors."),
    Limitation(title="Duplicates and near-duplicates", detail="Exact duplicates were removed, concentrated in the fake class, which changes class balance. Lightly edited copies are not detected and may inflate scores."),
    Limitation(title="No independent verification", detail="The classifier does not check claims against evidence. Retrieved reference passages are shown separately and show topical relevance only."),
]


def get_performance() -> PerformanceResponse:
    if not METRICS_PATH.exists():
        raise ModelUnavailableException("Model metrics are not available. Train the model first (see docs/dataset-and-model.md).")
    data = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    variants = [
        VariantPerformance(
            variant=v["variant"],
            description=VARIANT_DESCRIPTIONS.get(v["variant"], ""),
            selected_C=v["model"]["selected_C"],
            vocabulary_size=v["vectorizer"]["vocabulary_size"],
            validation=v["validation"],
            test=v["test"],
            top_features=v["top_features"],
        )
        for v in data["variants"]
    ]
    return PerformanceResponse(
        dataset_name=data["dataset"]["name"],
        dataset_source=data["dataset"]["source"],
        dataset_license=data["dataset"]["license"],
        label_convention=data["label_convention"],
        generated_at=data["generated_at"],
        cleaning=data["cleaning"],
        split_strategy=data["split"]["strategy"],
        split_sizes=data["split"]["sizes"],
        leakage_check=data["split"]["leakage_check"],
        variants=variants,
        limitations=LIMITATIONS,
        interpretation=INTERPRETATION,
    )
