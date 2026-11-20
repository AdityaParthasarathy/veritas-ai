# VERITAS AI - Windows Setup Guide (PowerShell)

Run all commands from the repository root unless stated otherwise.

## 1. Prerequisites

| Tool | Check |
| --- | --- |
| Python 3.11+ | `py -3 --version` |
| Node.js 20+ and npm | `node --version; npm --version` |
| Docker Desktop (running) | `docker --version; docker info` |
| Git | `git --version` |

If something is missing: Python https://www.python.org/downloads/ , Node https://nodejs.org , Docker Desktop https://www.docker.com/products/docker-desktop/

## 2. Environment files

```powershell
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "import secrets; print(secrets.token_urlsafe(18))"
Copy-Item frontend\.env.example frontend\.env
```

Edit `.env`: paste the first value as `SECRET_KEY`, and the second as the database password in **both** `POSTGRES_PASSWORD` and inside `DATABASE_URL`. `.env` is git-ignored.

If a local PostgreSQL already uses port 5432, set `POSTGRES_PORT=5434` and use `:5434` in `DATABASE_URL`.

## 3. Database

```powershell
docker compose up -d db
```

```powershell
docker compose ps
```

```powershell
docker compose logs -f db
```

```powershell
docker compose stop
```

The container is ready when `docker compose ps` shows `(healthy)`. `docker compose down -v` also deletes the data volume; use it only if you want an empty database.

## 4. Backend

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

If activation is blocked:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Check: http://localhost:8000/api/v1/health/ready and http://localhost:8000/docs

## 5. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 6. Tests and build

```powershell
cd backend
python -m pytest -q
```

```powershell
cd frontend
npm run lint
npm run build
```

Backend tests use a separate `veritas_test` database on the same server (created and migrated automatically), so the container must be running.

## 7. Full stack in Docker

See [deployment.md](deployment.md): `docker compose up -d --build` starts the database, backend and frontend; the app is at http://localhost:5173.

Frontend tests: `cd frontend; npm test`. Backend tests need the database container running.

## 8. Troubleshooting

- `password authentication failed`: the password in `DATABASE_URL` differs from the one the volume was first created with. Align them, or reset the role password inside the container: `docker exec veritas_postgres psql -U veritas_user -d veritas_db -c "ALTER USER veritas_user PASSWORD 'new-password'"`.
- Backend reaches the wrong database: another PostgreSQL owns port 5432. Find it with `Get-NetTCPConnection -LocalPort 5432 -State Listen` and set `POSTGRES_PORT` as above.
- Dashboard shows "Backend unavailable": start the backend, then press Retry.
