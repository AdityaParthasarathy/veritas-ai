# Final acceptance report

Date: 2026-11-20. Everything below was executed on the author's Windows 11 machine (Python 3.13.5, Node 22, Docker Desktop) against the running Docker stack unless stated otherwise. Nothing here has been run in a hosted environment.

## 1. Test and check results

| Check | Result |
| --- | --- |
| Backend tests, full local environment | **149 passed**, 0 failed, 0 skipped |
| Backend tests, minimal CI-like venv (no PyTorch, FAISS or spaCy) | **133 passed, 16 skipped** (ML-dependent tests skip cleanly), 0 failed |
| Frontend unit, integration and accessibility tests (Vitest) | **55 passed**, 0 failed |
| Frontend lint (oxlint) | 0 warnings, 0 errors |
| Frontend production build | succeeded |
| `bandit -r backend/app` | 0 issues |
| `npm audit` | 0 vulnerabilities |
| `pip-audit` (local venv) | findings only in `pip` and `setuptools`; none in runtime libraries; two packages (`torch+cpu`, `en_core_web_sm`) could not be audited |
| `docker compose config` and `docker compose build` | valid; both images built (backend 2.71 GB, frontend 75 MB) |
| Full stack in Docker (db, backend, frontend) | all three `healthy`; migrations applied on start; models loaded in the background in 12.5 to 17 s |

Backend test files: analysis 15, auth 24, health 5, history 8, ML data 5, retrieval 3, runtime 7, security 2, system 3, URL ingestion 77. Frontend: contrast 25, accessibility (axe) 9, Auth and Settings 8, Analyze 7, error mapping 6.

### Browser verification (Docker stack, built-in browser)
- **Desktop 1280 px:** register, URL analysis of a real public page (Wikipedia), results with source card, saved to history, history list, change password (old token returned 401, old password login 401, new token 200), delete account (redirect to login; database confirmed empty for that user and their analyses).
- **Mobile 375 px (emulated):** all 8 routes measured with zero horizontal overflow; drawer navigation opens, closes with Escape and is removed from the tab order when closed; a full URL analysis completed; protected route redirected anonymous users.
- **Keyboard:** the first Tab press shows the "Skip to main content" link with a visible focus ring; focus moves to the results region after an analysis.
- **Error states:** with the backend container stopped, the Overview, Analyze, Evidence and Performance pages each showed a clear message (Overview also a Retry button); the offline banner appeared and cleared.
- Screenshots were taken at desktop and mobile widths and inspected.

## 2. Requirements status

### Original product requirements
| Requirement | Status | Notes |
| --- | --- | --- |
| Accept news text, headlines and article URLs | Done | Pasted text/headline and public URLs. |
| Extract headline, body and source metadata | Done, imperfect | trafilatura; metadata can be wrong (observed: Wikipedia "author" returned "Authority control databases"). The UI says metadata may be wrong. |
| Preprocess with Python and spaCy | **Partial** | spaCy provides sentence segmentation, entities and tokens for signals and evidence queries. The classifier's own preprocessing is regex source-masking plus scikit-learn TF-IDF, not spaCy. |
| Classify with a trained NLP model | Done | TF-IDF + Logistic Regression on WELFake. No transformer was fine-tuned (deferred by instruction). |
| Measurable linguistic signals | Done | 12 descriptive signals; not used by the classifier. |
| Semantically related passages from a curated collection | Done, narrow | 34 passages, 33 verified sources, MiniLM + FAISS. |
| Show predictions, evidence, confidence, uncertainty | Done | Separate sections with disclaimers. |
| Store analyses and user information | Done | PostgreSQL, Alembic migrations, ownership isolation. |
| Show model performance and dataset limitations | Done | Served from the saved training run. |
| Distinguish classification from retrieved evidence; never claim proof | Done | Separate API sections and UI cards, wording tests. |

### Phase 5 priorities
| # | Priority | Status |
| --- | --- | --- |
| 1 | Safe URL ingestion and extraction | Done (77 tests plus live checks). |
| 2 | Password change and account deletion | Done (API tests, UI tests, browser run). |
| 3 | Efficient model loading at startup | Done: background preload, `GET /health/models`; first analysis after boot no longer pays the load cost if the load has finished. |
| 4 | Desktop and mobile browser verification | Done with the limits listed in section 4. |
| 5 | Accessibility and error states | Done and verified; fixed real defects found (see section 3). Manual screen-reader testing was not done. |
| 6 | Docker packaging | Done and run. |
| 7 | CI | Workflow written and validated as YAML; its commands were executed locally. **Not run on GitHub.** |
| 8 | End-to-end security and functionality review | Done: [security-review.md](security-review.md). |
| 9 | Submission documentation | Done (README, deployment, security review, this report, updated guides). |

## 3. Defects found during this phase and fixed

1. Muted text colour `#65748B` failed WCAG AA (3.5 to 4.1:1) and white text on the primary button was 3.3:1. Tokens changed; a 25-case contrast test now guards them.
2. axe found `role="tabpanel"` on a `<form>` (invalid). Moved to a wrapper element.
3. Simulating CI in a minimal environment exposed 13 failures and 2 errors: ML tests only checked that model *files* existed, not that the packages were installed. Guards now check both.
4. The 2 MB page-size cap rejected a normal Wikipedia article; raised to 5 MB (still bounded).
5. Overview text still said URL analysis and password change were "not planned" and the version string said `1.0.0-phase1`; both corrected after a screenshot review.
6. A short headline with no title previously produced no evidence query (fixed earlier in phase 3).

## 4. Unresolved issues and limitations

**Model and analysis quality (the most important caveats)**
- The classifier reflects WELFake's source-based labels (US political news, 2016-2017). It is **not** a fact-checker and degrades outside that domain. Observed: a 20,000-character Wikipedia article on photosynthesis was labelled "resembles unreliable sources" at 95%. The uncertainty rules did not catch this domain shift and reported "moderate". Domain-shift detection is not implemented.
- The evidence threshold (cosine 0.35) is a heuristic. For that same article the top passage was an unrelated climate passage at 0.363 and was flagged "related"; the collection has no photosynthesis passage. A larger collection and a tuned threshold are needed.
- The reference collection is 34 hand-written paraphrases on health, climate and space; they were not line-by-line verified against their sources.
- The system does not judge whether evidence supports or contradicts a text.

**Operational**
- GitHub Actions CI has not executed on GitHub. In CI the 16 ML-dependent backend tests skip because the model files are not in Git.
- The Docker backend image is large (2.7 GB) and depends on locally created ML files mounted at runtime; a fresh clone cannot run analysis until they are created (documented, about 10 minutes plus the WELFake download).
- No TLS, load testing, or production deployment was done. Rate limits are in memory and per process.
- Only a Chromium-based browser pane was used (no Firefox or Safari); mobile was emulated, not run on a device; no screen-reader testing.
- A token expiring in the middle of a session is covered by backend tests but was not exercised in the browser; reload with an invalid token was.
- No email verification or password reset. Registration reveals whether an email is taken.
- Client-side behaviour for URL fetches of script-rendered or paywalled pages is an error message, not a workaround.

## 5. Where to look

Run instructions: [README.md](../README.md), [deployment.md](deployment.md). Security evidence: [security-review.md](security-review.md). Model facts: [dataset-and-model.md](dataset-and-model.md).
