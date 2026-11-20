"""VERITAS AI - Health Check Schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class LiveHealthResponse(BaseModel):
    """Response payload for liveness probe."""
    status: str = Field(default="alive", description="Process liveness indicator")
    application: str = Field(default="VERITAS AI", description="Application identifier")


class ReadyHealthResponse(BaseModel):
    """Response payload for readiness probe when database is available."""
    status: str = Field(default="ready", description="Service readiness indicator")
    database: str = Field(default="connected", description="Database connection status")


class HealthNotReadyResponse(BaseModel):
    """Response payload for readiness probe when dependencies are unavailable."""
    status: str = Field(default="not_ready", description="Service readiness indicator")
    database: str = Field(default="disconnected", description="Database connection status")
    detail: Optional[str] = Field(default="Database unavailable", description="High-level reason")
