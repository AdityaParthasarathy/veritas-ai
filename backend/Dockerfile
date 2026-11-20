# VERITAS AI backend: FastAPI + CPU-only ML stack.
# Models and trained classifier files are NOT baked in (they are git-ignored and large);
# docker-compose mounts them read-only at /models and /artifacts.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
RUN useradd --create-home --uid 10001 veritas

# Dependencies first so this layer is cached until the requirement files change.
COPY requirements.txt requirements-ml.txt ./
RUN pip install -r requirements-ml.txt \
 && pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

COPY --chown=veritas:veritas . .

USER veritas
ENV MODELS_DIR=/models \
    ARTIFACTS_DIR=/artifacts
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/live', timeout=3).status == 200 else 1)"

# Apply database migrations, then serve.
CMD ["sh", "-c", "python -m alembic upgrade head && exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
