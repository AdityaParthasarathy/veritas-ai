"""Rule-based uncertainty assessment.

What the level means: how much to trust *this analysis*, not whether the content is true. The rules look only at
the input and the analysis (length, domain distance, model indecision, evidence coverage). In particular a very
confident classifier never lowers the level: classifier confidence measures how strongly the text matches
patterns in the training labels, not how likely the claims are to be true. Because the classifier is bound to its
training dataset, the lowest level is "moderate": the system never reports low uncertainty.

The levels are transparent heuristics, not calibrated probabilities.
"""

from __future__ import annotations

from dataclasses import dataclass, field

SHORT_TEXT_WORDS = 50
MEDIUM_TEXT_WORDS = 150
BORDERLINE_MARGIN = 0.15  # |p - 0.5| below this counts as near the decision boundary
RELEVANCE_THRESHOLD = 0.25  # minimum TF-IDF cosine similarity to call a passage related; chosen by app.ml.lexical_eval under its two false-related limits (see data/evaluation/lexical_retrieval_eval_results.json)

MEANING = (
    "This level describes how far the analysis itself can be trusted. It says nothing about whether the content is "
    "true or false, and a confident model result does not reduce it."
)

STANDING_CAVEATS = (
    "The classifier was trained on WELFake, a 2016-2017 era collection of mostly US political news whose labels come from source reliability, not article-by-article fact-checking.",
    "The classifier's probability measures how strongly the text matches patterns in the training labels. A high probability does not mean the content is false, and a low probability does not mean it is true. It is not factual certainty.",
    "Retrieved passages come from a small curated collection and show topical relevance only; the system does not check whether a passage supports or contradicts the text.",
)


@dataclass
class UncertaintyAssessment:
    level: str  # "moderate" | "high" | "very_high"
    points: int
    reasons: list[str] = field(default_factory=list)
    standing_caveats: list[str] = field(default_factory=list)
    meaning: str = MEANING


def assess(
    word_count: int,
    probability_unreliable: float,
    top_evidence_score: float | None,
    domain_similarity: float | None = None,
    domain_threshold: float | None = None,
    extraction_warning: str | None = None,
) -> UncertaintyAssessment:
    """Combine simple, explainable checks into an uncertainty level."""
    points = 0
    reasons: list[str] = []

    if extraction_warning:  # the text is not an article (menu, feed or index page); see services/extraction_quality.py
        points += 2
        reasons.append(extraction_warning)

    if word_count < SHORT_TEXT_WORDS:
        points += 2
        reasons.append(f"The text is very short ({word_count} words). The classifier was trained on full articles, so short inputs such as headlines are far outside its training range.")
    elif word_count < MEDIUM_TEXT_WORDS:
        points += 1
        reasons.append(f"The text is shorter ({word_count} words) than most training articles, which reduces reliability.")

    if domain_similarity is not None and domain_threshold is not None and domain_similarity < domain_threshold:
        points += 2
        reasons.append(
            "This text looks unlike the articles the classifier was trained on (different vocabulary or genre; "
            f"similarity {domain_similarity:.3f} is below the {domain_threshold:.3f} cut-off). "
            "The classification is outside its training domain and should not be relied on, however confident it appears."
        )

    if abs(probability_unreliable - 0.5) < BORDERLINE_MARGIN:
        points += 1
        reasons.append("The classifier probability is close to 0.5, so the model is effectively undecided.")

    if top_evidence_score is None or top_evidence_score < RELEVANCE_THRESHOLD:
        points += 1
        reasons.append("No passage in the reference collection is clearly related to this text. The collection is small, so this says nothing about whether the content is accurate.")

    level = "very_high" if points >= 3 else "high" if points >= 2 else "moderate"
    return UncertaintyAssessment(level, points, reasons, list(STANDING_CAVEATS))
