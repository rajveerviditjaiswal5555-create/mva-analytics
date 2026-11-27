"""Database engine, session factory and initialization helpers."""
from __future__ import annotations

import socket
from urllib.parse import urlparse

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL, DB_DIR


def _effective_url() -> str:
    """Use SQLite if a configured Postgres host cannot be resolved (e.g. wrong region)."""
    if DATABASE_URL.startswith(("postgres://", "postgresql://")):
        host = urlparse(DATABASE_URL).hostname
        if host:
            try:
                socket.getaddrinfo(host, None)
            except OSError:
                return f"sqlite:///{DB_DIR / 'mva.db'}"
    return DATABASE_URL


SQLALCHEMY_URL = _effective_url()
connect_args = {"check_same_thread": False} if SQLALCHEMY_URL.startswith("sqlite") else {}
engine = create_engine(
    SQLALCHEMY_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    future=True,
)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
