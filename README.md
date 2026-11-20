# VERITAS AI

AI-powered misinformation intelligence platform. It will analyze news text and URLs with NLP and machine learning, show model predictions separately from independently retrieved evidence, and report uncertainty. A model prediction is never presented as proof that content is true or false.

**Status: Phases 1-4 complete: infrastructure, baseline classifier, analysis API with evidence retrieval, accounts with saved history, and a model-performance page.**

## Stack

- Frontend: React 19, Vite, JavaScript, Tailwind CSS 3, React Router, Axios, Lucide, Recharts (reserved for later)
- Backend: Python, FastAPI, Uvicorn, Pydantic Settings, SQLAlchemy 2, Psycopg 3, Alembic, PyJWT, Passlib + bcrypt, Pytest, HTTPX
- Database: PostgreSQL 16 (Docker Compose)
- Later phases: scikit-learn, Transformers, Sentence Transformers, spaCy, PyTorch, FAISS

## Architecture

```
React  ->  FastAPI (/api/v1)  ->  services  ->  SQLAlchemy  ->  PostgreSQL
```

Details: [docs/architecture.md](docs/architecture.md)

## Repository structure

```
frontend/   React app (components, pages, layouts, services, hooks)
backend/    FastAPI app (api, core, database, models, schemas, services), alembic, tests
database/   PostgreSQL init scripts
docs/       architecture.md, setup-guide.md
docker-compose.yml, .env.example
```

## Quick start (Windows PowerShell)

Prerequisites: Python 3.11+, Node.js 20+, Docker Desktop (running), Git. Full steps: [docs/setup-guide.md](docs/setup-guide.md).

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
docker compose up -d db
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Edit `.env` first (secrets, matching DB password). In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs

## Configuration

| File | Purpose |
| --- | --- |
| `.env` (root, git-ignored) | Docker database credentials, `DATABASE_URL`, `SECRET_KEY`, CORS URLs. `DATABASE_URL` and `SECRET_KEY` are required. |
| `frontend/.env` | `VITE_API_BASE_URL` (default `http://localhost:8000`). |

If another PostgreSQL already uses port 5432, set `POSTGRES_PORT` (for example 5434) and use the same port in `DATABASE_URL`.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/health/live` | Process liveness; no database dependency. |
| GET | `/api/v1/health/ready` | Runs `SELECT 1`; 200 when connected, 503 when not. |
| GET | `/api/v1/system/info` | Name, version, environment, docs URL. |
| POST | `/api/v1/analysis` | Classification, linguistic signals, related evidence and uncertainty for submitted text. Saved to history when signed in. |
| POST | `/api/v1/auth/register`, `/auth/login` | Create an account / sign in (bearer token). |
| GET | `/api/v1/auth/me` | Current user. |
| GET, DELETE | `/api/v1/analyses`, `/analyses/{id}` | Your saved analyses. |
| GET | `/api/v1/models/performance` | Training metrics and dataset limitations. |
| GET | `/api/v1/evidence/passages` | List the reference collection. |
| GET | `/api/v1/evidence/search` | Semantic search over the reference collection. |

## Tests

```powershell
cd backend
python -m pytest -q
```

```powershell
cd frontend
npm run lint
npm run build
```

Backend tests use a separate `veritas_test` database on the same PostgreSQL server (created and migrated automatically), so start the container first. Other database commands: `docker compose ps`, `docker compose logs -f db`, `docker compose stop`.

## Implementation status

Done: repository structure, FastAPI app with health and system endpoints, SQLAlchemy engine/session, Alembic setup (no migrations yet), PostgreSQL container, React shell with a live status dashboard, security foundations (env config, CORS, safe errors, hashing and JWT helpers), backend tests, documentation.

Phase 2 done: WELFake downloaded and documented, cleaning and leakage-safe split, TF-IDF + Logistic Regression baseline (test accuracy 0.9705, with a source-masked variant at 0.9637), saved artifacts. These scores reflect agreement with dataset labels, not factual verification; see [docs/dataset-and-model.md](docs/dataset-and-model.md).

Phase 3 foundation done: CPU-only PyTorch, sentence-transformers, spaCy and FAISS installed with exact pins; MiniLM embeddings and FAISS similarity search verified by tests (see [docs/ml-setup.md](docs/ml-setup.md)).

Phase 3 done: `POST /api/v1/analysis` returns a classifier result, linguistic signals, related reference passages and an uncertainty assessment as separate sections; a 34-passage curated reference collection with verified source links; Analyze Content and Evidence Explorer pages. Details and limits: [docs/analysis-api.md](docs/analysis-api.md).

Phase 4 done: registration and login (bcrypt, JWT), per-user saved analysis history with ownership isolation, Alembic migration for `users` and `analyses`, and a Model Performance page (metrics, confusion matrices, dataset limitations) served from the saved training metrics. Details and trade-offs: [docs/auth.md](docs/auth.md).

Not implemented: URL analysis, password reset/change, account deletion, email verification.

## Roadmap

1. Phase 2 (done): dataset, cleaning, baseline classifier and evaluation. Train with `cd backend; python -m pip install -r requirements-ml.txt; python -m app.ml.train`.
2. Phase 3 (done): analysis API, linguistic signals, semantic evidence retrieval, uncertainty. Needs the ML setup in [docs/ml-setup.md](docs/ml-setup.md).
3. Phase 4 (done): authentication, stored analyses and history, performance and limitations pages.
