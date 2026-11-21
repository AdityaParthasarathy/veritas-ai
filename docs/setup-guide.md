# Local setup (Vercel edition)

Requirements: Python 3.13, Node.js 22. No database or Docker.

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to `http://localhost:8000`.

## Tests and checks
```powershell
cd backend; .venv\Scripts\python.exe -m pytest -q       # about 180 tests, no database needed
cd frontend; npm run lint; npm test; npm run build
```
The backend tests include the original-parity tests (classifier outputs and SHA-256 hashes against the original `main` pipeline). Tests that need the analysis runtime skip when spaCy, its model or the classifier files are missing.

## Retraining (optional)
`python -m app.ml.train` and `python -m app.ml.domain_profile` need `data/raw/WELFake_Dataset.csv` (see [../data/README.md](../data/README.md)). Do not retrain for the Vercel edition: the committed artefacts are the originals and are hash-checked. Re-run `python -m app.ml.lexical_eval` only if the reference passages change.
