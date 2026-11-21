"""Is the extracted text an article, or a menu, feed or index page?

Why this exists: the classifier was trained on whole news articles. A site's hub page (a mission page, a section front,
a home page) yields a patchwork of interface labels ("Featured Image", "Filters", "Learn More"), truncated teasers and
widget instructions. Scored as if it were one article, that text produces a confident but meaningless reading (see
docs/technical-report.md, "Investigation: a confident false positive on a hub page").

This check looks only at the *structure* of the extracted text. It knows nothing about publishers or topics, never
changes the classifier output and is never used to make the result look better. When it fires it only adds a warning
and raises the uncertainty level. It is a heuristic with measured limits, listed in the technical report.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

MIN_LINES_TO_JUDGE = 6  # fewer lines than this carries no structure to judge
SHORT_LINE_WORDS = 8
TEASER_LINES = 3  # lines cut off with an ellipsis, as feed teasers are
REPEATED_LABEL_COPIES = 3  # extra copies of identical short lines ("Learn More" four times)
SHORT_LINE_SHARE = 0.6  # most of the text is labels and headings

WARNING = (
    "The extracted text looks like a menu, feed or index page rather than a single article: {why}. "
    "The classifier was trained on whole articles, so its reading of this text is not meaningful."
)


@dataclass(frozen=True)
class ExtractionQuality:
    """Result of the structural check. ``reasons`` is empty when the text looks like an article."""

    looks_like_article: bool
    reasons: tuple[str, ...] = ()
    metrics: dict = field(default_factory=dict)

    @property
    def warning(self) -> str | None:
        """A user-facing sentence, or None when nothing looks wrong."""
        return None if self.looks_like_article else WARNING.format(why="; ".join(self.reasons))


def assess_extraction(text: str) -> ExtractionQuality:
    """Judge the line structure of extracted text. Text with too few lines is never judged."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    metrics = {"lines": len(lines)}
    if len(lines) < MIN_LINES_TO_JUDGE:
        return ExtractionQuality(True, (), metrics)

    short = [line for line in lines if len(line.split()) < SHORT_LINE_WORDS]
    teasers = [line for line in lines if re.search(r"(…|\.\.\.)$", line)]
    counts = Counter(line for line in short if re.search(r"[A-Za-z]", line))  # bullets and dashes are not labels
    repeated_extra = sum(n - 1 for n in counts.values() if n > 1)
    metrics.update(
        short_line_share=round(len(short) / len(lines), 3),
        truncated_teasers=len(teasers),
        repeated_label_copies=repeated_extra,
    )

    reasons: list[str] = []
    if len(teasers) >= TEASER_LINES:
        reasons.append(f"{len(teasers)} lines are cut off with an ellipsis, as feed teasers are")
    if repeated_extra >= REPEATED_LABEL_COPIES:
        label, n = counts.most_common(1)[0]
        reasons.append(f"the same short label (“{label}”) appears {n} times")
    if metrics["short_line_share"] >= SHORT_LINE_SHARE:
        reasons.append(f"{round(metrics['short_line_share'] * 100)}% of the lines are only a few words long")
    return ExtractionQuality(not reasons, tuple(reasons), metrics)
