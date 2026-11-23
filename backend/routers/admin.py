"""Administrative endpoints: imports, record management, users, settings and exports."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    AcademicYear, AuditLog, Location, Role, School, Setting, Student, UploadedDataset, User,
)
from ..seed import seed_demo_data
from ..security import (
    hash_password, require_admin, require_super_admin, role_payload,
)
from ..services import analytics, exporter, importer
from ..services.cache import cache_clear
from .auth import log_action

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ConfirmImport(BaseModel):
    staging_id: int
    replace_demo: bool = False


class StudentInput(BaseModel):
    student_id: str
    application_id: str
    full_name: str
    gender: str = "Not specified"
    date_of_birth: str | None = None
    class_applied: str = "Not specified"
    exam_year: int = 2026
    academic_year: str | None = None
    country: str = "India"
    state: str
    district: str = "Unknown"
    city: str
    pincode: str | None = None
    school_type: str = "Other"
    previous_school: str = "Unknown"
    entrance_score: float | None = None
    percentage: float | None = None
    previous_academic_percentage: float | None = None
    admission_status: str = "Pending"
    registration_date: str | None = None
    source_referral: str | None = None


class UserInput(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _resolve_dimensions(db: Session, data: dict[str, Any]):
    year = int(data.get("exam_year") or 2026)
    academic_year = db.query(AcademicYear).filter(AcademicYear.year == year).first()
    if academic_year is None:
        academic_year = AcademicYear(year=year, label=data.get("academic_year") or f"{year}-{str(year + 1)[-2:]}")
        db.add(academic_year)
        db.flush()

    loc = db.query(Location).filter(
        Location.country == data.get("country", "India"),
        Location.state == data.get("state"),
        Location.district == data.get("district", "Unknown"),
        Location.city == data.get("city"),
    ).first()
    if loc is None:
        loc = Location(
            country=data.get("country", "India"), state=data.get("state"),
            district=data.get("district", "Unknown"), city=data.get("city"),
            pincode=data.get("pincode") or "",
        )
        db.add(loc)
        db.flush()

    school = db.query(School).filter(School.name == data.get("previous_school", "Unknown")).first()
    if school is None:
        school = School(name=data.get("previous_school", "Unknown"), school_type=data.get("school_type", "Other"))
        db.add(school)
        db.flush()
    return academic_year, loc, school


@router.post("/import/preview")
def import_preview(
    file: UploadFile = File(...),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    raw = file.file.read()
    try:
        result = importer.preview(db, file.filename or "upload.csv", raw, user.username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    log_action(db, user, "import_preview", "uploaded_datasets", str(result["staging_id"]),
               f"{result['total_records']} rows from {file.filename}", request)
    return result


@router.post("/import/confirm")
def import_confirm(
    payload: ConfirmImport,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    cache_clear()
    if payload.replace_demo:
        db.query(Student).filter(Student.is_synthetic.is_(True)).delete()
        db.commit()
    try:
        result = importer.confirm_import(db, payload.staging_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    log_action(db, user, "import_confirm", "uploaded_datasets", str(payload.staging_id),
               f"Imported {result['imported']} records", request)
    return result


@router.get("/import/history")
def import_history(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(UploadedDataset).order_by(UploadedDataset.created_at.desc()).limit(30).all()
    return [{
        "id": r.id, "filename": r.filename, "uploaded_by": r.uploaded_by,
        "record_count": r.record_count, "valid_count": r.valid_count,
        "invalid_count": r.invalid_count, "duplicate_count": r.duplicate_count,
        "status": r.status, "created_at": r.created_at.isoformat(),
    } for r in rows]


@router.post("/demo/regenerate")
def regenerate_demo(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    count = seed_demo_data(db)
    log_action(db, user, "demo_regenerate", details=f"Generated {count} synthetic records", request=request)
    return {"generated": count, "data_mode": "demo"}


@router.delete("/demo/clear")
def clear_demo(
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    cache_clear()
    removed = db.query(Student).filter(Student.is_synthetic.is_(True)).delete()
    mode = db.get(Setting, "data_mode")
    if mode and not db.query(Student).filter(Student.is_synthetic.is_(False)).count():
        mode.value = "empty"
    db.commit()
    log_action(db, user, "demo_clear", details=f"Removed {removed} synthetic records", request=request)
    return {"removed": removed}


@router.get("/students")
def list_students(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total = db.query(Student).count()
    rows = db.query(Student).order_by(Student.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total, "page": page,
        "pages": max(1, (total + page_size - 1) // page_size),
        "records": [{
            "id": r.id, "student_id": r.student_id, "application_id": r.application_id,
            "full_name": r.full_name, "year": r.academic_year.year,
            "state": r.location.state, "city": r.location.city, "country": r.location.country,
            "class_applied": r.class_applied, "admission_status": r.admission_status,
            "is_synthetic": r.is_synthetic,
        } for r in rows],
    }


@router.post("/students")
def create_student(
    payload: StudentInput,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    data = payload.model_dump()
    academic_year, loc, school = _resolve_dimensions(db, data)
    if db.query(Student).filter(Student.student_id == data["student_id"]).first():
        raise HTTPException(status_code=409, detail="Student ID already exists")
    record = Student(
        student_id=data["student_id"], application_id=data["application_id"],
        full_name=data["full_name"], gender=data["gender"],
        date_of_birth=_parse_date(data.get("date_of_birth")),
        class_applied=data["class_applied"], academic_year_id=academic_year.id,
        location_id=loc.id, school_id=school.id,
        entrance_score=data.get("entrance_score"), percentage=data.get("percentage"),
        previous_academic_percentage=data.get("previous_academic_percentage"),
        admission_status=data["admission_status"],
        registration_date=_parse_date(data.get("registration_date")),
        source_referral=data.get("source_referral"), is_synthetic=False,
    )
    db.add(record)
    db.commit()
    cache_clear()
    log_action(db, user, "student_create", "students", record.student_id, request=request)
    return {"id": record.id, "status": "created"}


@router.put("/students/{student_id}")
def update_student(
    student_id: int,
    payload: StudentInput,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    record = db.get(Student, student_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    data = payload.model_dump()
    academic_year, loc, school = _resolve_dimensions(db, data)
    for field in ("student_id", "application_id", "full_name", "gender", "class_applied",
                  "entrance_score", "percentage", "previous_academic_percentage", "admission_status", "source_referral"):
        setattr(record, field, data[field])
    record.date_of_birth = _parse_date(data.get("date_of_birth"))
    record.registration_date = _parse_date(data.get("registration_date"))
    record.academic_year_id = academic_year.id
    record.location_id = loc.id
    record.school_id = school.id
    record.is_synthetic = False
    db.commit()
    cache_clear()
    log_action(db, user, "student_update", "students", record.student_id, request=request)
    return {"status": "updated"}


@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    record = db.get(Student, student_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    identifier = record.student_id
    db.delete(record)
    db.commit()
    cache_clear()
    log_action(db, user, "student_delete", "students", identifier, request=request)
    return {"status": "deleted"}


@router.get("/users")
def list_users(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(User).order_by(User.id).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "full_name": u.full_name,
             "role": u.role.name, "is_active": u.is_active, "last_login": u.last_login.isoformat() if u.last_login else None}
            for u in rows]


@router.post("/users")
def create_user(
    payload: UserInput,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    role = db.query(Role).filter(Role.name == payload.role.upper()).first()
    if role is None:
        raise HTTPException(status_code=400, detail="Unknown role")
    if db.query(User).filter(User.username == payload.username.lower()).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    created = User(
        username=payload.username.strip().lower(), email=payload.email.strip(),
        full_name=payload.full_name.strip(), password_hash=hash_password(payload.password),
        role_id=role.id, is_active=True,
    )
    db.add(created)
    db.commit()
    log_action(db, user, "user_create", "users", created.username, request=request)
    return {"id": created.id, "status": "created"}


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role:
        role = db.query(Role).filter(Role.name == payload.role.upper()).first()
        if role is None:
            raise HTTPException(status_code=400, detail="Unknown role")
        target.role_id = role.id
    if payload.is_active is not None:
        target.is_active = payload.is_active
    if payload.password:
        target.password_hash = hash_password(payload.password)
    db.commit()
    log_action(db, user, "user_update", "users", target.username, request=request)
    return {"status": "updated"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    name = target.username
    db.delete(target)
    db.commit()
    log_action(db, user, "user_delete", "users", name, request=request)
    return {"status": "deleted"}


@router.get("/audit-logs")
def audit_logs(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{
        "id": r.id, "username": r.username, "action": r.action, "entity": r.entity,
        "entity_id": r.entity_id, "details": r.details,
        "created_at": r.created_at.isoformat(),
    } for r in rows]


@router.get("/settings")
def get_settings(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {s.key: s.value for s in db.query(Setting).all()}


@router.put("/settings")
def update_settings(
    values: dict[str, str],
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    for key, value in values.items():
        setting = db.get(Setting, key)
        if setting is None:
            db.add(Setting(key=key, value=str(value)))
        else:
            setting.value = str(value)
    db.commit()
    log_action(db, user, "settings_update", "settings", details=str(list(values.keys())), request=request)
    return {"status": "updated"}


@router.get("/export")
def export_report(
    request: Request,
    format: str = Query(default="csv", pattern="^(csv|xlsx|pdf|students_csv)$"),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from fastapi.responses import Response

    filters = analytics.parse_filters(request.query_params)
    if format == "students_csv":
        content = exporter.export_students_csv(db, filters)
        media = "text/csv"
        filename = "mva_student_records.csv"
    elif format == "xlsx":
        content = exporter.export_xlsx(db, filters)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "mva_analytics_report.xlsx"
    elif format == "pdf":
        content = exporter.export_pdf(db, filters)
        media = "application/pdf"
        filename = "mva_analytics_report.pdf"
    else:
        content = exporter.export_csv(db, filters)
        media = "text/csv"
        filename = "mva_analytics_report.csv"
    log_action(db, user, "export", details=f"format={format}", request=request)
    return Response(
        content=content, media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
