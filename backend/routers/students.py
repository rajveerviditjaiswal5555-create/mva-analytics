"""Student-level endpoints — restricted to authorized roles only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Student, User
from ..security import require_analyst, role_payload
from ..services import analytics

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/search")
def search(
    request: Request,
    q: str = Query(default="", description="ID, application ID, name, city, state, country, year or class"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
):
    filters = analytics.parse_filters(request.query_params)
    result = analytics.search_students(
        db, q, filters, limit=page_size, offset=(page - 1) * page_size
    )
    return {
        **result,
        "page": page,
        "pages": max(1, (result["total"] + page_size - 1) // page_size),
        "accessed_by": role_payload(user)["username"],
    }


@router.get("/{student_id}")
def get_student(
    student_id: int,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
):
    record = db.get(Student, student_id)
    if record is None:
        return {"error": "Record not found"}
    return {
        "id": record.id,
        "student_id": record.student_id,
        "application_id": record.application_id,
        "full_name": record.full_name,
        "gender": record.gender,
        "date_of_birth": record.date_of_birth.isoformat() if record.date_of_birth else None,
        "class_applied": record.class_applied,
        "year": record.academic_year.year,
        "state": record.location.state,
        "district": record.location.district,
        "city": record.location.city,
        "country": record.location.country,
        "pincode": record.location.pincode,
        "school_type": record.school.school_type if record.school else None,
        "previous_school": record.school.name if record.school else None,
        "entrance_score": record.entrance_score,
        "percentage": record.percentage,
        "previous_academic_percentage": record.previous_academic_percentage,
        "admission_status": record.admission_status,
        "registration_date": record.registration_date.isoformat() if record.registration_date else None,
        "source_referral": record.source_referral,
        "is_synthetic": record.is_synthetic,
    }
