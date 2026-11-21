# Phase 2: Dataset, Baseline Model and Limitations

> **Edition note.** This document describes the **full edition** on the `main` branch (PostgreSQL, accounts, saved investigations, MiniLM + FAISS semantic retrieval). The Vercel edition on the `vercel-deployment` branch differs: see [vercel-edition.md](vercel-edition.md).

All numbers below are copied from `backend/ml_artifacts/metrics.json`, produced by `python -m app.ml.train` (reproducible: seed 42, identical results on rerun). Provenance of the data: [data/README.md](../data/README.md).

## Pipeline

1. **Load** the original CSV (72,134 rows), unmodified.
2. **Missing values:** 558 missing titles and 39 missing texts. A missing title/text becomes an empty string; rows with no title and no text, or with fewer than 50 characters of body text, are dropped (1,128 rows). Content = title + body, capped at 20,000 characters.
3. **Duplicates:** whitespace/case-normalised content duplicates (8,178 rows) and rows sharing the same body under a different title (391 rows) are collapsed. Identical content with conflicting labels would be removed entirely (found: 0 after the previous steps).
4. **Result:** 62,437 rows (34,615 real, 27,822 fake). Duplicates were concentrated in the fake class (37,106 to 27,822 rows), so the cleaned data is less balanced than the original.
5. **Split:** stratified 70/15/15, seed 42: train 43,705, validation 9,366, test 9,366. A hard check confirms that no content, body text or serial number appears in more than one split. Near-duplicates (lightly edited copies) are not detected and may remain.
6. **Features/model:** TF-IDF (unigrams and bigrams, English stop words, `min_df=5`, `max_df=0.9`, sublinear TF, up to 200,000 features) fitted on the training split only; Logistic Regression (`liblinear`, balanced class weights).
7. **Selection:** C chosen on validation macro-F1 from {0.5, 2, 8, 32, 128}; 128 won in both variants, and validation F1 was still rising slowly (0.9682 to 0.9688 from C=32 to 128), so the grid edge is a small caveat. The test split was scored once per variant after selection.

## Results (test split, 9,366 articles; positive class = fake)

| Variant | Accuracy | Macro F1 | Fake precision | Fake recall | Fake F1 | Real precision | Real recall | Real F1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline (text as-is) | 0.9705 | 0.9702 | 0.9660 | 0.9679 | 0.9670 | 0.9742 | 0.9727 | 0.9734 |
| Source-masked | 0.9637 | 0.9632 | 0.9615 | 0.9569 | 0.9592 | 0.9655 | 0.9692 | 0.9673 |

Confusion matrices (rows = true, columns = predicted; order real, fake):

- Baseline: `[[5051, 142], [134, 4039]]`
- Source-masked: `[[5033, 160], [180, 3993]]`

The *source-masked* variant removes agency datelines such as "(Reuters)", outlet names (Reuters, Associated Press, New York Times, Breitbart) and Twitter markers before vectorising. It is a robustness check, not a fix.

## What these numbers do and do not mean

- They measure how well the model reproduces **this dataset's labels** on held-out articles **from the same collection**. They are not a measure of factual accuracy and do not estimate performance on other sources, topics or years.
- High scores are largely explained by **source and style shortcuts**. The most influential baseline features include "reuters", "washington reuters", "york times" (towards real) and "featured image", "getty images", "twitter com" (towards fake). Masking outlet names only cost about 0.7 points of accuracy because many other cues remain: weekday names, "featured image", "getty images", "video", "breaking", and a dominant 2016-2017 US-politics timeframe.
- Labels appear to be assigned per **source/publisher**, not by fact-checking each article. A "fake" label means "came from a source labelled unreliable", and a "real" label means "came from a source labelled reliable". Reliable outlets publish errors and unreliable outlets publish accurate statements.
- The dataset is merged from four earlier datasets (Kaggle, McIntire, Reuters, BuzzFeed Political) and is concentrated on US politics around 2016-2017. A classifier trained on it will likely degrade on other topics, regions, formats (short headlines, social posts) and recent events.
- The label mapping in the dataset description disagrees with the file (see `data/README.md`); we infer 1 = fake from counts and content.

**Product consequence:** VERITAS AI presents this output only as a "similarity to the writing style and sources of the training labels" signal. It does not verify claims. Factual assessment must come from separately retrieved evidence (Phase 3), shown apart from the prediction and accompanied by uncertainty warnings.

## Artifacts

| File | Committed | Purpose |
| --- | --- | --- |
| `backend/ml_artifacts/metrics.json` | yes | Cleaning report, split sizes, parameters, all metrics, top features |
| `backend/ml_artifacts/baseline_tfidf_vectorizer.joblib`, `baseline_logreg_model.joblib` | no (git-ignored) | Baseline vectorizer and model |
| `backend/ml_artifacts/source_masked_*.joblib` | no (git-ignored) | Source-masked variants |

Regenerate: `cd backend; python -m pip install -r requirements-ml.txt; python -m app.ml.train` (about 5 minutes on this machine). Load artifacts only from files you trained yourself: joblib files are pickles and can run code when loaded.
