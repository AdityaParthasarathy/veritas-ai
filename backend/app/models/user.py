"""User account model."""

import uuid

from sqlalchemy import Boolean, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # Incremented on password change; tokens carry the version they were issued with.
    token_version: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
