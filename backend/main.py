import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine, Base
from routers import auth_router, library_router, study_router
from migrate_db import migrate

# Create database tables
Base.metadata.create_all(bind=engine)

# Run migrations to add any missing columns
migrate()

app = FastAPI(
    title="SRS Vocabulary API",
    description="Spaced Repetition System for Vocabulary Learning",
    version="1.0.0"
)

# CORS middleware - allow all origins for now
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(library_router.router)
app.include_router(study_router.router)


@app.get("/")
async def root():
    return {"message": "SRS Vocabulary API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure CORS headers are included on 500 errors."""
    print(f"Unhandled exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
