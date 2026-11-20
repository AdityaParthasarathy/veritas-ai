"""Authentication endpoints."""

from fastapi import APIRouter, Request, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="Create an account")
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    return auth_service.register(db, payload)


@router.post("/login", response_model=TokenResponse, summary="Sign in and receive a bearer token")
def login(payload: LoginRequest, request: Request, db: DbSession) -> TokenResponse:
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.login(db, payload, client_ip)


@router.get("/me", response_model=UserOut, summary="Current user")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
