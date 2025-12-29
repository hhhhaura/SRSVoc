import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth_router, library_router, study_router

# Create database tables
Base.metadata.create_all(bind=engine)

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
