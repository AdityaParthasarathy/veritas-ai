# Deployment on Vercel (free Hobby plan)

Two Vercel projects, both created in the owner's personal Vercel scope: a Python function for the API and a static site for the frontend. No database, no secrets, no environment variables, no paid service.

| | Backend | Frontend |
| --- | --- | --- |
| Vercel project | `veritas-lite-api` | `veritas-lite-web` |
| Project domain | `https://veritas-lite-api.vercel.app` | `https://veritas-lite-web.vercel.app` |
| Root directory (upload from) | `backend/` | `frontend/` |
| Framework preset | FastAPI (detected from `app/main.py`) | Vite |
| Runtime | Python 3.13 (`backend/.python-version`) | Node (Vercel default; Vite needs 20.19+ or 22.12+) |
| Build | dependencies from `backend/requirements.txt` | `npm run build`, output `dist` |
| Configuration | `backend/vercel.json` (`maxDuration` 60), `backend/.vercelignore` | `frontend/vercel.json` (rewrites, security headers), `frontend/.vercelignore` |

## Why both `vercel.json` files set the framework
A project created from the CLI (`vercel project add`) starts with the framework preset **Other**, so nothing is auto-detected: a first test deployment of a Python app built in 37 ms and produced no function. `backend/vercel.json` therefore sets `"framework": "fastapi"`, and `frontend/vercel.json` sets `"framework": "vite"` with `npm ci`, `npm run build` and output `dist`. Keep these.

## Backend
- **Dependencies are fully pinned.** `backend/requirements.in` lists the top-level packages; `backend/requirements.txt` is generated from it (67 packages, Linux x86_64, Python 3.13) with the command in its header, so the bundle size and behaviour are reproducible. Regenerate it only deliberately: the Python function limit is 500 MB and the last measured bundle was 433 MB.
- **Artefacts ship with the function:** the three original classifier files, `metrics.json`, `domain_check.json` and the 70 passages. `MANIFEST.sha256` pins them; text files are hashed after normalising line endings so the check passes on Windows and Linux.
- **Excluded from the bundle:** tests, evaluation data, the unused baseline classifier, dev requirements (`backend/.vercelignore`).
- **Behaviour on Vercel:** components load on the first analysis request (about 5 s on a new instance in my measurement), later requests reuse the instance. The function must not write large files: Vercel places the dependencies in `/tmp`, which had about 78 MB free in the last measurement.

## Frontend
- **Routing (`frontend/vercel.json`):** `/api/*` is rewritten to `https://veritas-lite-api.vercel.app/api/*` (the backend project's production domain; preview URLs are protected, so a rewrite cannot target them), then every other path falls back to `/index.html` so deep links and refresh work. The `/api` rule comes first, so API paths never reach the single-page app.
- **Security headers** (equivalent to the old nginx configuration): `Content-Security-Policy` (`connect-src 'self'`, because the API is same-origin through the rewrite), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`. Hashed assets under `/assets/` are cached for a year. The built app has no inline scripts and no `eval`, and the only external hosts are the Google Fonts domains the policy allows.
- **No CORS needed:** the browser only talks to the frontend's origin. To call the backend directly instead, set `VITE_API_BASE_URL` at build time and `FRONTEND_URL` on the backend.

## Deployment protection
New projects protect preview deployments with Vercel Authentication, so a preview URL asks for a Vercel sign-in. Production uses the public project domain. Test a protected preview with the authenticated CLI (`vercel curl <url>`); note that this command can create a deployment-protection bypass token for the project. Changing protection is a security setting and is left to the project owner.

## The first deployment of a project is always production
Vercel's documentation states that the first deployment of any project is a production deployment, even with `--target=preview`, from a non-production Git branch, or through the dashboard. A failed or cancelled first deployment counts, and deleting every deployment resets the rule. This repository deals with it explicitly:
1. The first deployment of each project is a **harmless placeholder** (no application code, no data), accepted knowingly as the production deployment. Deploying it with the normal alias also claims the project domain, so nobody else can take `veritas-lite-api.vercel.app`.
2. The real application is then deployed only as **previews**.
3. Promoting the real application to production is a separate, explicitly authorised step (`vercel promote`).

Because the frontend rewrite targets the backend's production domain, the complete application can only be tested end to end once the real backend is promoted. Before that, test the backend preview directly (`vercel curl`) and the frontend preview's pages.

## Free-tier limits that matter (Vercel documentation, checked November 2026)
- Hobby functions: 2 GB memory, 1 vCPU, 300 s maximum duration, 4.5 MB request and response bodies, 500 MB Python bundle.
- Monthly allowances: 4 hours of Active CPU, 360 GB-hours of provisioned memory, 1,000,000 invocations. Exceeding a limit pauses the deployment (`503 DEPLOYMENT_PAUSED`, about 30 days) rather than billing.
- Rewrites to an external origin time out after 120 s.
- Hobby is for personal, non-commercial use.
- Abuse protection: the in-app URL rate limiter is per instance. Hobby allows 3 firewall custom rules, one of them a rate-limit rule, which is the free way to cap request rates.

## Local development
See [setup-guide.md](setup-guide.md).
