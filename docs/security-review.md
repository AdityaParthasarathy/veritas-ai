# Security review (end to end)

Review date: 2026-11-20. Scope: backend API, ML/URL ingestion, frontend, Docker packaging, CI. Method: code review, automated tests, tool scans, and manual probing of the running Docker stack. This is a development-stage review by the author, not an independent penetration test.

## Threats, controls and evidence

| Area | Control | Evidence |
| --- | --- | --- |
| Credentials at rest | bcrypt hashes; passwords limited to 72 bytes (no silent truncation); 10 character minimum | `test_password_is_stored_hashed`, registration validation tests |
| Authentication | Signed JWT with `type` and per-user `tv` (token version) claims, 30 min expiry; forged, expired, wrong-type, unsigned (`alg: none`), unknown-user and pre-password-change tokens rejected | `tests/test_auth.py` (24 tests); browser run: old token returned 401 after a password change |
| Account enumeration / guessing | Same 401 body and a dummy hash check for unknown emails; 5 failures per IP+email per 15 min returns 429. Failed re-authentication on password change and deletion counts toward the same limit | `test_wrong_password_and_unknown_email_look_identical`, throttle tests |
| Registration | Returns 409 for an existing email, which does reveal that the email is registered (accepted trade-off) | `test_duplicate_email_rejected` |
| Authorization | Every history query is filtered by owner; other users' items return 404; delete cascades to the user's analyses only | `test_users_cannot_see_or_delete_each_others_analyses`, `test_delete_account_removes_user_and_all_their_data`; database checked empty after the browser delete flow |
| SSRF via URL analysis | http/https only, ports 80/443 only, no URL credentials, DNS resolved by the server and every address must be public (private, loopback, link-local, CGNAT, multicast, reserved, IPv4-mapped, 6to4, Teredo, NAT64 refused), connection pinned to the vetted IP (anti DNS-rebinding), redirects followed manually and revalidated (max 3), proxies and cookies ignored, no credentials sent, HTML/text only, 5 MB and 20 s caps, 20 requests/min per IP | `tests/test_url_ingest.py` (77 tests incl. literal-IP, decimal/hex/octal-IP, redirect-to-metadata-IP, redirect loop, mixed DNS answers); live: `169.254.169.254` and `db:5432` blocked from inside the container; a real HTTPS fetch of `example.com` and Wikipedia succeeded with TLS verified against the hostname |
| Malicious page content | Text only: scripts stripped by the extractor, output rendered by React (no `dangerouslySetInnerHTML` anywhere), instructions in page text have no effect because the text is only analysed | `test_page_content_is_treated_as_text_not_instructions`; grep of `frontend/src` |
| Injection | SQLAlchemy parameter binding; the only raw SQL in application code is the literal `SELECT 1` | grep of `backend/app` |
| Pickle risk | Classifier artifacts are joblib (pickle) files and are loaded only from the operator's own trained files in a read-only mount | documented in code and `ml-setup.md` |
| Input limits | Text 20,000 chars, title 300, URL 2,048, request body 1 MB (413), pagination bounds | validation tests, `test_oversized_request_body_is_rejected_early` |
| Information leakage | Generic error messages; no tracebacks, paths or SQL in responses; remote error bodies never echoed; UI maps unknown server messages to a generic one | `test_errors_never_leak_internals`, `test_error_statuses_are_fetch_failures`, `analysisService.test.js` |
| Browser hardening | Backend: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, API CSP `default-src 'none'`, `Cache-Control: no-store`. Frontend (nginx): CSP restricting scripts to `self`, `frame-ancestors 'none'`, same headers | `test_security_headers_on_api_and_docs`; `curl -I` against both running containers |
| CORS | Only `FRONTEND_URL` (and its 127.0.0.1 variant) | `test_cors_allows_local_frontend_only`; live probe: foreign origin gets no CORS headers |
| Secrets | `.env` ignored; `SECRET_KEY` and `DATABASE_URL` required and validated; secrets are `SecretStr`; none in Git history, working tree, image layers or logs | scan of tracked files, `git log -p`, `docker history`, container logs for the real secret values: 0 matches |
| Containers | Backend runs as UID 10001; frontend uses `nginx-unprivileged`; secrets passed at runtime; `.dockerignore` excludes `.env` and tests | `docker exec veritas_backend id`; image file search found no `.env` |
| Dependencies | `npm audit`: 0 vulnerabilities. `bandit -r backend/app`: 0 issues. `pip-audit` on the local venv: findings only in `pip` 25.1.1 and `setuptools` 78.1.0 (build tools; the Docker image ships pip 26.2.2 and setuptools 84.2.1, past the fixed versions). `torch 2.15.0+cpu` and `en_core_web_sm` are not on PyPI so could not be audited | tool output, 2026-11-20 |

## Known weaknesses and residual risks

1. **Token storage:** the JWT lives in memory and `sessionStorage`; an XSS bug would expose it. Mitigated by React escaping and the CSP, not eliminated.
2. **No HTTPS** in the provided compose stack; a TLS proxy is required for any real deployment.
3. **In-memory rate limits** reset on restart and are not shared across workers.
4. **DNS trust:** a hostname that resolves to a public address is trusted. A malicious public site can still serve large or hostile content within the size and time caps.
5. **No account recovery:** no email verification or password reset.
6. **Published database port** in compose (convenience for development).
7. **Swagger UI** is always enabled.
8. **CI not run on GitHub** (see the acceptance report); the same commands were executed locally.

## Not covered

No third-party penetration test, fuzzing, load/DoS testing, or threat modelling of the hosting platform.
