"""Database access for users. No business rules live here."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_by_email(db: Session, email: str) -> User | None:
    """Return the user with this (lower-cased) email, or None."""
    return db.scalar(select(User).where(User.email == email))


def get_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    """Return the user with this id, or None."""
    return db.get(User, user_id)


def set_password(db: Session, user: User, password_hash: str) -> User:
    """Store a new password hash and bump the token version."""
    user.password_hash = password_hash
    user.token_version += 1  # invalidates every token issued before the change
    db.commit()
    db.refresh(user)
    return user


def delete(db: Session, user: User) -> None:
    """Delete a user (their analyses cascade)."""
    db.delete(user)
    db.commit()


def create(db: Session, *, email: str, full_name: str | None, password_hash: str) -> User:
    """Insert and return a new user."""
    user = User(email=email, full_name=full_name, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
