# Analysis API, evidence collection and uncertainty

## Endpoints (all under `/api/v1`)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/analysis` | Analyze `{ "title"?: str, "text": str }` (text 20 to 20,000 characters). |
| POST | `/analysis/url` | Analyze `{ "url": str }`: the server fetches the page, extracts the article, then runs the same analysis. Response adds a `source` object. |
| GET | `/health/models` | ML load status: `not_loaded`, `loading`, `ready` or `unavailable`. |
| GET | `/evidence/passages?topic=` | List the reference collection. |
| GET | `/evidence/search?q=&top_k=` | Semantic search over the collection (`q` 3 to 500 chars, `top_k` 1 to 10). |

Errors use the standard envelope. Invalid input returns 422 `VALIDATION_ERROR`. If the ML components are not installed or trained, the API returns 503 `MODEL_UNAVAILABLE` with a generic message. The models are loaded in a background thread at startup (`PRELOAD_MODELS`, about 15 s); a request that arrives while they are still loading waits for the load to finish, and later requests reuse them. Analyses are not stored yet (history arrives with authentication).

## URL analysis

`POST /analysis/url` fetches a public page and analyses the extracted article. The fetch is SSRF-protected: http/https on ports 80/443 only, no URL credentials, the server resolves the host and refuses unless **every** address is public, connects to the vetted IP (TLS still verified against the host name), follows at most 3 redirects and revalidates each hop, ignores proxy settings and cookies, accepts only HTML or plain text, and caps the download at 5 MB and 20 s. Requests are limited to 20 per minute per IP. Extraction uses trafilatura; the `source` object (`domain`, `final_url`, `title`, `author`, `published`, `extracted_chars`, `truncated`) is **automatic and can be wrong or missing**. Text is truncated to 20,000 characters.

Error codes (all with safe messages): `URL_BLOCKED` (private, local or reserved address, or a non-standard port; 422), `URL_REJECTED` (malformed or non-http URL; 422), `URL_UNSUPPORTED_CONTENT` and `URL_TOO_LARGE` (422), `EXTRACTION_FAILED` (paywalled, script-rendered or non-article page; 422), `URL_FETCH_FAILED` (DNS, timeout or HTTP error from the remote site; 502), `TOO_MANY_REQUESTS` (429). Details and tests: [security-review.md](security-review.md).

Known limitation: the page's domain says nothing about reliability, and encyclopedic or other non-news text is outside the classifier's training domain (see the acceptance report for a measured example).

## Response sections (kept separate on purpose)

1. `classification` (`machine_learning_classification`): the Phase 2 TF-IDF + Logistic Regression model, source-masked variant. Output is `probability_unreliable_style` and a label that says the text *resembles content from sources labelled unreliable/reliable*. It is not a fact-check, and the accompanying test accuracy is agreement with dataset labels on held-out articles from the same dataset.
2. `linguistic_signals`: descriptive measurements (exclamation marks, ALL-CAPS ratio, sensational and hedging wording per 1,000 words, attribution markers, named entities, numbers, quotation marks, pronouns, sentence length). They are computed with spaCy `en_core_web_sm`, are **not** inputs to the classifier, and are not a score. The sensational and hedging word lists are small, hand-picked and unvalidated.
3. `evidence` (`retrieved_reference_passages`): passages from the reference collection found by MiniLM embeddings and FAISS cosine similarity, using the title and up to 8 sentences as queries (or the whole text for very short input). Each hit has a similarity score, a `relevant` flag (score at least **0.40**) and a source link. The 0.40 threshold was tuned on a labelled query set (see [quality-evaluation.md](quality-evaluation.md)): it favours precision, so a passage is only called related when the match is clear. The system returns topical relevance only; it does not decide whether a passage supports or contradicts the text.
4. `uncertainty`: transparent rules, see below.

## Uncertainty rules

Points are added: text under 50 words (+2) or under 150 words (+1); **text out of the classifier's training domain (+2, see [quality-evaluation.md](quality-evaluation.md))**; classifier probability within 0.15 of 0.5 (+1); no related reference passage (+1). 0 to 1 points is `moderate`, 2 is `high`, 3 or more is `very_high`. **The level says how far to trust the analysis, not whether the content is true, and a confident classifier never lowers it** (the response returns this as `uncertainty.meaning` and `classification.confidence_note`). `uncertainty.domain_check` reports the similarity to the training data and the cut-off. The level is never "low" because the classifier is bound to its training data (WELFake: 2016-2017 US political news with source-based labels), and three standing caveats are always returned. These levels are heuristics, not calibrated probabilities.

## Reference collection

`backend/data/evidence/reference_passages.json`: 70 short passages in health, climate, space, earth science, physics, biology and society, linked to 69 distinct institutional pages (WHO, NASA, NOAA, USGS, NIST, NIH NHGRI, CERN, UN). Version 2 of the collection (34 passages in version 1).

- Passages are **paraphrased summaries written for this project**, not quotations. They have not been line-by-line reviewed against each page, so consult the linked source.
- Every URL returned HTTP 200 on 2026-11-20. Candidate pages that returned 403 or 404 to the checker (for example some CDC, IPCC and USGS pages) were left out rather than guessed.
- Coverage is narrow by design. A text outside these topics gets no related evidence, which says nothing about its accuracy. Contested political topics are excluded.

## Verified behaviour (see `backend/tests/test_analysis.py`)

- A climate article retrieves climate passages (CO2, sea level, warming) as related evidence.
- An unrelated text (a bakery story) gets no related evidence and an uncertainty reason saying so.
- A short headline is flagged high or very high uncertainty and still gets a retrieval query.
- Sensational text scores higher than a sober article on exclamation, ALL-CAPS and sensational-wording signals.
- Invalid input returns 422, and missing models return 503 without leaking paths or traces.

Observed limitation: on a short, loud headline the classifier can return a very confident label (for example 0.98 "unreliable"). That confidence reflects the model's training distribution, not reliability, which is why short inputs are flagged very uncertain.
