"""VERITAS AI - Test fixtures.

Tests run against a real PostgreSQL database named ``veritas_test`` on the same
server as the development database (start it with ``docker compose up -d db``).
The database is created if missing and migrated with Alembic, so the development
data is never touched. Only the explicit failure-path test mocks the connectivity check.
"""

import os
import sys
from collections.abc import Generator
from pathlib import Path

import psycopg
import pytest
from dotenv import dotenv_values
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_NAME = "veritas_test"
os.environ["PRELOAD_MODELS"] = "false"  # deterministic tests; preload is tested explicitly


def _configure_test_database() -> str:
    """Point DATABASE_URL at the test database before the app reads its settings."""
    base_url = os.environ.get("DATABASE_URL") or dotenv_values(BACKEND_DIR.parent / ".env").get("DATABASE_URL")
    if not base_url:
        pytest.exit("DATABASE_URL is not configured (see .env.example)", returncode=2)
    url = make_url(base_url)
    if url.database == TEST_DB_NAME:
        return url.render_as_string(hide_password=False)

    admin = url.set(drivername="postgresql", database="postgres")
    conninfo = admin.render_as_string(hide_password=False)
    with psycopg.connect(conninfo, autocommit=True) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB_NAME,)).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    test_url = url.set(database=TEST_DB_NAME).render_as_string(hide_password=False)
    os.environ["DATABASE_URL"] = test_url
    return test_url


_configure_test_database()

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.throttle import login_throttle  # noqa: E402
from app.database.session import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrated_test_database() -> None:
    """Apply all Alembic migrations to the test database."""
    command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")


@pytest.fixture(autouse=True)
def clean_state(migrated_test_database) -> None:
    """Empty the tables and reset the login throttle before every test."""
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses, users CASCADE"))
    login_throttle.reset()
    from app.api.v1.endpoints import analysis as analysis_endpoint

    analysis_endpoint.url_rate_limiter.reset()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client (runs the lifespan startup/shutdown)."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def make_user(client):
    """Register a user and return (headers, user_json)."""
    counter = {"n": 0}

    def _make(email: str | None = None, password: str = "correct-horse-battery"):
        counter["n"] += 1
        email = email or f"user{counter['n']}@example.com"
        r = client.post("/api/v1/auth/register", json={"email": email, "password": password, "full_name": "Test User"})
        assert r.status_code == 201, r.text
        body = r.json()
        return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]

    return _make
