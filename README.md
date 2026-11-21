# VERITAS AI (Vercel edition)

A statistical text-analysis instrument. It analyzes pasted text or a public article URL and gives **three separate readings**: how the writing resembles the labelled training data (style), which reference passages share wording with the text (evidence relevance), and how far to trust the analysis itself (uncertainty). **None of them establishes whether content is true or false.**

> This is the lightweight edition on the `vercel-deployment` branch, built for Vercel's free Hobby plan. It has no accounts, no saved investigations and no database, and it retrieves evidence **lexically (TF-IDF)** instead of semantically. The full edition (PostgreSQL, accounts, MiniLM + FAISS) is on `main`. What is preserved and what changed, with measured numbers: [docs/vercel-edition.md](docs/vercel-edition.md).

> The classifier learns the writing style and sources of one dataset's labels. It does not fact-check. Read [docs/dataset-and-model.md](docs/dataset-and-model.md) for what the numbers do and do not mean.

## What it does

| Feature | Notes |
| --- | --- |
| Analyze pasted text or an article URL | URL fetching is SSRF-protected; article text and metadata are extracted automatically. |
| Classification | The original TF-IDF + Logistic Regression model trained on WELFake (artefacts unchanged and SHA-256 pinned); reported as "resembles unreliable/reliable sources", not truth. |
| Linguistic indicators | 12 descriptive measurements (spaCy): emphasis, ALL-CAPS, sensational and hedging wording, attribution, named entities, etc. |
| Evidence retrieval | TF-IDF lexical similarity over a small curated collection of 70 passages with verified source links. It finds shared words, not meaning. |
| Uncertainty | Transparent rules: short text, text outside the training domain, a page that does not look like an article, an undecided model, no related evidence. Never lower than "moderate". |
| Casebook, Library, Method pages | Six invented demonstration cases (re-recorded with this edition), the reference collection, and the measured model limits. |

## Stack
- Frontend: React 19, Vite, Tailwind CSS 3, React Router, Axios, Recharts, Lucide. Tests: Vitest, Testing Library, axe.
- Backend: Python 3.13, FastAPI, Pydantic Settings, httpx, trafilatura, scikit-learn, spaCy (no PyTorch, no FAISS, no database).
- Hosting: two Vercel projects (static frontend + Python function). CI: GitHub Actions.

## Architecture
```
Browser -> Vercel frontend (static) --rewrite /api--> Vercel function (FastAPI)
                                                       +-- URL ingestion (SSRF-safe fetch + extraction)
                                                       +-- spaCy indicators | TF-IDF classifier | TF-IDF evidence | uncertainty rules
```
Details: [docs/architecture.md](docs/architecture.md).

## Run locally
Requirements: Python 3.13 and Node.js 22. No database or Docker. Full steps: [docs/setup-guide.md](docs/setup-guide.md).

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (the dev server proxies `/api` to port 8000). The analysis components load on the first analysis request.

## Tests and checks
```powershell
cd backend; .venv\Scripts\python.exe -m pytest -q          # includes the original-parity and artefact-hash tests
cd frontend; npm run lint; npm test; npm run build
```

## Deploy on Vercel
Two projects from this branch (backend root `backend`, frontend root `frontend`); settings, limits and the routing rewrite are in [docs/deployment.md](docs/deployment.md). No secrets or environment variables are required.

## API summary

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/health/live`, `/health/ready`, `/health/models` | Liveness; readiness (no database: `database: "not_used"`); analysis component load status. |
| GET | `/api/v1/system/info` | Name, version, environment. |
| POST | `/api/v1/analysis` | Analyze text. Nothing is stored. |
| POST | `/api/v1/analysis/url` | Fetch a URL, extract the article, analyze. |
| GET | `/api/v1/evidence/passages`, `/evidence/search` | Browse / lexically search the reference collection. |
| GET | `/api/v1/models/performance` | Metrics and dataset limitations. |

## Documentation
- [docs/vercel-edition.md](docs/vercel-edition.md): what this edition preserves and changes, with the measured retrieval limitation.
- [docs/architecture.md](docs/architecture.md), [docs/deployment.md](docs/deployment.md), [docs/setup-guide.md](docs/setup-guide.md), [docs/analysis-api.md](docs/analysis-api.md), [docs/openapi.json](docs/openapi.json).
- [docs/dataset-and-model.md](docs/dataset-and-model.md), [docs/quality-evaluation.md](docs/quality-evaluation.md), [docs/technical-report.md](docs/technical-report.md), [docs/acceptance-report.md](docs/acceptance-report.md), [docs/security-review.md](docs/security-review.md): written for the full edition (each carries an edition note).
- [docs/demo-script.md](docs/demo-script.md) and [docs/samples/](docs/samples/): demonstration script and sample inputs.

## Repository structure
```
frontend/   React app, tests, vercel.json (rewrites)
backend/    FastAPI app (api, core, schemas, services, ml), ml_artifacts (committed, hash-pinned), data, tests, vercel.json
data/       Dataset provenance (the raw CSV is git-ignored)
docs/       Documentation
.github/    CI workflow
```
