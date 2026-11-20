"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationException
from app.database.session import get_db
from app.models.user import User
from app.services import auth_service

# auto_error=False so missing credentials produce our own consistent error envelope.
_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def get_current_user(db: DbSession, credentials: Credentials) -> User:
    """Require a valid bearer token."""
    if credentials is None:
        raise AuthenticationException("Not authenticated")
    return auth_service.user_from_token(db, credentials.credentials)


def get_optional_user(db: DbSession, credentials: Credentials) -> User | None:
    """Return the user if a valid token is supplied; anonymous requests return None.

    A supplied but invalid token is still rejected, so a client never silently
    falls back to anonymous mode with an expired session.
    """
    if credentials is None:
        return None
    return auth_service.user_from_token(db, credentials.credentials)


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
