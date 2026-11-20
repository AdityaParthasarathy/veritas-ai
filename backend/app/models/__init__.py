"""VERITAS AI Database Models Package.

Persistent models will be registered here and imported by Alembic migrations.
"""

from app.database.base import Base

__all__ = ["Base"]
