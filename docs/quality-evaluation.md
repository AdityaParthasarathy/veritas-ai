# Quality evaluation: out-of-domain detection and evidence retrieval

> **Edition note.** This document describes the **full edition** on the `main` branch (PostgreSQL, accounts, saved investigations, MiniLM + FAISS semantic retrieval). The Vercel edition on the `vercel-deployment` branch differs: see [vercel-edition.md](vercel-edition.md).

All numbers come from scripts in this repository and can be regenerated (commands below). Both evaluation sets were written by the project author, so labels reflect one person's judgement and the results should be read as indicative.

## 1. Out-of-domain (OOD) detection

**Problem.** The classifier only saw WELFake (mostly US political news, 2016-2017). On other kinds of text its output is meaningless however confident it looks. Observed before this work: a long encyclopedia article was labelled "unreliable" at 95% with only "moderate" uncertainty.

**Method** (`backend/app/ml/ood.py`). Score = cosine similarity between the document's TF-IDF vector and the centroid (mean vector) of the training documents. A document below the threshold is flagged. The threshold is the 5th percentile of the score on the **validation** split (0.0589), so about 5% of genuine in-domain text is flagged by design. Two candidate scores were compared on the held-out test split against the OOD set: centroid similarity (AUROC 0.975) and vocabulary coverage (AUROC 0.804). Centroid similarity was chosen.

**Results** (`python -m app.ml.domain_profile` writes `backend/ml_artifacts/domain_check.json`):

| Measure | Result |
| --- | --- |
| In-domain false-flag rate on the held-out test split | 5.46% of 9,366 articles |
| Hand-written out-of-domain texts flagged | 18 of 18 (12 genres: recipe, abstract, legal, fiction, documentation, forum, review, travel, textbook, finance, minutes, lyrical prose; plus 6 encyclopedia-style entries) |
| AUROC, test split vs OOD set | 0.974 |

**Caveats.**
- The 5th percentile was chosen after a first look at the OOD set (the 2nd percentile detected only 44%), so 18/18 is optimistic. The set is small and hand-written.
- Margins are thin for some samples (the closest, meeting minutes, scored 0.0586 against the 0.0589 threshold).
- The check measures vocabulary and style distance. It does not detect "not news", and very short texts also score low because they contain few known terms.
- It was evaluated on texts written for the purpose, not on a real stream of user input.

**Effect on the analysis.** An OOD text adds 2 uncertainty points (so "high" on its own, "very high" with one more reason), and the reason states the classification should not be relied on however confident it appears. The UI shows the domain check.

## 2. Evidence retrieval threshold

**Collection.** 70 paraphrased passages, 69 distinct institutional source pages (WHO, NASA, NOAA, USGS, NIST, NIH NHGRI, CERN, UN), every URL returning HTTP 200 on 2026-11-20. Passages were written for this project and were not reviewed line by line against their sources.

**Evaluation set** (`backend/data/evaluation/retrieval_eval.json`): 120 news-style queries, 75 positive (a passage in the collection addresses the subject; 2 flagged borderline) and 45 negative (35 unrelated topics and 10 near-miss topics the collection does not cover, such as vitamin C and colds or Saturn's rings). Queries avoid copying passage wording. They are split deterministically by hash into a dev half (56) used to choose the threshold and a test half (64) reported afterwards.

**Strict metrics.** A positive query is a hit only if the top-1 passage is acceptable *and* its score is at least the threshold; a score above the threshold with a wrong or no acceptable passage is a false positive.

| Measure | Result |
| --- | --- |
| Top-1 retrieval accuracy on positive queries (threshold-free, all 75) | 96.0% |
| Threshold chosen on dev (maximum F1, ties to the stricter value) | **0.40** (was 0.35) |
| Dev at 0.40 | precision 0.938, recall 0.938, F1 0.938 |
| **Test at 0.40** | precision 0.975, recall 0.907, F1 **0.940**, 0 of the negatives called related |
| Test at the old 0.35 | precision 0.976, recall 0.953, F1 0.965 |
| All 120 at 0.40 | precision 0.958, recall 0.920, F1 0.939; 0 of 45 negatives called related |
| All 120 at the old 0.35 | precision 0.922, recall 0.947, F1 0.934; 3 of 45 negatives (6.7%) called related |

**Reading the result honestly.** On the test half the old threshold would have scored slightly higher (F1 0.965 vs 0.940, a difference of about two queries, within noise for 64 queries). We kept 0.40 because it was chosen by the pre-set rule on dev, and because it favours precision. Over all 120 queries 0.40 has the higher F1 (0.939 vs 0.934) and no false "related" labels, while 0.35 labelled 3 of the 45 negatives related (negative scores: median 0.19, 95th percentile 0.36, maximum 0.399). The highest-scoring negative sits at 0.399, just under the 0.40 threshold, so that margin is thin. A false "related" label is more misleading to a reader than a missing one, which is why precision is preferred.

**Errors on the test half at 0.40:** two true passages scored just below the threshold (cancer 0.343, hypertension 0.371), one at 0.381 (comets), and one retrieval mistake: a query about Venus that mentions Mercury retrieved the Mercury passage (0.745).

**Caveats.** The test half is not independent of the author's judgement; queries are short, while long articles use several sentence queries (which can raise the best score); a high score means topical similarity only, not that the text is accurate or that the passage supports or contradicts it.

## 3. What uncertainty means

The level (moderate, high, very high) describes how far to trust *this analysis*. It is built from text length, domain distance, model indecision and evidence coverage. **A confident classifier never lowers it**, because the classifier's probability measures how strongly the text matches patterns in the training labels, not whether the content is true. The API returns this meaning with every result (`uncertainty.meaning`, `classification.confidence_note`) and tests assert it (`backend/tests/test_quality.py`).

## 4. Reproduce

```powershell
cd backend
python -m app.ml.train             # classifier (about 5 minutes; needs data/raw/WELFake_Dataset.csv)
python -m app.ml.domain_profile    # OOD profile and ml_artifacts/domain_check.json
python -m app.ml.retrieval_eval    # data/evaluation/retrieval_eval_results.json
python -m pytest tests/test_quality.py -q
```
