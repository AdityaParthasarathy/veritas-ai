# Accounts, saved history and model-performance endpoints

## Endpoints (under `/api/v1`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | none | Create an account; returns a bearer token. |
| POST | `/auth/login` | none | Sign in; returns a bearer token. |
| GET | `/auth/me` | required | Current user. |
| POST | `/auth/change-password` | required | `{current_password, new_password}`. Verifies the current password, stores the new hash, increments the user's token version (revoking every older token) and returns a fresh token. |
| DELETE | `/auth/me` | required | `{password}`. Re-authenticates, then permanently deletes the account and, by cascade, all of its saved analyses (204). |
| POST | `/analysis` | optional | Anonymous requests are analysed but **not stored**. With a valid token the analysis is saved and `analysis_id` is returned. An invalid or expired token is rejected (401), never treated as anonymous. |
| GET | `/analyses?limit=&offset=` | required | Your saved analyses, newest first (limit 1 to 100). |
| GET | `/analyses/{id}` | required | One saved analysis with the submitted text and stored result. |
| DELETE | `/analyses/{id}` | required | Delete one saved analysis. |
| GET | `/models/performance` | none | Training metrics and dataset limitations, read from `ml_artifacts/metrics.json`. |

## Design

- **Passwords:** bcrypt via passlib. Minimum 10 characters; maximum 72 bytes (bcrypt ignores anything longer, so longer passwords are rejected instead of silently truncated). Emails are lower-cased.
- **Tokens:** JWT (HS256, signed with `SECRET_KEY`), 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`), claims `sub`, `iat`, `exp`, `type=access`, `tv` (token version). Tokens with the wrong type, bad signature, expiry, no signature (`alg: none`) or an unknown/inactive user are rejected with 401. There are no refresh tokens: users sign in again after expiry.
- **No account enumeration on login:** unknown email and wrong password return the same 401 body, and a dummy hash is verified for unknown emails to even out timing. Registration does return 409 for an existing email, which does reveal that the email is registered.
- **Brute-force slowdown:** 5 failed logins per IP and email in 15 minutes returns 429 with `Retry-After`. This limiter is in memory and per process; it resets on restart and is not shared across workers. Production would need a shared store or a gateway.
- **Ownership:** every history query filters by the signed-in user. Another user's analysis returns 404 (not 403) so its existence is not revealed.
- **Data stored:** for each saved analysis, the submitted text and the full result JSON. Deleting a user cascades to their analyses. Password change and account deletion both require the current password, and wrong attempts count toward the login throttle.
- **Layers:** routes (`api/v1/endpoints`) call services (`auth_service`, `history_service`, `performance_service`), which use repositories (`repositories/`) for all SQL.

## Frontend token handling (known trade-off)

The token is kept in memory and mirrored to `sessionStorage` so a page reload keeps you signed in; closing the tab ends the session. Any script-readable storage can be stolen by an XSS bug. The app renders all user text through React (no `dangerouslySetInnerHTML`), which is the main defence. HttpOnly cookies avoid that exposure but need CSRF protection and cookie-aware CORS, which were judged out of scope here. A 401 on an authenticated request clears the session and shows "session expired".

## Database and migrations

```powershell
cd backend
python -m alembic upgrade head
```

The first migration (`6033cd3736f3`) creates `users` and `analyses`. Tests run against a separate `veritas_test` database that the test setup creates on the same PostgreSQL server and migrates automatically, so development data is never touched.

## Model Performance page

Everything on the page (metrics, confusion matrices, cleaning counts, split sizes, top features) is served from `ml_artifacts/metrics.json`; a test checks the API returns exactly the saved numbers. Limitation texts are written in `performance_service.py` and mirror [dataset-and-model.md](dataset-and-model.md). The page states that the figures measure agreement with dataset labels, not factual accuracy.

## Not verified / not done

- A token expiring in the middle of a session (the 401 interceptor path) is covered by backend tests but was not exercised in the browser; the reload-with-invalid-token path was.
- No email verification or password reset.
- Desktop and emulated-mobile browser checks were done in a Chromium-based pane only; no screen-reader testing. See [acceptance-report.md](acceptance-report.md).
