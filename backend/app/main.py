"""VERITAS AI - FastAPI Application Entry Point.

Configures application lifespan, CORS, middleware, custom error handling,
and mounts versioned API routers.
"""

import threading
from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import VeritasException

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("veritas.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown routines."""
    logger.info("Starting up %s (Version: %s)...", settings.PROJECT_NAME, settings.VERSION)
    logger.info("Allowed CORS origins: %s", settings.cors_origins)
    if settings.PRELOAD_MODELS:
        # Background thread: the API accepts requests immediately; analysis requests wait on the same lock.
        from app.services.analysis_service import get_analysis_service

        threading.Thread(target=get_analysis_service().preload, name="ml-preload", daemon=True).start()
    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)


# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Production-grade AI-powered misinformation intelligence platform. "
        "Provides linguistic analysis, semantic retrieval, and uncertainty assessment."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Explicit CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


MAX_BODY_BYTES = 1_000_000  # request bodies are small JSON documents (analysis text is capped at 20k chars)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Reject oversized bodies and add defensive response headers."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            content={"error": {"code": "PAYLOAD_TOO_LARGE", "message": "Request body is too large", "details": {}}},
        )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/"):
        # JSON API: never cache (auth and user data) and never render as a document.
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


# Global Exception Handlers
@app.exception_handler(VeritasException)
async def veritas_exception_handler(request: Request, exc: VeritasException) -> JSONResponse:
    """Handle custom application exceptions with a structured error envelope."""
    logger.warning("Application error [%s]: %s", exc.code, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle input validation errors cleanly without exposing internals."""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({"field": field, "message": err.get("msg")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "details": errors,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled errors. Never leaks stack traces."""
    logger.error("Unhandled server error: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please contact the administrator.",
            }
        },
    )


# Mount versioned API routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    """Root redirect / welcoming payload."""
    return {
        "application": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR,
    }
