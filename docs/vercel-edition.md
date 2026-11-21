# The Vercel edition

A lightweight edition of VERITAS AI built for Vercel's free Hobby plan. It lives on the `vercel-deployment` branch; the full edition on `main` is unchanged.

## What is the same
- The original **TF-IDF + Logistic Regression classifier** (`source_masked` variant) and its **unchanged artefacts**. Their SHA-256 hashes are recorded in `backend/ml_artifacts/MANIFEST.sha256` and checked by `backend/tests/test_original_parity.py`.
- Classifier **predictions are identical** to the original implementation: the tests compare label, probability, domain similarity and threshold for 18 fixed inputs against values recorded from `main` (`backend/tests/fixtures/original_pipeline_golden.json`).
- All **12 linguistic indicators** (spaCy `en_core_web_sm`, including named entities), the **domain / out-of-domain check**, the **uncertainty assessment**, all **70 reference passages**, pasted-text analysis, **URL analysis**, the report, and the visual design.

## What changed
| Area | Full edition | Vercel edition |
| --- | --- | --- |
| Evidence retrieval | MiniLM sentence embeddings + FAISS (semantic) | **TF-IDF cosine similarity (lexical)**: finds passages that share words with the text |
| Accounts, sign-in, saved investigations | Yes (JWT, PostgreSQL) | **Removed.** Nothing is stored; `analysis_id` is always `null` |
| Database | PostgreSQL 16 + Alembic | **None.** `/health/ready` reports `database: "not_used"` |
| ML dependencies | PyTorch, Transformers, sentence-transformers, FAISS | **None of these.** NumPy, SciPy, scikit-learn, spaCy |
| Hosting | Docker Compose (nginx, FastAPI, PostgreSQL) | Two Vercel projects: static frontend + Python function |
| Relevance cut-off | 0.40 (cosine of sentence embeddings) | **0.25** (cosine of TF-IDF vectors) |

## The lexical retrieval limitation (measured)
`backend/app/ml/lexical_eval.py` evaluates retrieval on the same 120 author-written labelled queries and the same dev/test split as the full edition, and on 600 held-out WELFake test articles that the collection does not cover. Results: `backend/data/evaluation/lexical_retrieval_eval_results.json`.

**Threshold: 0.25.** The selection rule maximises dev F1 subject to two limits on false "related" flags: at most 5% of negative labelled queries (dev) and at most 10% of the out-of-collection articles. Character 3 to 5-gram TF-IDF was selected. The rule's own pick is 0.26 (identical dev metrics, ties go to the stricter value); the project owner chose 0.25, which satisfies both limits. Both are recorded in the results file.

| Test half (64 queries) | Semantic (full edition, 0.40) | Lexical (this edition, 0.25) |
| --- | --- | --- |
| Precision | 0.975 | 0.912 |
| Recall | 0.907 | 0.721 |
| F1 | 0.940 | 0.805 |
| Unrelated queries flagged "related" | 0% | 9.5% |
| Top-1 passage correct (all positive queries) | 0.96 | 0.907 |
| Out-of-collection articles flagged "related" (600 WELFake test articles) | not measured | 9.3% (upper bound) |

**How the threshold was reached, and what it cost.** The first version of the rule used only the labelled queries and chose 0.20. A review then showed that on article-length text 44.8% of out-of-collection articles received a "related" flag (articles use up to 8 sentence queries and keep the best score, which raises scores). The article-level limit was added **after seeing that result**, and 0.25 followed. No untouched test set remains: the labelled test half had also been seen in an earlier feasibility run. The article-level rate is an upper bound because the articles were not read one by one. At 0.25, recall on related passages is 0.72 on the test half: more genuinely related passages are not flagged than in the full edition.

In practice: a passage on the same subject written in different words can be **missed**, and an unrelated text can occasionally get a weakly **"related"** passage (scores near the cut-off; look at the score, not only the flag). Retrieval never judges whether a passage supports or contradicts a text. The labels were written by the project author, and the queries deliberately avoid the passages' wording (the hardest case for lexical matching).

## Serverless behaviour
- **Cold start:** the first analysis on a new instance loads spaCy and the classifier files (a few seconds); later requests reuse the instance. Components load lazily on the first analysis request (`PRELOAD_MODELS=false`), because a serverless instance can be paused once requests finish.
- **No shared state:** the URL-analysis rate limiter is per instance, so it slows one client down but is not a strict global limit.
- **No persistence:** a report exists only in the browser tab until it is copied or downloaded.
