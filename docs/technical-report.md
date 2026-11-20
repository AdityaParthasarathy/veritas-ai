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

Points: very short text (+2) or short text (+1); out-of-domain (+2); classifier near 0.5 (+1); no related evidence (+1). Zero or one point gives "moderate", two "high", three or more "very high". The level is never lower than "moderate".

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
- **Future work:** a larger, independently labelled evaluation; a stronger classifier trained and evaluated on more diverse sources (explicitly out of scope here); claim-level evidence checking with entailment; a larger, reviewed collection; shared rate limiting and TLS for deployment.
