# VERITAS AI

AI-powered misinformation intelligence platform. It will analyze news text and URLs with NLP and machine learning, show model predictions separately from independently retrieved evidence, and report uncertainty. A model prediction is never presented as proof that content is true or false.

**Status: Phase 1 (infrastructure) complete. No analysis, model or authentication features exist yet.**

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

Backend tests use the real database, so start it first. Other database commands: `docker compose ps`, `docker compose logs -f db`, `docker compose stop`.

## Implementation status

Done: repository structure, FastAPI app with health and system endpoints, SQLAlchemy engine/session, Alembic setup (no migrations yet), PostgreSQL container, React shell with a live status dashboard, security foundations (env config, CORS, safe errors, hashing and JWT helpers), backend tests, documentation.

Not implemented: authentication, data models, NLP, classification, evidence retrieval, analytics.

## Roadmap

1. Phase 2: ML environment, dataset, preprocessing, classifier training and evaluation.
2. Phase 3: analysis API, linguistic signals, semantic evidence retrieval, uncertainty.
3. Phase 4: authentication, stored analyses and history, performance and limitations pages.
