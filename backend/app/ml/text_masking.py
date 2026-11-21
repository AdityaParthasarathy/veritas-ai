"""Publisher-cue masking, shared by training and inference.

This is the exact function the classifier was trained with (it used to live in ``app.ml.data``). It sits in its own
module so that inference does not have to import pandas and scikit-learn's model-selection code, which only training
needs. Changing a pattern here changes what the saved classifier sees, so the golden-output tests guard it.
"""

from __future__ import annotations

import re

MAX_CHARS = 20_000  # cap extreme outliers (max article is ~143k chars)
_WS = re.compile(r"\s+")

# Publisher cues the classifier could use as shortcuts instead of linguistic style.
_SOURCE_PATTERNS = [
    re.compile(r"^[A-Z][A-Za-z .,'/&-]{1,60}\((?:Reuters|AP)\)\s*[-–—]?\s*"),  # news-agency dateline
    re.compile(r"\b(?:Reuters|Associated Press|The New York Times|New York Times|Breitbart|Breitbart News)\b", re.I),
    re.compile(r"\b(?:Twitter|twitchy\.com|pic\.twitter\.com\S*)\b", re.I),
]


def mask_source_cues(text: str) -> str:
    """Remove obvious publisher markers (agency datelines, outlet names, Twitter embeds)."""
    for pattern in _SOURCE_PATTERNS:
        text = pattern.sub(" ", text)
    return _WS.sub(" ", text).strip()
