# Final acceptance report

> **Edition note.** This document describes the **full edition** on the `main` branch (PostgreSQL, accounts, saved investigations, MiniLM + FAISS semantic retrieval). The Vercel edition on the `vercel-deployment` branch differs: see [vercel-edition.md](vercel-edition.md).

Every requirement from the original assignment and from each later phase is mapped to its implementation, the evidence that it works, and any remaining limitation. Status values: **Done** (implemented and verified), **Partial** (implemented with a stated gap), **Not done**. Evidence names tests (in `backend/tests` or `frontend/src`) or commands that were actually run.

## 1. Verification summary

| Check | Result |
| --- | --- |
| Backend tests, full local environment | **172 passed**, 0 failed, 0 skipped |
| Backend tests, minimal environment (as in CI, no ML packages or model files) | **148 passed, 24 skipped** (ML-dependent tests skip cleanly), 0 failed |
| Frontend lint / tests / production build | lint clean; **57 tests passed**; production build succeeds |
| GitHub Actions on `main` (backend, frontend, Docker image build) | all 3 jobs **passing** (backend 148 passed / 24 skipped, frontend, Docker build); see the Actions tab of https://github.com/AdityaParthasarathy/veritas-ai |
| Clean clone on Windows (fresh clone, fresh virtualenv, empty database) | **passed** on 2026-11-21 (commit 6da4986, cloned to a short path): `.env` from `.env.example`, empty database migrated from zero, `scripts/setup-ml.ps1` downloaded models and WELFake (checksum verified) and retrained with **identical metrics** (0.9705 / 0.9637; out-of-domain 18/18), 172 backend tests passed with 0 skipped, API served the demo samples with the recorded results, frontend lint/57 tests/build passed, Docker images built |
| `bandit -r backend/app`, `npm audit` | 0 issues, 0 vulnerabilities |
| Secrets, personal identifiers, generated or large files in Git history | none found (scanned before publishing) |

Defects found by this verification and fixed in this phase: an over-broad `.gitignore` rule had kept `backend/app/models/*.py` out of Git (caught by the first GitHub Actions run; a guard test now reproduces it); the setup script failed under Windows PowerShell 5.1 (caught by the clean-clone test); the clean-clone test also exposed Windows' 260-character path limit when cloning into a deeply nested folder (now documented); bandit flagged an MD5 use and an `assert` in new code (caught by simulating CI before pushing); 51 public functions lacked docstrings (the original brief asked for them).

## 2. Original product requirements

| # | Requirement | Status | Implementation and evidence | Limitation |
| --- | --- | --- | --- | --- |
| 1 | Accept news content (text, headline, article URL) | Done | `POST /analysis`, `POST /analysis/url`; `test_analysis.py`, `test_url_ingest.py` (77 tests), `AnalyzePage.test.jsx` | URLs of paywalled, script-rendered or bot-blocking sites fail with a clear message |
| 2 | Extract headline, body and source metadata | Done | trafilatura in `services/url_ingest.py`; `test_article_text_and_metadata_are_extracted` | Metadata is automatic and can be wrong (observed wrong "author"); the UI warns |
| 3 | Preprocess text with Python and spaCy | **Partial** | spaCy supplies sentences, entities and tokens for signals and evidence queries (`ml/signals.py`, `ml/evidence.py`) | The classifier's own preprocessing is regex source-masking plus scikit-learn TF-IDF, not spaCy |
| 4 | Classify with a trained NLP model | Done | TF-IDF + Logistic Regression on WELFake (`ml/train.py`, `ml_artifacts/metrics.json`); `test_ml_data.py` | Reflects dataset labels (source reliability); not a fact-checker; no transformer was fine-tuned |
| 5 | Measurable linguistic signals | Done | 12 signals in `ml/signals.py`; `test_signals_detect_sensational_style` | Word lists are small and unvalidated |
| 6 | Retrieve semantically related passages from a curated collection | Done | 70 passages, MiniLM + FAISS (`ml/retrieval.py`, `ml/evidence.py`); `test_retrieval.py`; retrieval evaluation: 96.0% top-1 on 75 positive queries ([quality-evaluation.md](quality-evaluation.md)) | Narrow topics; passages are paraphrases not reviewed line by line; evaluation set is author-written |
| 7 | Display predictions, evidence, confidence and uncertainty warnings | Done | Separate result cards; `AnalyzePage.test.jsx`; browser verification at desktop and mobile widths | Confidence is explicitly not factual certainty (see 12) |
| 8 | Store analyses and user information in a database | Done | `users`, `analyses` tables, Alembic migrations; `test_history.py`, `test_auth.py`, `test_schema.py` (models match migrations) | |
| 9 | Display model performance and dataset limitations | Done | `GET /models/performance`, Model Performance page; `test_model_performance_matches_saved_metrics`; axe test | Figures are agreement with dataset labels |
| 10 | Distinguish classification from retrieved evidence; never claim a prediction proves truth | Done | Separate API sections and cards; disclaimers in every section; `test_analysis_response_keeps_sections_separate`, `test_false_claim_in_sober_style_is_not_detected_and_the_system_does_not_pretend_otherwise` (asserts no "verdict" anywhere) | A calmly written false claim is not detected (sample 3); this is documented and demonstrated |

## 3. Technology stack

| Requirement | Status | Notes |
| --- | --- | --- |
| React, Vite, JavaScript, Tailwind CSS, React Router, Axios, Lucide, Recharts | Done | Recharts is used on the Model Performance page |
| Python 3.11+, FastAPI, Uvicorn, Pydantic, Pydantic Settings, SQLAlchemy 2.x, Psycopg, Alembic, Pytest, HTTPX | Done | Python 3.13; httpx powers URL fetching; tests use the FastAPI test client |
| JWT library; Passlib with bcrypt | Done | PyJWT; passlib with `bcrypt==4.0.1` (passlib 1.7.4 is incompatible with bcrypt 5) |
| scikit-learn, Sentence Transformers, spaCy, PyTorch, FAISS | Done | CPU-only builds |
| Transformers | **Partial** | Installed as a dependency of sentence-transformers; no transformer model is trained or used directly (fine-tuning was out of scope) |
| PostgreSQL via Docker Compose | Done | `postgres:16-alpine`, health check, named volume |
| Git and GitHub | Done | https://github.com/AdityaParthasarathy/veritas-ai |

## 4. Architecture and repository structure

| Requirement | Status | Evidence |
| --- | --- | --- |
| Independent frontend and backend; modular backend; thin route handlers; business logic in services | Done | `backend/app/{api,core,database,models,repositories,schemas,services,ml}`; no `main.py` monolith |
| Database operations separate from business logic | Done | `app/repositories/` holds all SQL |
| Environment configuration; secrets never committed | Done | Pydantic Settings (`SECRET_KEY`, `DATABASE_URL` required); history scan |
| `/api/v1` versioning; consistent error handling; explicit CORS | Done | `test_cors_allows_local_frontend_only`, error-envelope tests |
| No DB credentials exposed to the frontend; no unnecessary microservices | Done | Browser only talks to the API; one backend service |
| Requested directory layout | **Partial** | Followed, with additions (`repositories`, `ml`, `scripts`, `data`, `.github`). `frontend/src/utils/` was not created because nothing needed it; `backend/app/utils/` exists as an empty package |

## 5. Phase 1 requirements (infrastructure)

| Requirement | Status | Evidence |
| --- | --- | --- |
| `GET /health/live` (no database dependency) | Done | `test_live_health_check_returns_200` |
| `GET /health/ready` with a real `SELECT 1`, 503 when unavailable | Done | `test_ready_health_check_with_active_database` (real PostgreSQL), failure-path test is the only mocked one |
| `GET /system/info` without secrets or filesystem paths | Done | `test_system_info_does_not_leak_secrets` |
| FastAPI metadata, Swagger, lifespan, validation, status codes, type hints, docstrings | Done | `docs/openapi.json` (kept current by `test_committed_openapi_spec_is_current`); all 47 backend modules and all 105 public functions have docstrings (checked programmatically) |
| No fake authentication or ML endpoints | Done | Real authentication was built later; no stubbed endpoints |
| Docker Compose database settings (name, user, env password, volume, health check, restart policy, port) | Done | `docker-compose.yml`; host port is configurable because another PostgreSQL held 5432 on the development machine |
| Root `.env.example`; Alembic configured; engine/session module | Done | Used verbatim by the clean-clone test |
| Premium, responsive frontend shell with the six navigation destinations | Done | Browser verification; 8 routes with no horizontal overflow at 375 px |
| Real backend and database status with loading, error and retry states; no mock data | Done | Browser run with the backend stopped; `useSystemStatus`; axe tests |
| Centralised Axios service and `VITE_API_BASE_URL`; frontend `.env.example` | Done | `src/services/api.js` |
| Security foundation (env config, `.gitignore`, explicit CORS, validation, safe errors, hashing and JWT prepared) | Done | [security-review.md](security-review.md) |
| Tests: startup, live, system info, ready with real DB, failure path mocked only there; frontend dev/build/lint scripts; production build | Done | Backend and frontend suites in section 1 |
| README, architecture and setup docs with PowerShell commands that match the implementation | Done | Followed unchanged in the clean-clone test, which found and fixed one script bug |
| Windows execution requirements (venv, activation and execution-policy note, `pip install`, uvicorn command, `npm run dev`, `docker compose up -d db`, status/log/stop commands) | Done | [setup-guide.md](setup-guide.md); the virtualenv is at the repository root rather than in `backend/` |
| Development rules (execute, fix errors, no fake responses, no critical TODOs, no invented results) | Done | No TODO/FIXME in source (grep); every figure in the docs comes from a generated file or a recorded run |
| Phase 1 acceptance checklist (16 items) | Done | All verified in Phase 1 and re-verified by the clean-clone test |

## 6. Phase 2 (dataset and baseline)

WELFake downloaded from the official Zenodo record with a verified MD5 and documented provenance; missing values, duplicates and class balance inspected and handled; stratified 70/15/15 split with a hard leakage check; TF-IDF + Logistic Regression trained; precision, recall, F1, accuracy and confusion matrices reported; vectorizer and model saved; limitations documented (source-based labels, the label-mapping discrepancy found in the file). **Done**. Evidence: `ml_artifacts/metrics.json`, `test_ml_data.py`, [dataset-and-model.md](dataset-and-model.md). Test accuracy 0.9705 (baseline) and 0.9637 (source-masked), which is agreement with dataset labels, not factual accuracy.

## 7. Phase 3 (ML environment and retrieval foundation)

Disk and Python checks, CPU-only PyTorch with no CUDA packages, compatible Sentence Transformers/Transformers/spaCy/FAISS, spaCy model and MiniLM downloaded and loaded, embedding and FAISS search verified with semantic (no-keyword-overlap) queries, exact versions pinned, model files kept out of Git with re-download instructions. **Done** (`test_retrieval.py`, `requirements*.txt`, [ml-setup.md](ml-setup.md), `scripts/setup-ml.ps1`).

## 8. Phase 4 and 5 (accounts, history, performance page, production readiness)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Registration, login, protected history with ownership isolation | Done | `test_auth.py` (24), `test_history.py` |
| Password change (revokes old tokens) and account deletion (cascade) | Done | `test_change_password_*`, `test_delete_account_*`, browser run |
| Safe URL ingestion and extraction | Done | `test_url_ingest.py` (77); live blocks of metadata IP and internal host |
| Efficient model loading at startup | Done | Background preload, `GET /health/models`; `test_runtime.py` |
| Desktop and mobile browser verification; accessibility and error states | Done | Screenshots and DOM checks; axe and contrast tests; defects fixed. Not tested: other browsers, physical devices, screen readers |
| Docker packaging of frontend, backend, PostgreSQL | Done | Full stack run and exercised in a browser; images build in CI |
| CI for backend tests, frontend tests, linting and builds | Done | Passing on GitHub (section 1) |
| End-to-end security and functionality review; submission documentation | Done | [security-review.md](security-review.md) |

## 9. Phase 6 quality requirements

| Requirement | Status | Evidence | Limitation |
| --- | --- | --- | --- |
| Out-of-domain detection with uncertainty warnings | Done | `ml/ood.py`, `ml/domain_profile.py`; `test_out_of_domain_sample_is_flagged`; 18 of 18 hand-written non-news texts flagged, 5.46% of 9,366 held-out news articles flagged | Threshold chosen after a first look at the out-of-domain set (optimistic), small author-written set, about 5% false flags by design |
| Evaluate and tune evidence relevance threshold on labelled examples | Done | `ml/retrieval_eval.py`, 120 labelled queries, dev/test split; threshold 0.35 to 0.40; 96.0% top-1 accuracy; test F1 0.940 (0.965 at the old value on the 64-query test half), all-query F1 0.939 vs 0.934 and 0 vs 3 of 45 negatives called related | Author-written labels; highest negative scored 0.399, so the margin is thin |
| Expand the curated collection with documented sources | Done | 34 to 70 passages, 69 source URLs each checked for HTTP 200 on 2026-11-20 | Paraphrases not reviewed line by line against sources |
| Test low-confidence predictions and unavailable-evidence scenarios | Done | `test_low_confidence_*`, `test_unavailable_evidence_is_reported_without_inventing_matches`, `test_analysis_still_works_when_the_domain_profile_is_missing` | |
| Uncertainty must not equate classifier confidence with factual certainty | Done | A confident classifier never lowers the level (`test_model_confidence_never_lowers_uncertainty`); `uncertainty.meaning` and `classification.confidence_note` in every response and in the UI | |

## 10. Phase 6 packaging requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Push the complete source to GitHub | Done | Public repository `AdityaParthasarathy/veritas-ai`, branch `main`; commits authored with the GitHub noreply address |
| GitHub Actions CI configured and passing | Done | Run linked in section 1 (all three jobs) |
| Verify backend tests, frontend tests, linting, production builds | Done | Section 1 |
| Clean-clone setup test on Windows | Done, with one fix | Section 1; found the PowerShell script defect |
| 5 to 10 minute demonstration script | Done | [demo-script.md](demo-script.md) (about 9 minutes) |
| Realistic sample inputs: normal, misleading, out-of-domain, insufficient evidence | Done | [samples/](samples/README.md) with recorded real outputs; used by `test_quality.py` |
| Final technical project report | Done | [technical-report.md](technical-report.md) |
| README, `.env.example`, database schema, API documentation, installation instructions verified | Done | Clean clone followed the README and `.env.example`; `test_migrations_match_the_models`; `test_committed_openapi_spec_is_current`; [database-schema.md](database-schema.md) written from the live database |
| No credentials, secrets or unnecessary generated files committed | Done | History scan (0 secret matches, 0 personal identifiers, no files over 1 MB, no caches); `test_no_source_files_are_git_ignored` and `test_large_local_artifacts_stay_ignored` |

## 11. Remaining limitations and unresolved issues

- **Not a fact-checker.** A style classifier on source-labelled 2016-2017 US political news; it cannot detect a calmly written false claim and degrades off-domain. Out-of-domain detection reduces but does not remove this.
- **Small, author-written evaluation sets** (18 out-of-domain texts, 120 retrieval queries) and a small reference collection; results are indicative, not independent.
- **Partial items:** spaCy is not used for the classifier's preprocessing; Transformers is installed only as a dependency.
- **Operational:** no TLS, load testing or production deployment; rate limits are in memory per process; no email verification or password reset; token stored in `sessionStorage`; backend image about 2.7 GB and dependent on locally created ML files.
- **Verification gaps:** one browser engine, emulated mobile only, no screen-reader testing; a token expiring mid-session was tested on the backend but not in a browser.
- **External:** some sites (for example Wikipedia) refuse automated fetches and the app reports the HTTP error.
