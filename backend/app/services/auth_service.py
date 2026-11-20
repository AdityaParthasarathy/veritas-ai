"""Registration and login rules."""

import uuid

import jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AuthenticationException, ConflictException
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.core.throttle import login_throttle
from app.models.user import User
from app.repositories import user_repository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

# Verified against when the email is unknown, so response time does not reveal which emails exist.
_DUMMY_HASH = get_password_hash("not-a-real-password")


def _issue_token(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), extra_claims={"type": "access"}),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


def register(db: Session, data: RegisterRequest) -> TokenResponse:
    if user_repository.get_by_email(db, data.email):
        raise ConflictException("An account with this email already exists")
    try:
        user = user_repository.create(
            db, email=data.email, full_name=(data.full_name or "").strip() or None, password_hash=get_password_hash(data.password)
        )
    except IntegrityError:  # lost a race with a concurrent registration
        db.rollback()
        raise ConflictException("An account with this email already exists") from None
    return _issue_token(user)


def login(db: Session, data: LoginRequest, client_ip: str) -> TokenResponse:
    key = f"{client_ip}|{data.email}"
    login_throttle.check(key)

    user = user_repository.get_by_email(db, data.email)
    password_ok = verify_password(data.password, user.password_hash if user else _DUMMY_HASH)
    if not (user and password_ok and user.is_active):
        login_throttle.record_failure(key)
        raise AuthenticationException("Incorrect email or password")

    login_throttle.reset(key)
    return _issue_token(user)


def user_from_token(db: Session, token: str) -> User:
    """Resolve a bearer token to an active user or raise AuthenticationException."""
    try:
        claims = decode_access_token(token)
        if claims.get("type") != "access":
            raise AuthenticationException()
        user = user_repository.get_by_id(db, uuid.UUID(claims["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        raise AuthenticationException() from None
    if not user or not user.is_active:
        raise AuthenticationException()
    return user
