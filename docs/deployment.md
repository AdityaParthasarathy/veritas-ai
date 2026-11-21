# Deployment on Vercel (free Hobby plan)

Two Vercel projects from one repository (the `vercel-deployment` branch): a static frontend and a Python function. No database, no secrets, no paid service.

## Project 1: backend (FastAPI function)
| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Framework preset | FastAPI (auto-detected from `app/main.py`) |
| Python | 3.13 (`backend/.python-version`) |
| Dependencies | `backend/requirements.txt` (exact pins; installed by Vercel with uv) |
| Function config | `backend/vercel.json` (`maxDuration` 60) |
| Excluded from the bundle | `backend/.vercelignore` (tests, evaluation data, the unused baseline classifier) |
| Environment variables | none required |

Measured in a compatibility test with the same dependency set: the build log reported a 428 MB bundle (limit: 500 MB for Python functions), the build took about 14 s, the first heavy request on a new instance took about 4 s, and memory after loading spaCy was about 240 MB (Hobby functions get a fixed 2 GB). The environment's `/tmp` had about 78 MB left after Vercel placed the dependencies there, so the function must not write large files.

## Project 2: frontend (static Vite build)
| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework preset | Vite |
| Build command / output | `npm run build` / `dist` |
| Environment variables | none (the app calls `/api/v1` on its own origin) |
| Routing | `frontend/vercel.json`: rewrite `/api/*` to the backend project's URL, then SPA fallback to `/index.html` |

The backend URL in `frontend/vercel.json` must be updated to the backend project's address. Because the browser only ever talks to the frontend's origin, no CORS configuration is needed. If you would rather call the backend directly, set `VITE_API_BASE_URL` at build time and `FRONTEND_URL` on the backend.

## First deployment of a project is a production deployment
Vercel assigns a project's **first** deployment to production even when `--prod` is not passed, so it gets the public project domain (the CLI prints a hint when this happens). Later deployments are previews. The frontend rewrite in `frontend/vercel.json` targets the backend project's production domain (`https://veritas-ai-api.vercel.app` here; change it to yours), because preview URLs are protected. Deploy the backend first and set that address before deploying the frontend.

## Deployment protection
New Vercel projects enable Vercel Authentication on preview deployments, so a preview URL asks visitors to sign in to Vercel, and a frontend preview cannot reach a protected backend preview through a rewrite. Production deployments use the public project domain. Changing protection is a security setting and is left to the project owner.

## Free-tier limits that matter (Vercel documentation, checked November 2026)
- Hobby functions: 2 GB memory, 1 vCPU, 300 s maximum duration, 4.5 MB request and response bodies.
- Monthly allowances: 4 hours of Active CPU, 360 GB-hours of provisioned memory, 1,000,000 invocations. Exceeding a limit pauses the deployment (it returns `503 DEPLOYMENT_PAUSED`) rather than billing.
- Cold starts add the time to load spaCy and the classifier on a new instance.
- Hobby is intended for personal, non-commercial use.

## Local development
See [setup-guide.md](setup-guide.md).
