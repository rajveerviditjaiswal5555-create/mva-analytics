"""Authentication endpoints."""
from __future__ import annotations

import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, Session as UserSession, User
from ..security import (
    create_session, current_user, require_user, role_payload, verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILED_ATTEMPTS = 5
ATTEMPT_WINDOW_SECONDS = 300

# (ip, username) -> [failed_count, first_attempt_monotonic]
_attempts: dict[tuple[str, str], list[float]] = {}
_attempts_lock = threading.Lock()


def _purge_expired_attempts(now: float) -> None:
    """Drop tracking entries whose window has elapsed (call while locked)."""
    for key, record in list(_attempts.items()):
        if now - record[1] >= ATTEMPT_WINDOW_SECONDS:
            _attempts.pop(key, None)


def _client_ip(request: Request) -> str:
    return request.client.host if request and request.client else "unknown"


class LoginRequest(BaseModel):
    username: str
    password: str


def log_action(db: Session, user: User | None, action: str, entity: str = "", entity_id: str = "", details: str = "", request: Request | None = None) -> None:
    db.add(AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "anonymous",
        action=action, entity=entity, entity_id=entity_id, details=details,
        ip_address=request.client.host if request and request.client else None,
    ))
    db.commit()


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    username = payload.username.strip().lower()
    key = (_client_ip(request), username)
    now = time.monotonic()

    with _attempts_lock:
        record = _attempts.get(key)
        if record and record[0] >= MAX_FAILED_ATTEMPTS and now - record[1] < ATTEMPT_WINDOW_SECONDS:
            raise HTTPException(
                status_code=429,
                detail="Too many failed login attempts. Try again in a few minutes.",
            )

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        with _attempts_lock:
            now = time.monotonic()
            record = _attempts.get(key)
            if record is None or now - record[1] >= ATTEMPT_WINDOW_SECONDS:
                _attempts[key] = [1, now]
                _purge_expired_attempts(now)
            else:
                record[0] += 1
        log_action(db, None, "login_failed", details=f"username={payload.username}", request=request)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    with _attempts_lock:
        _attempts.pop(key, None)
    token = create_session(db, user)
    log_action(db, user, "login", details="Session created", request=request)
    return {"token": token, "user": role_payload(user)}


@router.post("/logout")
def logout(request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        db.query(UserSession).filter_by(token=token).delete()
        db.commit()
    log_action(db, user, "logout", request=request)
    return {"status": "ok"}


@router.get("/me")
def me(user: User | None = Depends(current_user)):
    if user is None:
        return {"authenticated": False}
    return {"authenticated": True, "user": role_payload(user)}
