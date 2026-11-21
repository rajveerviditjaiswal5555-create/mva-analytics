"""Authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, Session as UserSession, User
from ..security import (
    create_session, current_user, require_user, role_payload, verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
    user = db.query(User).filter(User.username == payload.username.strip().lower()).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        log_action(db, None, "login_failed", details=f"username={payload.username}", request=request)
        raise HTTPException(status_code=401, detail="Invalid username or password")
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
