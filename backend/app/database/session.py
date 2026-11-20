"""VERITAS AI - Database Engine and Session Management.

Configures SQLAlchemy 2.x engine, connection pooling, and request-scoped sessions.
"""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings

# Configure SQLAlchemy 2.x engine with connection health pre-ping
engine = create_engine(
    settings.database_url,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    echo=False,
)

# Standard sessionmaker for database operations
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency providing a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connectivity() -> bool:
    """Execute a simple 'SELECT 1' query to verify live database connectivity.

    Returns True if the database responds, False otherwise.
    Never exposes internal database errors or credentials.
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar()
            return result == 1
    except (SQLAlchemyError, Exception):
        return False
