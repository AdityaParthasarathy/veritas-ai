"""Authentication endpoints."""

from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import ChangePasswordRequest, DeleteAccountRequest, LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="Create an account")
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    """Create an account and return a bearer token."""
    return auth_service.register(db, payload)


@router.post("/login", response_model=TokenResponse, summary="Sign in and receive a bearer token")
def login(payload: LoginRequest, request: Request, db: DbSession) -> TokenResponse:
    """Verify credentials and return a bearer token."""
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.login(db, payload, client_ip)


@router.get("/me", response_model=UserOut, summary="Current user")
def me(user: CurrentUser) -> UserOut:
    """Return the signed-in user."""
    return UserOut.model_validate(user)


def _ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/change-password", response_model=TokenResponse, summary="Change password (invalidates all existing tokens)")
def change_password(payload: ChangePasswordRequest, request: Request, user: CurrentUser, db: DbSession) -> TokenResponse:
    """Change the password and return a fresh token; all older tokens stop working."""
    return auth_service.change_password(db, user, payload, _ip(request))


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Delete my account and all saved analyses")
def delete_me(payload: DeleteAccountRequest, request: Request, user: CurrentUser, db: DbSession) -> Response:
    """Permanently delete the signed-in user's account and saved analyses."""
    auth_service.delete_account(db, user, payload.password, _ip(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
