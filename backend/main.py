"""Macro Vision Academy Analytics — FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import ALLOWED_ORIGINS, BASE_DIR
from .routers import admin, ai, analytics, auth, students
from .seed import init_db

DIST = BASE_DIR / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db(seed_demo=True)
    yield


app = FastAPI(
    title="Macro Vision Academy — Student Entrance Analytics API",
    version="1.0.0",
    description="Dynamically computed analytics, forecasting and administration API. Demo mode uses synthetic records only.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Content-Security-Policy", (
        "default-src 'self'; script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; "
        "connect-src 'self' https://api.groq.com ws: wss:; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    ))
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(students.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MVA Analytics API", "version": "1.0.0"}


if DIST.exists():
    assets = DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        index = DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse({"detail": "Frontend build not found"}, status_code=404)
else:
    @app.get("/", include_in_schema=False)
    def root_message():
        return JSONResponse({
            "message": "Backend is running. Build the frontend or use http://localhost:5173 in development.",
            "docs": "/docs",
        })
