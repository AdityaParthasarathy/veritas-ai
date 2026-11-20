"""The Alembic migrations must produce exactly the schema the SQLAlchemy models describe."""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext

from app.database.base import Base
from app.database.session import engine
import app.models  # noqa: F401  (registers the models)


def test_migrations_match_the_models():
    """If this fails, create a migration (alembic revision --autogenerate) and update docs/database-schema.md."""
    with engine.connect() as connection:
        diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    assert diff == [], f"models and migrations differ: {diff}"


def test_expected_tables_and_columns_exist():
    from sqlalchemy import inspect

    inspector = inspect(engine)
    assert {"users", "analyses", "alembic_version"} <= set(inspector.get_table_names())
    user_columns = {c["name"] for c in inspector.get_columns("users")}
    assert {"id", "email", "password_hash", "token_version", "is_active"} <= user_columns
    assert "password" not in user_columns  # only the hash is stored
    analysis_columns = {c["name"] for c in inspector.get_columns("analyses")}
    assert {"user_id", "text", "result", "classifier_label", "uncertainty_level"} <= analysis_columns
    foreign_keys = inspector.get_foreign_keys("analyses")
    assert foreign_keys[0]["referred_table"] == "users" and foreign_keys[0]["options"].get("ondelete") == "CASCADE"
