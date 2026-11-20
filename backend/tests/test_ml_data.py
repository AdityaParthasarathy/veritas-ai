"""Unit tests for WELFake cleaning, splitting and leakage protection (synthetic data)."""

import pandas as pd
import pytest

from app.ml.data import assert_no_leakage, clean, mask_source_cues, split

BODY = "This is a sufficiently long article body used for testing purposes only. "


def _raw(rows):
    return pd.DataFrame(rows, columns=["Unnamed: 0", "title", "text", "label"])


def test_clean_handles_missing_and_duplicates():
    raw = _raw(
        [
            (0, "Title A", BODY + "alpha", 0),
            (1, "Title A", BODY + "alpha", 0),  # exact duplicate
            (2, None, BODY + "beta", 1),  # missing title is kept
            (3, "Only a title", None, 1),  # no body text -> dropped
            (4, "Other title", BODY + "alpha", 0),  # same body, different title -> collapsed
        ]
    )
    df, report = clean(raw)
    assert len(df) == 2
    assert report.missing_title == 1 and report.missing_text == 1
    assert report.dropped_empty_content == 1
    assert report.final_rows == 2


def test_conflicting_labels_are_dropped_entirely():
    raw = _raw([(0, "T", BODY + "gamma", 0), (1, "T", BODY + "gamma", 1), (2, "U", BODY + "delta", 1)])
    df, report = clean(raw)
    assert list(df["title"]) == ["U"]
    assert report.dropped_conflicting_label_rows == 2


def test_split_is_stratified_and_leak_free():
    rows = [(i, f"t{i}", BODY + f"unique {i}", i % 2) for i in range(400)]
    df, _ = clean(_raw(rows))
    parts = split(df, seed=1)
    assert sum(len(p) for p in parts.values()) == len(df)
    ratios = [p["is_fake"].mean() for p in parts.values()]
    assert max(ratios) - min(ratios) < 0.02
    assert_no_leakage(parts)


def test_leakage_check_detects_overlap():
    rows = [(i, f"t{i}", BODY + f"unique {i}", i % 2) for i in range(40)]
    df, _ = clean(_raw(rows))
    parts = split(df, seed=1)
    parts["test"] = pd.concat([parts["test"], parts["train"].head(1)])
    with pytest.raises(AssertionError):
        assert_no_leakage(parts)


def test_mask_source_cues():
    masked = mask_source_cues("WASHINGTON (Reuters) - Officials said the New York Times reported it.")
    assert "reuters" not in masked.lower() and "new york times" not in masked.lower()
    assert "Officials said" in masked
