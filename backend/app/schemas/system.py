"""VERITAS AI - System Information Schemas."""

from pydantic import BaseModel, Field


class SystemInfoResponse(BaseModel):
    """Response payload for system information."""
    application: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Runtime environment")
    docs_url: str = Field(..., description="Relative URL to interactive API documentation")
