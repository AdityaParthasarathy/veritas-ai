"""VERITAS AI - Custom Application Exceptions.

Defines domain-level exceptions and consistent error formats across the API.
"""

from typing import Any, Dict, Optional
from fastapi import status


class VeritasException(Exception):
    """Base exception class for all VERITAS AI application errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.headers = headers
        self.message = message
        self.code = code
        self.details = details or {}


class DatabaseUnavailableException(VeritasException):
    """Raised when the primary database cannot be reached."""

    def __init__(
        self,
        message: str = "Database connection unavailable",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            code="DATABASE_UNAVAILABLE",
            details=details,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class ResourceNotFoundException(VeritasException):
    """Raised when an entity is not found."""

    def __init__(
        self,
        resource: str,
        identifier: Any,
    ):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found",
            code="RESOURCE_NOT_FOUND",
            details={"resource": resource, "identifier": str(identifier)},
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ModelUnavailableException(VeritasException):
    """Raised when the ML models or artifacts needed for analysis are not installed."""

    def __init__(self, message: str = "Analysis models are not available") -> None:
        super().__init__(
            message=message,
            code="MODEL_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class AuthenticationException(VeritasException):
    """Missing, invalid or expired credentials."""

    def __init__(self, message: str = "Could not validate credentials") -> None:
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ConflictException(VeritasException):
    """The request conflicts with existing data (e.g. duplicate email)."""

    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="CONFLICT", status_code=status.HTTP_409_CONFLICT)


class TooManyRequestsException(VeritasException):
    """Raised when a client exceeds an attempt limit."""

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__(
            message="Too many attempts. Please try again later.",
            code="TOO_MANY_REQUESTS",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={"Retry-After": str(retry_after_seconds)},
        )
