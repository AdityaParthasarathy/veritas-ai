"""Measurable linguistic signals.

These are *descriptive measurements* of the text (counts and ratios). They are not
a truthfulness score and are not fed into the classifier. Sensational and hedging
word lists are small, hand-picked heuristics that have not been validated against
labelled data; legitimate articles also contain these features.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

SENSATIONAL_TERMS = (
    "shocking", "unbelievable", "bombshell", "exposed", "breaking", "outrage", "miracle", "hoax",
    "scandal", "explosive", "devastating", "you won't believe", "they don't want you to know",
    "wake up", "share this", "must see", "urgent", "secret",
)
HEDGING_TERMS = ("allegedly", "reportedly", "apparently", "possibly", "reportedly", "may", "might", "could", "suggests")
ATTRIBUTION_PATTERNS = ("according to", " said ", " says ", " told ", " reported ", " announced ", " stated ")
QUOTE_CHARS = re.compile(r"[\"“”]")
_WORD = re.compile(r"[A-Za-z][A-Za-z'’-]*")


@dataclass(frozen=True)
class Signal:
    key: str
    label: str
    value: float
    unit: str
    description: str


def _per_thousand(count: int, words: int) -> float:
    return round(1000 * count / words, 2) if words else 0.0


def _count_phrases(lowered: str, phrases: tuple[str, ...]) -> int:
    return sum(len(re.findall(rf"\b{re.escape(p.strip())}\b", lowered)) for p in set(phrases))


def compute_signals(title: str, text: str, nlp) -> list[Signal]:
    """Compute signals for ``title`` + ``text`` using a loaded spaCy pipeline."""
    full = f"{title}. {text}".strip(" .") if title else text
    doc = nlp(full)
    lowered = full.lower()

    words = [t for t in doc if t.is_alpha]
    n_words = len(words)
    sentences = [s for s in doc.sents if len(s.text.strip()) > 0]
    caps = [t for t in words if t.text.isupper() and len(t.text) >= 3]
    pronouns = [t for t in doc if t.lower_ in {"i", "me", "my", "we", "us", "our", "you", "your"}]
    numbers = [t for t in doc if t.like_num]
    entities = [e for e in doc.ents]

    return [
        Signal("word_count", "Words", float(n_words), "words", "Length of the submitted text (title included)."),
        Signal("avg_sentence_length", "Average sentence length", round(n_words / len(sentences), 1) if sentences else 0.0, "words", "Mean words per sentence."),
        Signal("exclamation_marks", "Exclamation marks", _per_thousand(full.count("!"), n_words), "per 1,000 words", "Frequent exclamation is a common emphasis pattern; it also occurs in quotes and opinion writing."),
        Signal("question_marks", "Question marks", _per_thousand(full.count("?"), n_words), "per 1,000 words", "Rhetorical or headline questions."),
        Signal("all_caps_ratio", "ALL-CAPS words", round(len(caps) / n_words, 4) if n_words else 0.0, "share of words", "Words of 3+ letters written entirely in capitals. Acronyms such as NASA are included."),
        Signal("sensational_terms", "Sensational wording", _per_thousand(_count_phrases(lowered, SENSATIONAL_TERMS), n_words), "per 1,000 words", "Hits from a small hand-picked list (e.g. 'shocking', 'bombshell'). Not validated."),
        Signal("hedging_terms", "Hedging wording", _per_thousand(_count_phrases(lowered, HEDGING_TERMS), n_words), "per 1,000 words", "Words such as 'allegedly', 'may', 'could' that signal uncertainty."),
        Signal("attribution_markers", "Attribution markers", _per_thousand(sum(lowered.count(p) for p in ATTRIBUTION_PATTERNS), n_words), "per 1,000 words", "Phrases such as 'according to' and 'said' that tie statements to a speaker or source. Their presence does not show the source is reliable."),
        Signal("quotation_marks", "Quotation marks", float(len(QUOTE_CHARS.findall(full))), "count", "Quotation characters, a rough proxy for quoted speech."),
        Signal("named_entities", "Named entities", _per_thousand(len(entities), n_words), "per 1,000 words", "People, organisations, places and similar entities found by spaCy (en_core_web_sm); automatic and imperfect."),
        Signal("numeric_mentions", "Numeric mentions", _per_thousand(len(numbers), n_words), "per 1,000 words", "Numbers and number words."),
        Signal("first_second_person", "First/second-person pronouns", _per_thousand(len(pronouns), n_words), "per 1,000 words", "I, we, you and related forms, which indicate direct address or opinion."),
    ]
