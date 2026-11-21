"""Authentication, password hashing and role-based access control."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Callable

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .config import SESSION_TTL_HOURS
from .database import get_db
from .models import Role, Session as UserSession, User

ROLE_RANK = {"VIEWER": 1, "ANALYST": 2, "SCHOOL_ADMIN": 3, "SUPER_ADMIN": 4}
PBKDF2_ITERATIONS = 240_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(candidate.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_session(db: Session, user: User) -> str:
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    token = secrets.token_urlsafe(48)
    db.add(UserSession(
        token=token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS),
    ))
    user.last_login = datetime.utcnow()
    db.commit()
    return token


def resolve_user(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    record = db.query(UserSession).filter(UserSession.token == token).first()
    if record is None or record.expires_at < datetime.utcnow():
        return None
    user = db.query(User).filter(User.id == record.user_id, User.is_active.is_(True)).first()
    return user


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User | None:
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    return resolve_user(db, token)


def require_user(user: User | None = Depends(current_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_role(*roles: str) -> Callable:
    allowed = {r.upper() for r in roles}

    def checker(user: User = Depends(require_user)) -> User:
        name = user.role.name.upper()
        if name not in allowed and ROLE_RANK.get(name, 0) < max(
            (ROLE_RANK.get(r, 0) for r in allowed), default=0
        ):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return checker


require_viewer = require_role("VIEWER", "ANALYST", "SCHOOL_ADMIN", "SUPER_ADMIN")
require_analyst = require_role("ANALYST", "SCHOOL_ADMIN", "SUPER_ADMIN")
require_admin = require_role("SCHOOL_ADMIN", "SUPER_ADMIN")
require_super_admin = require_role("SUPER_ADMIN")


def role_payload(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.name,
        "rank": ROLE_RANK.get(user.role.name.upper(), 0),
    }


def ensure_roles_and_default_users(db: Session) -> None:
    names = ["VIEWER", "ANALYST", "SCHOOL_ADMIN", "SUPER_ADMIN"]
    existing = {r.name for r in db.query(Role).all()}
    for name in names:
        if name not in existing:
            db.add(Role(
                name=name,
                description={
                    "VIEWER": "Read-only aggregate analytics. No student-level data.",
                    "ANALYST": "Analytics, forecasting, student search and exports.",
                    "SCHOOL_ADMIN": "Full data management, imports, users and settings.",
                    "SUPER_ADMIN": "Complete system control.",
                }[name],
            ))
    db.commit()

    defaults = [
        ("superadmin", "admin@mva.edu.in", "Admin@MVA2026!", "Super Administrator", "SUPER_ADMIN"),
        ("schooladmin", "school@mva.edu.in", "School@MVA2026!", "School Administrator", "SCHOOL_ADMIN"),
        ("analyst", "analyst@mva.edu.in", "Analyst@MVA2026!", "Data Analyst", "ANALYST"),
        ("viewer", "viewer@mva.edu.in", "Viewer@MVA2026!", "Viewer", "VIEWER"),
    ]
    roles = {r.name: r.id for r in db.query(Role).all()}
    for username, email, password, full_name, role_name in defaults:
        if db.query(User).filter(User.username == username).first() is None:
            db.add(User(
                username=username,
                email=email,
                full_name=full_name,
                password_hash=hash_password(password),
                role_id=roles[role_name],
                is_active=True,
            ))
    db.commit()
