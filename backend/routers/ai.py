"""Public AI assistant endpoint. No authentication required — aggregate data only."""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import analytics, ai

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AskRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    filters: dict[str, Any] = Field(default_factory=dict)
    history: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/status")
def status() -> dict[str, bool]:
    from ..config import AI_API_KEY
    return {"available": bool(AI_API_KEY)}


@router.get("/suggestions")
def suggestions() -> dict[str, list[str]]:
    return {"suggested": ai.SUGGESTED}


@router.post("/ask")
async def ask(payload: AskRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    filters = analytics.parse_filters(payload.filters)
    return await asyncio.to_thread(ai.ask, payload.message, filters, db, payload.history)
