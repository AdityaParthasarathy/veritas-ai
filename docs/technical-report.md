# VERITAS AI: Technical Report

## 1. Summary

VERITAS AI is a web application that analyses a news article, a headline or a public article URL and returns four **separate** things: (1) a machine-learning classification of the text's writing style, (2) descriptive linguistic measurements, (3) reference passages retrieved by semantic similarity from a small curated collection, and (4) an uncertainty assessment of the analysis itself. It deliberately never claims that a text is true or false. The classifier is trained on a dataset whose labels come from the reliability of the publishing source, so it reports whether text *resembles content from sources labelled unreliable or reliable*, and the interface and API repeat that limit wherever a result is shown.

Everything described here is implemented, tested and runnable from a clean clone. Results quoted come from scripts and test runs in this repository; where a number comes from author-written test data, that is stated.

## 2. Design principles

1. **Separation.** Classification and retrieved evidence are separate sections in the API and separate cards in the UI. Evidence is never used to adjust the classifier, and the classifier never filters evidence.
2. **No verification claims.** Disclaimers accompany every section; tests assert their presence and that no "verdict" field exists.
3. **Uncertainty is about the analysis, not the claim.** The level rises with short text, out-of-domain text, an undecided model or missing evidence. A confident classifier never lowers it.
4. **Evidence over cleverness.** Where a number could mislead, it is shown with its caveat (for example the 96.4% figure is labelled "agreement with dataset labels, not real-world accuracy").
5. **Safe by default.** Server-side URL fetching is treated as a hostile-input feature.

## 3. Architecture

```
React (Vite build, nginx)  ->  FastAPI /api/v1  ->  services  ->  repositories (SQLAlchemy 2)  ->  PostgreSQL 16
                                     |
                                     +-- URL ingestion (SSRF-safe fetch + trafilatura extraction)
                                     +-- spaCy signals | TF-IDF + Logistic Regression | MiniLM + FAISS retrieval | uncertainty rules + OOD check
```

Routes are thin; business logic lives in `app/services`; all SQL lives in `app/repositories`; ML components are lazy-loaded once, in a background thread at startup, behind a lock. Configuration comes from environment variables (Pydantic Settings; `SECRET_KEY` and `DATABASE_URL` are required). The stack runs as three Docker services; see [deployment.md](deployment.md) and [architecture.md](architecture.md). Database: [database-schema.md](database-schema.md). API: [openapi.json](openapi.json) (kept current by a test) and [analysis-api.md](analysis-api.md).

## 4. Data

**Dataset:** WELFake (Zenodo record 4561253, CC-BY-4.0; 72,134 rows). The file's MD5 matches the published checksum. Provenance: [../data/README.md](../data/README.md).

**Finding:** the dataset description says `0 = fake, 1 = real`, but the distributed file behaves the other way (label 1 has the described *fake* count and is dominated by hyperpartisan content; label 0 contains 21,266 "(Reuters)" datelines against 16 in label 1). We treat **1 as fake**; this was inferred from counts and content, not confirmed by the authors.

**Cleaning:** 558 missing titles and 39 missing texts handled as empty strings; 1,128 rows with no usable body dropped; 8,178 exact and 391 same-body duplicates removed; no conflicting-label groups remained. Result: 62,437 rows (34,615 real, 27,822 fake). Duplicates were concentrated in the fake class, so the cleaned data is less balanced than the original.

**Split:** stratified 70/15/15 with a fixed seed (43,705 / 9,366 / 9,366), with a hard check that no content, body text or serial number appears in two splits. Near-duplicates are not detected.

## 5. Classifier

TF-IDF (unigrams and bigrams, English stop words, up to 200,000 features, fitted on train only) plus Logistic Regression (balanced class weights; C chosen on validation). Two variants were trained on identical splits; the API uses the **source-masked** one, which removes agency datelines, outlet names and Twitter markers.

| Variant | Test accuracy | Macro F1 | Confusion matrix (rows real, fake; columns real, fake) |
| --- | --- | --- | --- |
| Baseline | 0.9705 | 0.9702 | [[5051, 142], [134, 4039]] |
| Source-masked | 0.9637 | 0.9632 | [[5033, 160], [180, 3993]] |

**Reading these numbers.** They measure agreement with the dataset's labels on held-out articles from the same dataset. High scores are largely explained by source and style shortcuts (top features include "reuters", "featured image", "getty images"), and masking outlet names cost only about 0.7 points. The model does not verify facts and is expected to degrade on other topics, regions, years and short text. Details: [dataset-and-model.md](dataset-and-model.md).

## 6. Linguistic signals

Twelve descriptive measurements computed with spaCy (emphasis, ALL-CAPS ratio, sensational and hedging wording, attribution markers, named entities, numerals, quotations, pronouns, sentence length, length). They are not inputs to the classifier and not a score; the sensational and hedging word lists are small, hand-picked and unvalidated.

## 7. Evidence retrieval

**Collection:** 70 paraphrased passages (health, climate, space, earth science, physics, biology), each linked to an institutional page (WHO, NASA, NOAA, USGS, NIST, NIH NHGRI, CERN, UN). All 69 distinct URLs returned HTTP 200 on 2026-11-20. Passages are paraphrases written for this project and were not reviewed line by line against their sources.

**Method:** MiniLM (`all-MiniLM-L6-v2`, CPU) embeddings, FAISS inner-product index over normalised vectors (cosine similarity). The title and up to eight sentences are queries; each passage keeps its best match. A passage is called "related" only at or above a similarity threshold.

**Threshold tuning** ([quality-evaluation.md](quality-evaluation.md)): 120 labelled news-style queries (75 positive, 45 negative including 10 near-miss topics), split deterministically into dev and test halves. The threshold (0.35 to **0.40**) was chosen on the dev half by F1 and reported on the test half. Top-1 retrieval accuracy on positives is 96.0%. On the test half F1 is 0.940 at 0.40 (0.965 at the old 0.35); over all 120 queries 0.40 is better (F1 0.939 vs 0.934) and labels none of the 45 negatives related versus 3 at 0.35. The set is author-written, and the highest negative scored 0.399, so the margin is thin.

## 8. Uncertainty and out-of-domain detection

Points: very short text (+2) or short text (+1); out-of-domain (+2); a fetched page that looks like a menu, feed or index page rather than one article (+2, section 15); classifier near 0.5 (+1); no related evidence (+1). Zero or one point gives "moderate", two "high", three or more "very high". The level is never lower than "moderate".

**Out-of-domain check.** Cosine similarity between the text's TF-IDF vector and the training-set centroid, with the threshold at the 5th percentile of the validation scores. On the held-out test split 5.46% of 9,366 genuine articles are flagged (by design about 5%); 18 of 18 hand-written non-news texts (12 genres plus 6 encyclopedia-style entries) are flagged; AUROC 0.974. The 5th percentile was chosen after a first look at the out-of-domain set, so the detection rate is optimistic, and a few samples sit just under the threshold. It was motivated by an observed failure: an encyclopedia article labelled "unreliable" at 95% had earlier received only "moderate" uncertainty.

**What the level means** is returned with every result and asserted by tests: it describes how far the analysis can be trusted and says nothing about whether the content is true.

## 9. URL analysis and its security

`POST /analysis/url` fetches a user-supplied URL. Controls: http/https only on ports 80/443, no URL credentials; the server resolves the host and refuses unless every address is public (private, loopback, link-local, CGNAT, multicast, reserved, IPv4-mapped, 6to4, Teredo, NAT64 refused); the connection is pinned to the vetted IP while TLS still verifies the host name (defeats DNS rebinding); redirects are followed manually (three at most) and revalidated; proxies and cookies are ignored; HTML or text only; 5 MB and 20 s caps; 20 requests per minute per client. Article text and metadata are extracted with trafilatura; metadata is automatic and can be wrong (observed: a wrong "author" on an encyclopedia page), which the UI states. Some sites refuse automated requests (Wikipedia returned HTTP 403 to this client from one machine), which the app reports plainly. Review and evidence: [security-review.md](security-review.md).

## 10. Persistence and authentication

Tables `users` and `analyses` (Alembic migrations; a test fails if models and migrations diverge). Passwords are bcrypt-hashed (72-byte limit enforced); sessions are JWTs (30 minutes) carrying a per-user token version, so a password change revokes every older token. Login failures are throttled; unknown email and wrong password are indistinguishable. History is scoped to the owner (other users' items return 404); account deletion cascades to saved analyses. The token lives in memory and `sessionStorage`, a documented XSS trade-off.

## 11. Frontend and accessibility

React 19 with Tailwind: overview with live health, analyze (text and URL), evidence explorer, model performance (Recharts charts, confusion matrices, limitations), history, settings. Automated axe checks and a design-token contrast test run in CI; real defects found and fixed this way include a low-contrast text colour and an invalid ARIA role. Skip link, focus management, keyboard navigation, error boundary, offline banner and clear error states for each failure mode. Verified at desktop width and an emulated 375 px mobile width (no horizontal overflow on any page). Not tested: other browsers, physical devices, screen readers.

## 12. Packaging, CI and operations

Docker Compose runs PostgreSQL, the backend (non-root, migrations on start, background model preload) and the frontend (unprivileged nginx with a Content-Security-Policy). GitHub Actions runs backend tests with bandit, frontend lint/tests/build/audit and the image build; all jobs pass on the repository's `main` branch. The large, git-ignored ML files are created by `scripts/setup-ml.ps1` (checksum-verified dataset download, training, out-of-domain profile). A guard test prevents ignore rules from silently excluding source code (an earlier overly broad rule once did; the first GitHub Actions run caught it).

## 13. Verification summary

Exact counts and the requirement-by-requirement mapping are in [acceptance-report.md](acceptance-report.md). In short: backend and frontend test suites pass locally and in GitHub Actions; a clean clone passes the same checks and rebuilds the ML files from the README instructions; `bandit` and `npm audit` are clean; the full Docker stack was exercised in a browser.

## 14. Limitations and future work

- **Not a fact-checker.** Labels come from source reliability for 2016-2017 US political news; the classifier degrades elsewhere and cannot see that a calmly written false claim is false (sample 3 in [samples/README.md](samples/README.md) shows this).
- **Small, author-written evaluation sets** (18 out-of-domain texts, 120 retrieval queries) and a small reference collection (70 passages, narrow topics). Passages are paraphrases that were not reviewed line by line.
- **Out-of-domain detection is a heuristic** with a roughly 5% false-flag rate on genuine news by design.
- **Operational:** no TLS, load testing or production deployment; rate limits are in memory per process; no email verification or password reset; the backend image is large (about 2.7 GB).
- **Confident false positives on non-news science text remain.** A 2,900-word encyclopedia article on photosynthesis still reads 95% "unreliable" and passes the domain check; the structural page check in section 15 does not (and cannot) address it. See section 15.
- **Future work:** a larger, independently labelled evaluation; a stronger classifier trained and evaluated on more diverse sources (explicitly out of scope here); claim-level evidence checking with entailment; a larger, reviewed collection; shared rate limiting and TLS for deployment.

## 15. Investigation: a confident false positive on a hub page

*Investigated 2026-11-21. Nothing was retrained, no model file changed, and no publisher is treated specially anywhere.*

**Observed failure.** Analysing a space agency's mission hub page (`https://science.nasa.gov/mission/webb/`) returned: 610 words, 98.5% for the unreliable label, domain similarity 0.0869 against a cut-off of 0.0589 (so "in domain"), uncertainty "moderate", and a related reference passage at 0.78. Re-running the same URL through the production code reproduced every number exactly.

**Root cause (three stacked causes, in order of weight).**

1. *The input was not an article.* Trafilatura returned 32 lines: a news feed of six teasers cut off with "…", interface labels (`Featured Image`, `Latest News`, `Filters`, `Search Help: …`), widget instructions ("The image below is a SLIDESHOW. Hover over the image…"), the label `Learn More` four times, and only five descriptive paragraphs. Half the lines are under eight words. None of the extraction settings tried (favor_recall, default, no tables or links, de-duplication) changed this: a hub page has no single article body to find. Nothing is removed silently; the current behaviour is recorded in `tests/test_hub_page_regression.py`.
2. *The classifier learned web-scrape artefacts as "unreliable".* In the logit of 4.218, the intercept contributes +2.241 and the 240 features present net +1.978. Four interface words account for +4.335 of the positive side: `image` (+1.983; TF-IDF 0.0654 times weight 30.3), `featured image` (+0.914; weight 37.3), `featured` (+0.740) and `images` (+0.698). In the training split, "featured image" occurs in 5,876 of 43,705 articles and 99.98% of them carry the fake label ("getty images": 2,849 articles, 99.86%). These are formatting residue of particular scraped sites, not writing style. Removing only the words *image*, *images* and *featured* from the text moves the probability from 0.985 to 0.468 (diagnostic only, not a fix). The strongest pushes towards "reliable" were `nasa` (-0.409), `washington` (-0.351), `zoo` (-0.324), `science` (-0.310) and `space telescope` (-0.299).
3. *The default leans "unreliable".* A document with no informative features gets probability 0.904 from the intercept alone. Text from outside WELFake (encyclopedia or science prose) tends to have positive and negative feature contributions that cancel, so the intercept decides: for the Wikipedia article on photosynthesis the features net only +0.74 (+11.79 and -11.05) and the intercept of +2.24 does the rest, giving 95% "unreliable".

The out-of-domain check did not catch it because its cosine similarity depends heavily on length. On the validation split, cutting the same in-domain articles to their first 30, 60, 100, 200, 400 and 800 words flags 75%, 48%, 23%, 6.8%, 5.1% and 5.0% of them (median similarity 0.045 to 0.125). The hand-written out-of-domain set is 88-108 words per text, so it never exercised long, off-genre pages: the NASA hub text (similarity 0.0869) and the long Wikipedia pages (0.10-0.14) are above a threshold calibrated mostly on full-length news.

**Controlled comparisons** (unchanged model; `p` = probability for the unreliable label, `sim` = domain similarity, cut-off 0.0589):

| Input | Words | p | sim | In domain |
|---|---|---|---|---|
| A. Extracted text (production behaviour) | 615 | 0.986 | 0.0869 | yes |
| B. Interface lines removed by generic rules (short lines, "…" teasers, separator lines) | 328 | 0.662 | 0.0644 | yes |
| C. Hand-selected descriptive paragraphs only | 299 | 0.629 | 0.0581 | no |
| D. A with headings turned into sentences, repeated labels removed | 600 | 0.926 | 0.0849 | yes |
| Diagnostic: A without *image / images / featured* | 602 | 0.468 | 0.0822 | yes |

Cleaning helps a lot but does not make the text read "reliable": even the clean prose (C) sits at 0.63 and falls just below the domain cut-off, i.e. outside what the classifier was trained on. Other public pages through the same pipeline (single runs, exploratory): Wikipedia *James Webb Space Telescope* 0.87, Wikipedia *Photosynthesis* 0.95, WHO malaria fact sheet 0.18; three further hub or home pages (nasa.gov, a Hubble mission page, an Indian space agency home page) 0.89-0.98 with 97-138 words, all below the domain cut-off.

**Evaluation coverage.** The classifier is evaluated only on a random 15% split of WELFake (test accuracy 96.4% for the deployed variant), so the number measures agreement with that dataset's source-based labels, not accuracy on other genres. Keyword proxies on the training split suggest thin coverage elsewhere: about 4.5% of articles mention science or space terms, 2.3% India-related terms, 10% government-announcement phrases, while 65% mention US politics terms. Accuracy on the same validation articles drops from 96.0% to 89.6% when only the first 100 words are scored. There is no labelled evaluation for scientific news, Indian or other international news, educational articles, short reports or government announcements. Recommendation: build an independently labelled set (several hundred articles per genre, labelled by a method other than source reliability and by people who have not seen model output), keep it separate from training, validation and test, score it once, and report per-genre results. The WELFake test split must not be used for tuning.

**Calibration.** On the validation split the existing probabilities are well calibrated *in domain* (expected calibration error 0.0083, Brier 0.0297; 85.8% of predictions are above 0.95 or below 0.05). Two-fold cross-fitting inside the validation split (never the test split) gives ECE 0.0058 with Platt scaling and 0.0028 with isotonic regression, with essentially unchanged Brier scores (0.0294 and 0.0296). The gain is negligible, so no calibrator was deployed. More importantly, calibration cannot fix this failure: the probability is calibrated against WELFake's labels for WELFake-like text, and says nothing about other text. It must never be shown as the probability that content is false.

**Changes made.**

- `backend/app/services/extraction_quality.py`: a structural check on the extracted text (three or more "…" teaser lines, a short label repeated three or more extra times, or 60% or more of lines under eight words; text with fewer than six lines is never judged). It reads structure only (no publisher or topic list), never alters the classifier output, and is not used to hide warnings.
- When it fires, `POST /analysis/url` returns `source.extraction_warning` and adds +2 uncertainty points (`app/ml/uncertainty.py`). The OpenAPI file was regenerated.
- The report shows a "Read this before the result" region above the result for four cases: not an article, out of domain, short input (under 50 and under 150 words) and a probability near 0.5. For a non-article the headline reads "not meaningful for this text" and the observed reading is "Not meaningful here"; the measured probability is still displayed with its "not a N% probability that the article is fake" note. Evidence similarity never changes any warning or label (tested).

**Measured effect on the observed case.** Probability: 0.9855 before and after (unchanged by design). Domain check: unchanged. Uncertainty: moderate before, high after. The page now carries an explicit not-an-article warning and its style reading is labelled not meaningful. The false positive is **not fixed at the model level**; what changed is that the report no longer presents it as a finding.

**Measured limits of the structural check.** On 9,366 WELFake validation articles it flags 35 (0.37%; 2.4% of the 1,441 that have six or more lines, because WELFake text is mostly flattened). On live pages it flagged the hub page, nasa.gov and a WHO index page, and did not flag two Wikipedia articles and a WHO fact sheet. It missed the Hubble mission hub (11 lines) and an agency home page (10 lines); both are short and are below the domain cut-off anyway. It does not help with real articles that the classifier simply misreads (the photosynthesis article). Twelve real pages is a small sample, and the thresholds were set after seeing the hub page, so they are not independently validated.

**Tests.** Backend `tests/test_hub_page_regression.py` (14 tests): extraction (hub furniture passes through unchanged, real article still loses navigation), structural check (flags the recorded text, is independent of publisher words, does not flag articles, never judges text with under six lines), uncertainty arithmetic, and, when the model files are present, three characterisation tests that pin the unchanged classifier's behaviour, a test that the warning leaves probability, label, domain check and evidence scores identical, and an API test. The characterisation tests assert the failure still exists; update them together with this section if the classifier is ever retrained. Frontend: `reportModel.test.js` and `ResultWarnings.test.jsx` (8 tests), including an axe check.

**Recommended next steps (not done; each needs its own evaluation first).**

1. Build the independent multi-genre evaluation set above and score the current model on it before changing anything.
2. Reconsider the classifier on its own evidence: strip web-scrape artefacts (image captions, "featured image", "getty images", video labels) from the training text, evaluate on the new set, and compare against the present model. Retraining was deliberately not done in this investigation.
3. Replace or supplement the centroid domain check with one that is not length-dependent, validate it on long off-genre texts, and do not lower its sensitivity to silence warnings.
4. Present the classifier as "agreement with source-based labels" only, and keep evidence relevance separate from support, as now.
