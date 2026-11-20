# VERITAS AI

AI-powered misinformation intelligence platform. It analyzes pasted text or a public article URL with NLP and machine learning, shows the model's output **separately** from independently retrieved reference passages, and reports uncertainty. **A model result is never proof that content is true or false.**

> The classifier learns the writing style and sources of one dataset's labels. It does not fact-check. Read [docs/dataset-and-model.md](docs/dataset-and-model.md) and [docs/acceptance-report.md](docs/acceptance-report.md) for what the numbers do and do not mean.

## What it does

| Feature | Notes |
| --- | --- |
| Analyze pasted text or an article URL | URL fetching is SSRF-protected; article text and metadata are extracted automatically. |
| Classification | TF-IDF + Logistic Regression trained on WELFake; reported as "resembles unreliable/reliable sources", not truth. |
| Linguistic signals | Descriptive measurements (spaCy): emphasis, ALL-CAPS, sensational and hedging wording, attribution, entities, etc. |
| Evidence retrieval | Semantic search (MiniLM + FAISS) over a small curated reference collection with verified source links. |
| Uncertainty | Transparent rules: short text, undecided model, no related evidence. Never lower than "moderate". |
| Accounts and history | Registration, login, saved analyses (per-user), password change, account deletion. |
| Model Performance page | Metrics, confusion matrices, dataset cleaning and limitations, served from the saved training run. |

## Stack

- Frontend: React 19, Vite, Tailwind CSS 3, React Router, Axios, Recharts, Lucide. Tests: Vitest, Testing Library, axe.
- Backend: Python 3.13, FastAPI, Pydantic Settings, SQLAlchemy 2, Psycopg 3, Alembic, bcrypt, PyJWT, httpx, trafilatura.
- ML: scikit-learn, spaCy, sentence-transformers (CPU PyTorch), FAISS (CPU). `transformers` is installed as a dependency of sentence-transformers; no transformer is fine-tuned.
- Database: PostgreSQL 16. Packaging: Docker Compose. CI: GitHub Actions.

## Architecture

```
React (nginx in Docker) -> FastAPI /api/v1 -> services -> repositories (SQLAlchemy) -> PostgreSQL
                                  |
                                  +-- URL ingestion (SSRF-safe fetch + extraction)
                                  +-- spaCy signals | TF-IDF classifier | MiniLM + FAISS evidence | uncertainty rules
```

Details: [docs/architecture.md](docs/architecture.md).

## Quick start with Docker (recommended)

Prerequisites: Docker Desktop (running), Git, and the ML files (see "ML files" below). **Clone into a short path** such as `C:\dev\veritas-ai`: in a deeply nested folder, pip can hit Windows' 260-character path limit while unpacking PyTorch and fail with `OSError: No such file or directory` (or enable long paths as pip's hint describes).

```powershell
Copy-Item .env.example .env
```

Edit `.env`: set `SECRET_KEY` and one database password (used in `POSTGRES_PASSWORD` **and** `DATABASE_URL`). Then:

```powershell
docker compose up -d --build
docker compose ps
```

- App: http://localhost:5173
- API: http://localhost:8000 and Swagger at http://localhost:8000/docs

The backend applies database migrations on start and loads the ML models in the background (about 15 s; `GET /api/v1/health/models` reports `loading` then `ready`). Stop with `docker compose stop`; `docker compose down` removes containers but keeps the database volume.

### ML files (not in Git)

The classifier files and the embedding model are large and git-ignored; compose mounts them read-only. One script creates them (downloads about 350 MB including the checksum-verified WELFake dataset, then trains in about 5 minutes):

```powershell
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements-ml.txt
powershell -ExecutionPolicy Bypass -File scripts\setup-ml.ps1
```

The script installs the spaCy model, downloads `all-MiniLM-L6-v2`, downloads and verifies WELFake (provenance in [data/README.md](data/README.md)), then runs `python -m app.ml.train` and `python -m app.ml.domain_profile`. Without these files the app still starts; analysis endpoints return a clear 503 and the rest works. Manual steps and details: [docs/ml-setup.md](docs/ml-setup.md).

## Local development (without Docker for the app)

```powershell
docker compose up -d db
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm install
npm run dev
```

More commands, ports and troubleshooting: [docs/setup-guide.md](docs/setup-guide.md) and [docs/deployment.md](docs/deployment.md).

## Tests and checks

```powershell
cd backend; python -m pytest -q          # needs the database container; ML tests skip if ML files/packages are absent
cd frontend; npm run lint; npm test; npm run build
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs backend tests with bandit, frontend lint/tests/build/audit, and the Docker image build.

## API summary

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/health/live`, `/health/ready`, `/health/models` | none | Liveness; database readiness; ML load status. |
| GET | `/api/v1/system/info` | none | Name, version, environment. |
| POST | `/api/v1/analysis` | optional | Analyze text. Saved when signed in. |
| POST | `/api/v1/analysis/url` | optional | Fetch a URL, extract the article, analyze. |
| GET | `/api/v1/evidence/passages`, `/evidence/search` | none | Browse / semantically search the reference collection. |
| GET | `/api/v1/models/performance` | none | Metrics and dataset limitations. |
| POST | `/api/v1/auth/register`, `/auth/login` | none | Create account / sign in. |
| GET, DELETE | `/api/v1/auth/me` | required | Current user / delete account. |
| POST | `/api/v1/auth/change-password` | required | Change password (revokes old tokens). |
| GET, DELETE | `/api/v1/analyses`, `/analyses/{id}` | required | Saved analyses. |

## Documentation

- [docs/technical-report.md](docs/technical-report.md): the full technical report. [docs/acceptance-report.md](docs/acceptance-report.md): every requirement mapped to implementation, tests and limitations.
- [docs/quality-evaluation.md](docs/quality-evaluation.md): out-of-domain detection and evidence threshold evaluation. [docs/demo-script.md](docs/demo-script.md) and [docs/samples/](docs/samples/): demonstration script and sample inputs.
- [docs/database-schema.md](docs/database-schema.md), [docs/openapi.json](docs/openapi.json): schema and API specification (both checked by tests).
- [docs/security-review.md](docs/security-review.md): threat review and verification evidence.
- [docs/analysis-api.md](docs/analysis-api.md), [docs/auth.md](docs/auth.md): API behaviour and design.
- [docs/dataset-and-model.md](docs/dataset-and-model.md): dataset, training, metrics, limitations.
- [docs/deployment.md](docs/deployment.md), [docs/setup-guide.md](docs/setup-guide.md), [docs/ml-setup.md](docs/ml-setup.md), [docs/architecture.md](docs/architecture.md).

## Repository structure

```
frontend/   React app, tests, Dockerfile + nginx template
backend/    FastAPI app (api, core, database, models, repositories, schemas, services, ml), alembic, tests, Dockerfile
database/   PostgreSQL init scripts
data/       Dataset provenance (raw CSV is git-ignored)
docs/       Documentation
.github/    CI workflow
scripts/    setup-ml.ps1 (creates the git-ignored ML files)
docker-compose.yml, .env.example
```
