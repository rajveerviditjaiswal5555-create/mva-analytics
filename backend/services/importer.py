"""CSV / Excel import with column mapping, validation and duplicate detection."""
from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime
from typing import Any

from openpyxl import load_workbook
from sqlalchemy.orm import Session

from ..models import AcademicYear, Location, School, Setting, Student, UploadedDataset

CANONICAL = [
    "student_id", "application_id", "full_name", "gender", "date_of_birth",
    "class_applied", "academic_year", "exam_year", "country", "state", "district",
    "city", "pincode", "school_type", "previous_school", "entrance_score",
    "percentage", "previous_academic_percentage", "admission_status",
    "registration_date", "source_referral",
]

ALIASES = {
    "studentid": "student_id", "student_id": "student_id", "rollno": "student_id", "roll_number": "student_id",
    "applicationid": "application_id", "application_id": "application_id", "appid": "application_id",
    "name": "full_name", "studentname": "full_name", "student_name": "full_name", "fullname": "full_name",
    "sex": "gender",
    "dob": "date_of_birth", "dateofbirth": "date_of_birth", "birthdate": "date_of_birth",
    "class": "class_applied", "classapplied": "class_applied", "grade": "class_applied",
    "academicyear": "academic_year", "session": "academic_year",
    "year": "exam_year", "examyear": "exam_year", "entranceyear": "exam_year",
    "state": "state", "province": "state",
    "city": "city", "district": "district", "pin": "pincode", "pincode": "pincode", "postalcode": "pincode",
    "schooltype": "school_type", "board": "school_type",
    "previousschool": "previous_school", "school": "previous_school",
    "score": "entrance_score", "entrancescore": "entrance_score", "entrance_exam_score": "entrance_score",
    "percent": "percentage", "percentage": "percentage", "entrancepercentage": "percentage",
    "previouspercentage": "previous_academic_percentage", "prevpercentage": "previous_academic_percentage",
    "previousacademicpercentage": "previous_academic_percentage",
    "status": "admission_status", "admissionstatus": "admission_status",
    "registrationdate": "registration_date", "regdate": "registration_date",
    "source": "source_referral", "referral": "source_referral", "sourcereferral": "source_referral",
}

REQUIRED = ["full_name", "state", "city", "country", "class_applied"]


def _norm(header: str) -> str:
    return "".join(ch for ch in str(header).lower() if ch.isalnum())


def read_table(filename: str, raw: bytes) -> tuple[list[str], list[dict[str, Any]]]:
    if filename.lower().endswith((".xlsx", ".xlsm")):
        workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        sheet = workbook.active
        iterator = sheet.iter_rows(values_only=True)
        headers = [str(cell).strip() if cell is not None else "" for cell in next(iterator)]
        rows = [dict(zip(headers, row)) for row in iterator if any(cell is not None for cell in row)]
        workbook.close()
    else:
        text = raw.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        headers = reader.fieldnames or []
        rows = [dict(row) for row in reader]
    return headers, rows


def build_mapping(headers: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for header in headers:
        key = _norm(header)
        if key in ALIASES:
            mapping[header] = ALIASES[key]
        elif key in CANONICAL:
            mapping[header] = key
    return mapping


def _as_float(value: Any) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _as_date(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, (datetime, date)):
        return value.date().isoformat() if isinstance(value, datetime) else value.isoformat()
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return text  # keep raw; validation flags it later


def preview(db: Session, filename: str, raw: bytes, uploaded_by: str) -> dict:
    if len(raw) > 25 * 1024 * 1024:
        raise ValueError("Uploaded file exceeds the 25 MB limit.")
    headers, source_rows = read_table(filename, raw)
    if not headers:
        raise ValueError("The uploaded file has no header row.")
    mapping = build_mapping(headers)
    if not mapping:
        raise ValueError("No recognizable columns were found. Check the column names.")

    existing_ids = {row[0] for row in db.query(Student.student_id).all()}
    existing_apps = {row[0] for row in db.query(Student.application_id).all()}

    normalized: list[dict[str, Any]] = []
    errors: list[str] = []
    seen_ids: set[str] = set()
    valid = 0
    invalid = 0
    duplicates = 0
    missing_counts: dict[str, int] = {field: 0 for field in CANONICAL}

    for index, source in enumerate(source_rows, start=2):
        record: dict[str, Any] = {}
        for header, canonical in mapping.items():
            value = source.get(header)
            record[canonical] = value.strip() if isinstance(value, str) else value

        row_errors: list[str] = []
        for field in REQUIRED:
            if not record.get(field):
                missing_counts[field] += 1
                row_errors.append(f"row {index}: missing {field}")

        for field in ("date_of_birth", "registration_date"):
            record[field] = _as_date(record.get(field))
        for field in ("entrance_score", "percentage", "previous_academic_percentage"):
            record[field] = _as_float(record.get(field))
        record["exam_year"] = _as_float(record.get("exam_year"))
        if record["exam_year"] is not None:
            record["exam_year"] = int(record["exam_year"])

        if record.get("entrance_score") is not None and not (0 <= record["entrance_score"] <= 500):
            row_errors.append(f"row {index}: entrance score outside 0–500")
        for field in ("percentage", "previous_academic_percentage"):
            value = record.get(field)
            if value is not None and not (0 <= value <= 100):
                row_errors.append(f"row {index}: {field} outside 0–100")
        if not record.get("student_id"):
            record["student_id"] = f"IMP-{datetime.utcnow().strftime('%Y%m%d')}-{index:06d}"
        if not record.get("application_id"):
            record["application_id"] = f"APP-IMP-{index:06d}"

        sid = str(record["student_id"])
        if sid in existing_ids or sid in seen_ids:
            duplicates += 1
            row_errors.append(f"row {index}: duplicate student_id {sid}")
        seen_ids.add(sid)
        aid = str(record["application_id"])
        if aid in existing_apps:
            duplicates += 1
            row_errors.append(f"row {index}: duplicate application_id {aid}")

        for field, value in record.items():
            if field in missing_counts and value in (None, ""):
                missing_counts[field] += 1

        if row_errors:
            invalid += 1
            if len(errors) < 25:
                errors.extend(row_errors[:2])
        else:
            valid += 1

        normalized.append({k: v for k, v in record.items() if k in CANONICAL})

    staging = UploadedDataset(
        filename=filename,
        uploaded_by=uploaded_by,
        record_count=len(source_rows),
        valid_count=valid,
        invalid_count=invalid,
        duplicate_count=duplicates,
        status="previewed",
        notes=json.dumps({"mapping": mapping, "records": normalized}),
    )
    db.add(staging)
    db.commit()

    return {
        "staging_id": staging.id,
        "filename": filename,
        "total_records": len(source_rows),
        "valid_records": valid,
        "invalid_records": invalid,
        "duplicate_records": duplicates,
        "missing_fields": {k: v for k, v in missing_counts.items() if v},
        "detected_columns": headers,
        "column_mapping": mapping,
        "preview": normalized[:12],
        "errors": errors,
    }


def confirm_import(db: Session, staging_id: int, keep_existing: bool = True) -> dict:
    staging = db.get(UploadedDataset, staging_id)
    if staging is None:
        raise ValueError("Staging dataset not found.")
    if staging.status == "imported":
        raise ValueError("This dataset has already been imported.")

    payload = json.loads(staging.notes or "{}")
    records = payload.get("records", [])
    years: dict[int, AcademicYear] = {}
    year_values = sorted({r["exam_year"] for r in records if isinstance(r.get("exam_year"), int)})
    for year in year_values:
        existing = db.query(AcademicYear).filter(AcademicYear.year == year).first()
        years[year] = existing or AcademicYear(year=year, label=f"{year}-{str(year + 1)[-2:]}")
        if existing is None:
            db.add(years[year])
    db.flush()

    locations: dict[tuple, Location] = {}
    location_keys = {
        (r.get("country") or "Unknown", r.get("state") or "Unknown",
         r.get("district") or "Unknown", r.get("city") or "Unknown")
        for r in records
    }
    for key in location_keys:
        existing = db.query(Location).filter(
            Location.country == key[0], Location.state == key[1],
            Location.district == key[2], Location.city == key[3],
        ).first()
        locations[key] = existing or Location(
            country=key[0], state=key[1], district=key[2], city=key[3], pincode="",
        )
        if existing is None:
            db.add(locations[key])
    db.flush()

    schools: dict[tuple, School] = {}
    school_keys = {
        (r.get("previous_school") or "Unknown", r.get("school_type") or "Other")
        for r in records
    }
    for key in school_keys:
        existing = db.query(School).filter(School.name == key[0]).first()
        schools[key] = existing or School(name=key[0], school_type=key[1])
        if existing is None:
            db.add(schools[key])
    db.flush()

    inserted = 0
    for record in records:
        year = record.get("exam_year") or 2026
        if year not in years:
            years[year] = db.query(AcademicYear).filter(AcademicYear.year == year).first()
            if years[year] is None:
                years[year] = AcademicYear(year=year, label=str(year))
                db.add(years[year])
                db.flush()
        loc_key = (record.get("country") or "Unknown", record.get("state") or "Unknown",
                   record.get("district") or "Unknown", record.get("city") or "Unknown")
        school_key = (record.get("previous_school") or "Unknown", record.get("school_type") or "Other")
        dob = _as_date(record.get("date_of_birth"))
        reg = _as_date(record.get("registration_date"))
        try:
            dob_obj = date.fromisoformat(dob) if dob and len(dob) == 10 else None
        except ValueError:
            dob_obj = None
        try:
            reg_obj = date.fromisoformat(reg) if reg and len(reg) == 10 else None
        except ValueError:
            reg_obj = None

        db.add(Student(
            student_id=str(record["student_id"]),
            application_id=str(record["application_id"]),
            full_name=str(record.get("full_name") or "Unknown"),
            gender=str(record.get("gender") or "Not specified"),
            date_of_birth=dob_obj,
            class_applied=str(record.get("class_applied") or "Not specified"),
            academic_year_id=years[year].id,
            location_id=locations[loc_key].id,
            school_id=schools[school_key].id,
            entrance_score=_as_float(record.get("entrance_score")),
            percentage=_as_float(record.get("percentage")),
            previous_academic_percentage=_as_float(record.get("previous_academic_percentage")),
            admission_status=str(record.get("admission_status") or "Pending"),
            registration_date=reg_obj,
            source_referral=record.get("source_referral"),
            is_synthetic=False,
        ))
        inserted += 1

    mode = db.get(Setting, "data_mode")
    if mode:
        mode.value = "official"
    else:
        db.add(Setting(key="data_mode", value="official"))
    staging.status = "imported"
    db.commit()
    return {"imported": inserted, "staging_id": staging_id, "data_mode": "official"}
