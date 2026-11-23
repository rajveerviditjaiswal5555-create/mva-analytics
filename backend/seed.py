"""Database initialization and DEMO-mode seeding."""
from __future__ import annotations

from sqlalchemy import select

from .config import DEMO_RECORD_TARGET, DEMO_SEED
from .database import Base, SessionLocal, engine
from .generators.synthetic import generate_records
from .models import AcademicYear, EntranceExam, Location, School, Setting, Student
from .security import ensure_roles_and_default_users
from .services.cache import cache_clear


def init_db(seed_demo: bool = True) -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        ensure_roles_and_default_users(db)

        setting = db.get(Setting, "data_mode")
        if setting is None:
            db.add(Setting(key="data_mode", value="demo" if seed_demo else "empty"))
            db.commit()

        if seed_demo and db.query(Student).count() == 0:
            seed_demo_data(db)
    finally:
        db.close()


def seed_demo_data(db, total: int = DEMO_RECORD_TARGET) -> int:
    """Replace all current records with freshly generated synthetic ones."""
    cache_clear()
    db.query(Student).delete()
    db.query(EntranceExam).delete()
    db.query(AcademicYear).delete()
    db.query(Location).delete()
    db.query(School).delete()
    db.commit()

    records = generate_records(total, DEMO_SEED)

    years: dict[int, AcademicYear] = {}
    for rec in records:
        y = rec["exam_year"]
        if y not in years:
            years[y] = AcademicYear(year=y, label=rec["academic_year"])
            db.add(years[y])
    db.flush()

    exams: dict[str, EntranceExam] = {}
    for rec in records:
        code = rec["exam_code"]
        if code not in exams:
            exams[code] = EntranceExam(
                code=code,
                name=f"Macro Vision Academy Entrance Exam {rec['exam_year']}",
                exam_year=rec["exam_year"],
                academic_year_id=years[rec["exam_year"]].id,
            )
            db.add(exams[code])

    locations: dict[tuple, Location] = {}
    for rec in records:
        key = (rec["country"], rec["state"], rec["district"], rec["city"])
        if key not in locations:
            locations[key] = Location(
                country=rec["country"], state=rec["state"],
                district=rec["district"], city=rec["city"], pincode=rec.get("pincode") or "",
            )
            db.add(locations[key])

    schools: dict[str, School] = {}
    for rec in records:
        key = rec["previous_school"]
        if key not in schools:
            schools[key] = School(name=key, school_type=rec["school_type"])
            db.add(schools[key])

    db.flush()

    batch: list[Student] = []
    for rec in records:
        loc = locations[(rec["country"], rec["state"], rec["district"], rec["city"])]
        batch.append(Student(
            student_id=rec["student_id"],
            application_id=rec["application_id"],
            full_name=rec["full_name"],
            gender=rec["gender"],
            date_of_birth=rec["date_of_birth"],
            class_applied=rec["class_applied"],
            academic_year_id=years[rec["exam_year"]].id,
            entrance_exam_id=exams[rec["exam_code"]].id,
            location_id=loc.id,
            school_id=schools[rec["previous_school"]].id,
            entrance_score=rec["entrance_score"],
            percentage=rec["percentage"],
            previous_academic_percentage=rec["previous_academic_percentage"],
            admission_status=rec["admission_status"],
            registration_date=rec["registration_date"],
            source_referral=rec["source_referral"],
            is_synthetic=True,
        ))
        if len(batch) >= 1500:
            db.add_all(batch)
            db.flush()
            batch = []
    if batch:
        db.add_all(batch)

    setting = db.get(Setting, "data_mode")
    if setting:
        setting.value = "demo"
    else:
        db.add(Setting(key="data_mode", value="demo"))
    db.commit()
    return len(records)
