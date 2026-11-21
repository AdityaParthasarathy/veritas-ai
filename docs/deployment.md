# Deployment with Docker Compose

`docker-compose.yml` runs three services on one network:

| Service | Image | Host port (default) | Notes |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | `${POSTGRES_PORT:-5432}` | Named volume `veritas_postgres_data`; health check with `pg_isready`. |
| `backend` | built from `backend/Dockerfile` (Python 3.13, CPU-only ML stack, about 2.7 GB) | `${BACKEND_PORT:-8000}` | Runs as non-root user 10001. Waits for a healthy database, applies Alembic migrations, then starts uvicorn. Health check: `/api/v1/health/live`. |
| `frontend` | built from `frontend/Dockerfile` (about 75 MB) | `${FRONTEND_PORT:-5173}` | Static React build served by unprivileged nginx on port 8080, with a Content-Security-Policy and other security headers. |

## First run

1. Create `.env` from `.env.example`; set `SECRET_KEY` and a database password (the compose file refuses to start without them).
2. Create the ML files once (they are large and git-ignored): see the README section "ML files (not in Git)". Compose mounts `./models` to `/models` and `./backend/ml_artifacts` to `/artifacts`, read-only.
3. `docker compose up -d --build`, then `docker compose ps` until all three are `healthy`.

Inside the compose network the backend reaches the database at `db:5432`, so `DATABASE_URL` in `.env` (which points at `localhost`) is only used when running the backend outside Docker.

## Everyday commands

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f db
docker compose stop
docker compose up -d --build backend
```

Model status: `Invoke-RestMethod http://localhost:8000/api/v1/health/models` (`loading` then `ready`; `unavailable` means the ML files or packages are missing).

## Configuration reference

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Signs JWTs; at least 32 random characters (the backend refuses to start otherwise). |
| `POSTGRES_*`, `DATABASE_URL` | Database credentials (see `.env.example`). |
| `FRONTEND_URL` | The single browser origin allowed by CORS. Must match the address users open. |
| `BACKEND_URL` | Informational only. The browser calls `/api/v1` on the frontend's own address and nginx proxies it to the backend, so no API address is compiled into the frontend image. |
| `BACKEND_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT` | Host ports. |
| `PRELOAD_MODELS` | Load ML components in a background thread at startup (default true). |
| `MODELS_DIR`, `ARTIFACTS_DIR` | Where the embedding model and classifier files live. |
| `URL_*` | URL ingestion limits (timeout, size, redirects, rate limit). |

## Backup and restore of the database

```powershell
docker exec veritas_postgres pg_dump -U veritas_user -d veritas_db -Fc -f /tmp/veritas.dump
docker cp veritas_postgres:/tmp/veritas.dump .\veritas.dump
```

`docker compose down -v` deletes the volume and all data; do not use it unless you want an empty database.

## Before exposing this to real users

This stack is production-*ready* in structure but has not been deployed or load-tested. Required steps:

1. **TLS.** Put a TLS-terminating reverse proxy (or platform load balancer) in front of both services; the compose file serves plain HTTP. Expose only the frontend port: nginx forwards `/api/` to the backend, so the browser needs one `https://` address and the API needs no CORS entry for it. (`FRONTEND_URL` is needed only when a browser on a different origin calls the API directly.)
2. **Do not publish the database port.** Remove the `ports` entry of the `db` service (it exists for local convenience).
3. **Strong, unique secrets** in the environment of the deployment platform, not in a committed file.
4. **Rate limiting is per process and in memory** (login attempts and URL fetches). With several backend workers or replicas, move it to a shared store or the gateway.
5. **Egress control for URL analysis.** The backend fetches user-supplied URLs. It blocks private and reserved addresses itself, but also restrict the container's outbound network (for example, deny access to internal subnets and cloud metadata endpoints at the network layer) as defence in depth.
6. **Disable or protect `/docs`** if you do not want the API explorer public.
7. **Logging and monitoring**, backups, and image vulnerability scanning in your pipeline.
