# ML environment setup (CPU only, Windows)

Verified on Windows 11, 64-bit Python 3.13.5, with 89 GB free disk. The full ML stack plus models uses roughly 4 GB; check free space first:

```powershell
Get-PSDrive C | Select-Object @{n='FreeGB';e={[math]::Round($_.Free/1GB,1)}}
py -3 -c "import struct,sys;print(sys.version);print(struct.calcsize('P')*8,'bit')"
```

## Installed versions

Exact pins are in `backend/requirements.txt` (core) and `backend/requirements-ml.txt` (ML). Key versions: torch 2.15.0+cpu, sentence-transformers 6.3.0, transformers 5.23.0, spaCy 3.8.18 (model `en_core_web_sm` 3.8.0), faiss-cpu 1.16.0, scikit-learn 1.9.1, numpy 2.5.5. `pip check` reports no broken requirements and no `nvidia-*`/CUDA packages are installed.

## Install

```powershell
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements-ml.txt
python -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
```

`requirements-ml.txt` points pip at the PyTorch CPU index so the CPU wheel is used.

## Download the embedding model (kept out of Git)

Model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, about 88 MB), saved to `models/all-MiniLM-L6-v2/` (git-ignored). Run from the repository root:

```powershell
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu').save('models/all-MiniLM-L6-v2')"
```

The retrieval code loads from that local folder, so inference needs no network. The trained classifier files (`backend/ml_artifacts/*.joblib`) are also git-ignored; regenerate them with `python -m app.ml.train`.

## Verify

```powershell
cd backend
python -m pytest tests\test_retrieval.py -q
```

This checks embedding shape and normalisation, FAISS cosine search on sample passages (queries with no shared keywords still retrieve the right passage), and that the spaCy model loads. These tests skip if the embedding model has not been downloaded.

## What exists and what does not

`backend/app/ml/retrieval.py` provides `Embedder` and `PassageIndex` (FAISS `IndexFlatIP` over normalised embeddings). The reference collection, analysis API, URL ingestion and UI are built on top of it; see [analysis-api.md](analysis-api.md). `backend/requirements-ci.txt` is the small subset used by CI (no PyTorch, FAISS or spaCy); tests needing the full runtime skip themselves when it is absent. In Docker, the model folder and classifier files are mounted from the host, not baked into the image.
