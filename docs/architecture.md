# VERITAS AI - Architecture

```
React (Vite)  --HTTP/JSON-->  FastAPI  -->  services  -->  SQLAlchemy  -->  PostgreSQL
```

## Components

| Layer | Location | Responsibility |
| --- | --- | --- |
| Frontend | `frontend/src` | UI shell, routing, one Axios instance (`services/api.js`), the `useSystemStatus` hook. Holds no secrets. |
| API routes | `backend/app/api/v1/endpoints` | Thin HTTP handlers: parse input, call a service, shape the response. |
| Schemas | `backend/app/schemas` | Pydantic request/response models and validation. |
| Services | `backend/app/services` | Business logic (e.g. `HealthService`). Routes never touch the database directly. |
| Database | `backend/app/database` | Engine, session factory, declarative base, connectivity check. |
| Core | `backend/app/core` | Settings (Pydantic Settings), security helpers (bcrypt, JWT), exception types. |
| Migrations | `backend/alembic` | Alembic environment; no migrations yet because there are no tables. |
| Database server | `docker-compose.yml` | PostgreSQL 16 with health check and a named volume. |

## Request flow (status check)

1. The dashboard calls `GET /api/v1/health/live`, `/health/ready` and `/system/info` in parallel.
2. `/live` only proves the process runs; it never touches the database.
3. `/ready` runs `SELECT 1` through the SQLAlchemy engine. On failure it returns HTTP 503 `{"status":"not_ready","database":"disconnected"}` with no driver details.
4. The UI shows "Connected" only when `/ready` returns `database: "connected"`. A network error shows the backend-unavailable state with a Retry button.

## Cross-cutting rules

- Configuration comes from environment variables or the root `.env`. `SECRET_KEY` and `DATABASE_URL` are required and stored as `SecretStr`.
- CORS allows only `FRONTEND_URL` (and its 127.0.0.1 variant).
- Errors use one envelope: `{"error": {"code", "message", "details"}}`. Unhandled errors return a generic message; stack traces stay in server logs.
- The API is versioned under `/api/v1`.

## Planned integration (later phases)

FastAPI will gain NLP preprocessing (spaCy), ML classification, linguistic signal analysis, semantic evidence retrieval (sentence embeddings + FAISS) and uncertainty assessment. Classifier output and retrieved evidence stay separate in the API and UI: a prediction is a statistical signal and is never presented as proof of truth.
