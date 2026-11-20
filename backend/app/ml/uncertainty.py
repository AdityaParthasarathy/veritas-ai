"""Rule-based uncertainty assessment.

The levels are transparent heuristics, not calibrated probabilities. Because the
classifier is bound to its training dataset, the lowest level is "moderate": the
system never reports low uncertainty.
"""

from __future__ import annotations

from dataclasses import dataclass, field

SHORT_TEXT_WORDS = 50
MEDIUM_TEXT_WORDS = 150
BORDERLINE_MARGIN = 0.15  # |p - 0.5| below this counts as near the decision boundary
RELEVANCE_THRESHOLD = 0.35  # minimum cosine similarity to call a reference passage related

STANDING_CAVEATS = (
    "The classifier was trained on WELFake, a 2016-2017 era collection of mostly US political news whose labels come from source reliability, not article-by-article fact-checking.",
    "A classifier result describes similarity to the training labels' writing style and sources. It cannot establish whether the claims are true.",
    "Retrieved passages come from a small curated collection and show topical relevance only; the system does not check whether a passage supports or contradicts the text.",
)


@dataclass
class UncertaintyAssessment:
    level: str  # "moderate" | "high" | "very_high"
    points: int
    reasons: list[str] = field(default_factory=list)
    standing_caveats: list[str] = field(default_factory=list)


def assess(word_count: int, probability_unreliable: float, top_evidence_score: float | None) -> UncertaintyAssessment:
    """Combine simple, explainable checks into an uncertainty level."""
    points = 0
    reasons: list[str] = []

    if word_count < SHORT_TEXT_WORDS:
        points += 2
        reasons.append(f"The text is very short ({word_count} words). The classifier was trained on full articles, so short inputs such as headlines are far outside its training range.")
    elif word_count < MEDIUM_TEXT_WORDS:
        points += 1
        reasons.append(f"The text is shorter ({word_count} words) than most training articles, which reduces reliability.")

    if abs(probability_unreliable - 0.5) < BORDERLINE_MARGIN:
        points += 1
        reasons.append("The classifier probability is close to 0.5, so the model is effectively undecided.")

    if top_evidence_score is None or top_evidence_score < RELEVANCE_THRESHOLD:
        points += 1
        reasons.append("No passage in the reference collection is clearly related to this text. The collection is small, so this says nothing about whether the content is accurate.")

    level = "very_high" if points >= 3 else "high" if points >= 2 else "moderate"
    return UncertaintyAssessment(level, points, reasons, list(STANDING_CAVEATS))
