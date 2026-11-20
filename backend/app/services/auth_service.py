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
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse, UserOut

# Verified against when the email is unknown, so response time does not reveal which emails exist.
_DUMMY_HASH = get_password_hash("not-a-real-password")


def _issue_token(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), extra_claims={"type": "access", "tv": user.token_version}),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


def register(db: Session, data: RegisterRequest) -> TokenResponse:
    """Create an account (409 if the email exists) and issue a token."""
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
    """Check credentials with throttling and issue a token."""
    key = f"{client_ip}|{data.email}"
    login_throttle.check(key)

    user = user_repository.get_by_email(db, data.email)
    password_ok = verify_password(data.password, user.password_hash if user else _DUMMY_HASH)
    if not (user and password_ok and user.is_active):
        login_throttle.record_failure(key)
        raise AuthenticationException("Incorrect email or password")

    login_throttle.reset(key)
    return _issue_token(user)


def _check_current_password(user: User, password: str, client_ip: str) -> None:
    """Re-authenticate for sensitive actions; failures count towards the login throttle."""
    key = f"{client_ip}|{user.email}"
    login_throttle.check(key)
    if not verify_password(password, user.password_hash):
        login_throttle.record_failure(key)
        raise AuthenticationException("Incorrect password")
    login_throttle.reset(key)


def change_password(db: Session, user: User, data: ChangePasswordRequest, client_ip: str) -> TokenResponse:
    """Change the password, invalidate all older tokens and return a fresh one."""
    _check_current_password(user, data.current_password, client_ip)
    if data.new_password == data.current_password:
        raise ConflictException("The new password must be different from the current one")
    user = user_repository.set_password(db, user, get_password_hash(data.new_password))
    return _issue_token(user)


def delete_account(db: Session, user: User, password: str, client_ip: str) -> None:
    """Permanently delete the account and, by cascade, all of its saved analyses."""
    _check_current_password(user, password, client_ip)
    user_repository.delete(db, user)


def user_from_token(db: Session, token: str) -> User:
    """Resolve a bearer token to an active user or raise AuthenticationException."""
    try:
        claims = decode_access_token(token)
        if claims.get("type") != "access":
            raise AuthenticationException()
        user = user_repository.get_by_id(db, uuid.UUID(claims["sub"]))
        if user is not None and claims.get("tv") != user.token_version:
            raise AuthenticationException()  # issued before a password change
    except (jwt.PyJWTError, ValueError, KeyError):
        raise AuthenticationException() from None
    if not user or not user.is_active:
        raise AuthenticationException()
    return user
