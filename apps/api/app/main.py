from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai, assignments, institutions, submissions, users, verify


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="ProofPath API",
    description="AI-governed writing platform for higher education",
    version=settings.platform_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(ai.router)
app.include_router(verify.router)
app.include_router(institutions.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.platform_version}
