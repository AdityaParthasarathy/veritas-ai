"""WELFake loading, cleaning, de-duplication and leakage-safe splitting.

Label convention used throughout VERITAS AI: ``is_fake`` = 1 for the dataset's
"unreliable/fake" class and 0 for its "real" class. In the distributed CSV the
raw ``label`` column already uses 1 = fake and 0 = real (this contradicts the
mapping printed in the dataset description; see docs/dataset-and-model.md).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

# Masking lives in app.ml.text_masking (importable without pandas); re-exported here for the training scripts.
from app.ml.text_masking import _SOURCE_PATTERNS, _WS, MAX_CHARS, mask_source_cues  # noqa: E402,F401


@dataclass
class CleaningReport:
    """Counts describing what the cleaning step did. Written to the data report."""

    raw_rows: int = 0
    missing_title: int = 0
    missing_text: int = 0
    dropped_empty_content: int = 0
    dropped_exact_duplicates: int = 0
    dropped_duplicate_text: int = 0
    dropped_conflicting_label_groups: int = 0
    dropped_conflicting_label_rows: int = 0
    final_rows: int = 0
    class_counts_raw: dict = field(default_factory=dict)
    class_counts_clean: dict = field(default_factory=dict)


def _normalize(value: str) -> str:
    return _WS.sub(" ", value.lower()).strip()


def load_raw(path: Path) -> pd.DataFrame:
    """Read the original CSV unchanged (the raw file is never modified)."""
    df = pd.read_csv(path)
    return df.rename(columns={"Unnamed: 0": "serial_no"})


def clean(raw: pd.DataFrame) -> tuple[pd.DataFrame, CleaningReport]:
    """Handle missing values and remove duplicates.

    * Missing title or text is replaced by "" (an article may legitimately lack one);
      rows with no usable content at all are dropped.
    * Duplicates are detected on whitespace/case-normalised content. If identical
      content carries conflicting labels, *every* copy is dropped (label is unreliable).
    * Rows sharing the same body text under different titles are also collapsed,
      so the same article cannot land in both train and test.
    """
    report = CleaningReport(raw_rows=len(raw))
    report.class_counts_raw = {int(k): int(v) for k, v in raw["label"].value_counts().items()}
    report.missing_title = int(raw["title"].isna().sum())
    report.missing_text = int(raw["text"].isna().sum())

    df = raw.rename(columns={"Unnamed: 0": "serial_no"}).copy()
    df["title"] = df["title"].fillna("").astype(str)
    df["text"] = df["text"].fillna("").astype(str)
    df["content"] = (df["title"].str.strip() + ". " + df["text"].str.strip()).str.strip(" .")
    empty = df["text"].str.strip().eq("") & df["title"].str.strip().eq("")
    # Title-only rows carry too little signal to be a fair "article"; require some body text.
    short = df["text"].str.strip().str.len() < 50
    drop = empty | short
    report.dropped_empty_content = int(drop.sum())
    df = df[~drop].copy()

    df["is_fake"] = df["label"].astype(int)
    df["content_key"] = df["content"].map(_normalize)
    df["text_key"] = df["text"].map(_normalize)

    for key, counter in (("content_key", "dropped_exact_duplicates"), ("text_key", "dropped_duplicate_text")):
        labels_per_key = df.groupby(key)["is_fake"].nunique()
        conflicted = labels_per_key[labels_per_key > 1].index
        if len(conflicted):
            mask = df[key].isin(conflicted)
            report.dropped_conflicting_label_groups += len(conflicted)
            report.dropped_conflicting_label_rows += int(mask.sum())
            df = df[~mask]
        before = len(df)
        df = df.drop_duplicates(subset=key, keep="first")
        setattr(report, counter, before - len(df))

    df = df.reset_index(drop=True)
    df["content"] = df["content"].str.slice(0, MAX_CHARS)
    report.final_rows = len(df)
    report.class_counts_clean = {int(k): int(v) for k, v in df["is_fake"].value_counts().items()}
    return df[["serial_no", "title", "text", "content", "is_fake", "content_key", "text_key"]], report


def split(df: pd.DataFrame, seed: int = 42) -> dict[str, pd.DataFrame]:
    """Stratified 70/15/15 split with a hard leakage check."""
    train, rest = train_test_split(df, test_size=0.30, stratify=df["is_fake"], random_state=seed)
    val, test = train_test_split(rest, test_size=0.50, stratify=rest["is_fake"], random_state=seed)
    parts = {"train": train, "validation": val, "test": test}
    assert_no_leakage(parts)
    return parts


def assert_no_leakage(parts: dict[str, pd.DataFrame]) -> None:
    """Raise if any article (by content or body text) appears in more than one split."""
    names = list(parts)
    for column in ("content_key", "text_key", "serial_no"):
        for i, a in enumerate(names):
            for b in names[i + 1 :]:
                overlap = set(parts[a][column]) & set(parts[b][column])
                if overlap:
                    raise AssertionError(f"Leakage: {len(overlap)} shared {column} values between {a} and {b}")
