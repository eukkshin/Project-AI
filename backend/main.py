"""Run: uvicorn app.main:app --reload --port 8000"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.booking_routes import router as booking_router
from app.core.config import settings
from app.core.database import initialize_database
from app.api.auth_routes import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield

app = FastAPI(title="DINOVO Dining Concierge API", version="1.0.0", docs_url="/docs", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(router)
app.include_router(booking_router)

app.include_router(auth_router)
