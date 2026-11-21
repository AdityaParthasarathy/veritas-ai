"""VERITAS AI - Health Check Schemas."""

from pydantic import BaseModel, Field


class LiveHealthResponse(BaseModel):
    """Response payload for liveness probe."""
    status: str = Field(default="alive", description="Process liveness indicator")
    application: str = Field(default="VERITAS AI", description="Application identifier")


class ReadyHealthResponse(BaseModel):
    """Response payload for the readiness probe."""
    status: str = Field(default="ready", description="Service readiness indicator")
    database: str = Field(default="not_used", description="This edition has no database; always 'not_used'")
