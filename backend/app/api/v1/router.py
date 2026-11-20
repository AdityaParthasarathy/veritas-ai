"""VERITAS AI - API v1 Router Aggregator."""

from fastapi import APIRouter
from app.api.v1.endpoints import health, system

api_router = APIRouter()

# Include versioned endpoint routers
api_router.include_router(health.router)
api_router.include_router(system.router)
