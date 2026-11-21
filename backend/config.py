"""Application configuration.

All settings can be overridden with environment variables so the same code
runs locally with SQLite and in production with PostgreSQL.
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "database"
DB_DIR.mkdir(exist_ok=True)


def getenv(name: str, default: str) -> str:
    return os.environ.get(name, default)


DATABASE_URL = getenv("DATABASE_URL", f"sqlite:///{DB_DIR / 'mva.db'}")
SECRET_KEY = getenv("SECRET_KEY", "mva-dev-secret-change-me-in-production")
SESSION_TTL_HOURS = int(getenv("SESSION_TTL_HOURS", "12"))

# Number of synthetic records generated in DEMO mode.
DEMO_RECORD_TARGET = int(getenv("DEMO_RECORD_TARGET", "16500"))
DEMO_SEED = int(getenv("DEMO_SEED", "20260221"))

# Years covered by the analytics platform.
YEARS = list(range(2022, 2027))

_DEFAULT_ORIGINS = ",".join([
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:8000", "http://127.0.0.1:8000",
    "https://mva-analytics.onrender.com",
    "https://mva-analytics.up.railway.app",
    "https://mva-analytics.loca.lt",
])
ALLOWED_ORIGINS = [o.strip() for o in getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()]

MAX_UPLOAD_MB = int(getenv("MAX_UPLOAD_MB", "25"))
