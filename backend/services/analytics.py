"""All analytics are computed dynamically from the database — nothing is hard-coded."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import AcademicYear, Location, School, Setting, Student
from .forecasting import classify_growth, forecast

FILTER_KEYS = [
    "year", "state", "district", "city", "country", "gender",
    "class_applied", "admission_status", "school_type",
    "score_min", "score_max", "percentage_min", "percentage_max",
]


def parse_filters(params) -> dict[str, Any]:
    """Extract recognized filters from a request's query parameters."""
    result: dict[str, Any] = {}
    for key in FILTER_KEYS:
        value = params.get(key)
        if value not in (None, "", "all"):
            result[key] = value
    return result


def fetch_rows(db: Session, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    filters = filters or {}
    query = (
        db.query(
            Student.id.label("id"),
            Student.student_id.label("student_id"),
            Student.application_id.label("application_id"),
            Student.full_name.label("full_name"),
            Student.gender.label("gender"),
            Student.date_of_birth.label("date_of_birth"),
            Student.class_applied.label("class_applied"),
            AcademicYear.year.label("year"),
            Location.country.label("country"),
            Location.state.label("state"),
            Location.district.label("district"),
            Location.city.label("city"),
            Location.pincode.label("pincode"),
            Student.entrance_score.label("entrance_score"),
            Student.percentage.label("percentage"),
            Student.previous_academic_percentage.label("previous_academic_percentage"),
            Student.admission_status.label("admission_status"),
            Student.registration_date.label("registration_date"),
            Student.source_referral.label("source_referral"),
            Student.is_synthetic.label("is_synthetic"),
            School.school_type.label("school_type"),
            School.name.label("previous_school"),
        )
        .join(AcademicYear, Student.academic_year_id == AcademicYear.id)
        .join(Location, Student.location_id == Location.id)
        .outerjoin(School, Student.school_id == School.id)
    )

    simple = {
        "year": AcademicYear.year,
        "state": Location.state,
        "district": Location.district,
        "city": Location.city,
        "country": Location.country,
        "gender": Student.gender,
        "class_applied": Student.class_applied,
        "admission_status": Student.admission_status,
        "school_type": School.school_type,
    }
    for key, column in simple.items():
        if key in filters:
            query = query.filter(column == filters[key])
    if "score_min" in filters:
        query = query.filter(Student.entrance_score >= float(filters["score_min"]))
    if "score_max" in filters:
        query = query.filter(Student.entrance_score <= float(filters["score_max"]))
    if "percentage_min" in filters:
        query = query.filter(Student.percentage >= float(filters["percentage_min"]))
    if "percentage_max" in filters:
        query = query.filter(Student.percentage <= float(filters["percentage_max"]))

    rows = []
    for row in query.all():
        item = dict(row._mapping)
        for key in ("date_of_birth", "registration_date"):
            if isinstance(item.get(key), date):
                item[key] = item[key].isoformat()
        rows.append(item)
    return rows


def data_mode(db: Session) -> str:
    setting = db.get(Setting, "data_mode")
    return setting.value if setting else "demo"


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def _year_series(rows: list[dict]) -> list[dict]:
    counts = Counter(r["year"] for r in rows)
    years = sorted(counts)
    series = []
    previous = None
    for year in years:
        current = counts[year]
        change = 0 if previous is None else current - previous
        growth = 0.0 if not previous else round(change / previous * 100, 1)
        series.append({
            "year": year, "students": current, "change": change,
            "growth": growth, "cumulative": sum(counts[y] for y in years if y <= year),
        })
        previous = current
    return series


def _ranking(rows: list[dict], key: str, total: int) -> list[dict]:
    counts = Counter(r.get(key) or "Unknown" for r in rows)
    return [
        {"name": name, "students": count, "percentage": _pct(count, total), "rank": index}
        for index, (name, count) in enumerate(
            sorted(counts.items(), key=lambda item: (-item[1], item[0])), start=1
        )
    ]


def _distribution(rows: list[dict], key: str) -> list[dict]:
    return _ranking(rows, key, len(rows))


def overview(db: Session, filters: dict[str, Any] | None = None) -> dict:
    rows = fetch_rows(db, filters)
    total = len(rows)
    series = _year_series(rows)
    years = [s["year"] for s in series]
    counts = [s["students"] for s in series]

    current_year = years[-1] if years else 2026
    previous_year = current_year - 1
    by_year = {s["year"]: s["students"] for s in series}
    current_count = by_year.get(current_year, 0)
    previous_count = by_year.get(previous_year, 0)
    yoy = round((current_count - previous_count) / previous_count * 100, 1) if previous_count else 0.0
    five_year_growth = round((counts[-1] - counts[0]) / counts[0] * 100, 1) if len(counts) > 1 and counts[0] else 0.0

    if len(counts) >= 2:
        avg_change = sum(counts[i] - counts[i - 1] for i in range(1, len(counts))) / (len(counts) - 1)
        trend = "increasing" if avg_change > total * 0.002 else ("decreasing" if avg_change < -total * 0.002 else "stable")
    else:
        trend = "insufficient data"

    fc = forecast(years, counts, horizon=10)
    states = _ranking(rows, "state", total)
    cities = _ranking(rows, "city", total)
    countries = _ranking(rows, "country", total)

    scores = [r["entrance_score"] for r in rows if isinstance(r["entrance_score"], (int, float))]
    percentages = [r["percentage"] for r in rows if isinstance(r["percentage"], (int, float))]
    prev_pcts = [r["previous_academic_percentage"] for r in rows if isinstance(r["previous_academic_percentage"], (int, float))]

    admitted = sum(1 for r in rows if r["admission_status"] == "Admitted")

    return {
        "data_mode": data_mode(db),
        "is_demo": data_mode(db) == "demo" or any(r["is_synthetic"] for r in rows),
        "total_students": total,
        "total_registrations": total,
        "states_count": len({r["state"] for r in rows if r["state"]}),
        "countries_count": len({r["country"] for r in rows if r["country"]}),
        "cities_count": len({r["city"] for r in rows if r["city"]}),
        "districts_count": len({r["district"] for r in rows if r["district"]}),
        "current_year": current_year,
        "previous_year": previous_year,
        "current_year_students": current_count,
        "previous_year_students": previous_count,
        "yoy_growth": yoy,
        "five_year_growth": five_year_growth,
        "trend": trend,
        "yearly": series,
        "top_states": states[:10],
        "top_cities": cities[:10],
        "top_countries": countries[:10],
        "all_states_count": len(states),
        "gender_distribution": _distribution(rows, "gender"),
        "class_distribution": sorted(_distribution(rows, "class_applied"), key=lambda d: d["name"]),
        "status_distribution": _distribution(rows, "admission_status"),
        "school_type_distribution": _distribution(rows, "school_type"),
        "source_distribution": _distribution(rows, "source_referral"),
        "performance": {
            "average_entrance_score": round(sum(scores) / len(scores), 1) if scores else 0,
            "average_percentage": round(sum(percentages) / len(percentages), 1) if percentages else 0,
            "average_previous_percentage": round(sum(prev_pcts) / len(prev_pcts), 1) if prev_pcts else 0,
            "admission_rate": _pct(admitted, total),
            "scores_analyzed": len(scores),
        },
        "forecast": fc,
        "active_filters": filters or {},
    }


def state_analysis(db: Session, filters: dict[str, Any] | None = None) -> dict:
    rows = fetch_rows(db, filters)
    total = len(rows)
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["state"] or "Unknown"].append(row)

    result = []
    for state, items in grouped.items():
        by_year = Counter(r["year"] for r in items)
        years = sorted(by_year)
        first, last = by_year[years[0]], by_year[years[-1]]
        recent = by_year.get(years[-1] - 1) if len(years) > 1 else None
        cities = Counter(r["city"] for r in items)
        scores = [r["entrance_score"] for r in items if isinstance(r["entrance_score"], (int, float))]
        result.append({
            "state": state,
            "students": len(items),
            "percentage": _pct(len(items), total),
            "by_year": {str(y): by_year[y] for y in years},
            "growth": round((last - first) / first * 100, 1) if first else 0.0,
            "yoy_growth": round((last - recent) / recent * 100, 1) if recent else None,
            "trend": classify_growth(first, last),
            "top_city": cities.most_common(1)[0][0] if cities else "—",
            "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
        })
    result.sort(key=lambda item: -item["students"])
    for rank, item in enumerate(result, start=1):
        item["rank"] = rank
    return {"total": total, "states": result}


def country_analysis(db: Session, filters: dict[str, Any] | None = None) -> dict:
    rows = fetch_rows(db, filters)
    total = len(rows)
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["country"] or "Unknown"].append(row)
    result = []
    for country, items in grouped.items():
        by_year = Counter(r["year"] for r in items)
        years = sorted(by_year)
        first, last = by_year[years[0]], by_year[years[-1]]
        result.append({
            "country": country,
            "students": len(items),
            "percentage": _pct(len(items), total),
            "by_year": {str(y): by_year[y] for y in years},
            "growth": round((last - first) / first * 100, 1) if first else 0.0,
            "trend": classify_growth(first, last),
        })
    result.sort(key=lambda item: -item["students"])
    for rank, item in enumerate(result, start=1):
        item["rank"] = rank
    return {"total": total, "countries": result}


def year_analysis(db: Session, filters: dict[str, Any] | None = None) -> dict:
    rows = fetch_rows(db, filters)
    return {"years": _year_series(rows), "total": len(rows)}


def data_quality(db: Session, filters: dict[str, Any] | None = None) -> dict:
    rows = fetch_rows(db, filters)
    total = len(rows)
    checks: dict[str, list[str]] = defaultdict(list)
    bad_rows = set()

    for row in rows:
        rid = row["id"]
        for field in ("full_name", "gender", "state", "city", "country", "class_applied", "admission_status", "year"):
            if not row.get(field):
                checks["Missing required values"].append(rid)
                bad_rows.add(rid)
        if row.get("entrance_score") is not None and not isinstance(row["entrance_score"], (int, float)):
            checks["Incorrect data types"].append(rid); bad_rows.add(rid)
        if isinstance(row.get("entrance_score"), (int, float)) and not (0 <= row["entrance_score"] <= 500):
            checks["Impossible values (score)"].append(rid); bad_rows.add(rid)
        for field in ("percentage", "previous_academic_percentage"):
            value = row.get(field)
            if value is not None and isinstance(value, (int, float)) and not (0 <= value <= 100):
                checks["Invalid percentages"].append(rid); bad_rows.add(rid)
        if row.get("previous_academic_percentage") is None:
            checks["Missing previous academic percentage"].append(rid); bad_rows.add(rid)
        if not row.get("pincode"):
            checks["Missing pincode"].append(rid); bad_rows.add(rid)
        if row.get("date_of_birth") and row["date_of_birth"] > date.today().isoformat():
            checks["Invalid dates"].append(rid); bad_rows.add(rid)
        if row.get("registration_date") and row.get("year"):
            if not str(row["year"]) in str(row["registration_date"]):
                checks["Registration date outside academic year"].append(rid); bad_rows.add(rid)
        if row.get("date_of_birth") and row.get("registration_date"):
            if row["date_of_birth"] > row["registration_date"]:
                checks["Impossible dates (DOB after registration)"].append(rid); bad_rows.add(rid)

    student_ids = [r["student_id"] for r in rows]
    app_ids = [r["application_id"] for r in rows]
    dup_students = [k for k, v in Counter(student_ids).items() if v > 1]
    dup_apps = [k for k, v in Counter(app_ids).items() if v > 1]
    if dup_students:
        checks["Duplicate student IDs"] = dup_students
    if dup_apps:
        checks["Duplicate application IDs"] = dup_apps

    score = round(100 * (1 - len(bad_rows) / total), 1) if total else 0.0
    breakdown = [
        {"check": name, "issues": len(ids), "status": "pass" if not ids else "review"}
        for name, ids in sorted(checks.items())
    ]
    # Include checks that found no issues so the report is complete.
    expected_checks = [
        "Missing required values", "Incorrect data types", "Impossible values (score)",
        "Invalid percentages", "Invalid dates", "Duplicate student IDs",
        "Duplicate application IDs", "Missing pincode",
    ]
    present = {item["check"] for item in breakdown}
    for name in expected_checks:
        if name not in present:
            breakdown.append({"check": name, "issues": 0, "status": "pass"})
    breakdown.sort(key=lambda item: (-item["issues"], item["check"]))

    return {
        "score": score,
        "total_records": total,
        "records_with_issues": len(bad_rows),
        "breakdown": breakdown,
        "status": "excellent" if score >= 95 else ("good" if score >= 85 else "needs review"),
    }


def insights(db: Session, filters: dict[str, Any] | None = None) -> list[dict]:
    """Every sentence below is derived from the selected dataset."""
    rows = fetch_rows(db, filters)
    if not rows:
        return []
    ov = overview(db, filters)
    total = ov["total_students"]
    output: list[dict] = []

    yoy = ov["yoy_growth"]
    if ov["previous_year_students"]:
        direction = "increased" if yoy >= 0 else "decreased"
        output.append({
            "icon": "trend" if yoy >= 0 else "down",
            "tone": "positive" if yoy >= 0 else "warning",
            "text": f"Student registrations {direction} by {abs(yoy):.1f}% in {ov['current_year']} compared with {ov['previous_year']}.",
        })

    state_rows = state_analysis(db, filters)["states"]
    if state_rows:
        leader = state_rows[0]
        output.append({
            "icon": "map", "tone": "info",
            "text": f"{leader['state']} contributes the largest share of registrations: {leader['students']:,} students ({leader['percentage']}%).",
        })
        with_growth = [s for s in state_rows if s["growth"] is not None and s["students"] >= 50]
        if with_growth:
            fastest = max(with_growth, key=lambda s: s["growth"])
            if fastest["growth"] > 0:
                output.append({
                    "icon": "up", "tone": "positive",
                    "text": f"{fastest['state']} showed the fastest long-term growth at {fastest['growth']:+.1f}% across the selected period.",
                })

    fc = ov["forecast"]
    if fc.get("available") and fc.get("next_year_predicted") is not None:
        delta = fc["next_year_predicted"] - ov["current_year_students"]
        direction = "increase" if delta >= 0 else "decrease"
        output.append({
            "icon": "spark", "tone": "info",
            "text": f"Based on the historical trend, registrations are estimated to {direction} to about {fc['next_year_predicted']:,.0f} in {fc['next_year']} (ESTIMATE).",
        })

    perf = ov["performance"]
    if perf["scores_analyzed"]:
        output.append({
            "icon": "award", "tone": "info",
            "text": f"The average entrance score is {perf['average_entrance_score']:.1f} and the average entrance percentage is {perf['average_percentage']:.1f}% across {perf['scores_analyzed']:,} scored records.",
        })

    if ov["countries_count"] > 1:
        output.append({
            "icon": "globe", "tone": "info",
            "text": f"The selected data represents {ov['states_count']} states/regions across {ov['countries_count']} countries and {ov['cities_count']} cities.",
        })

    if perf["admission_rate"]:
        output.append({
            "icon": "check", "tone": "info",
            "text": f"{perf['admission_rate']:.1f}% of records in the current selection carry an 'Admitted' status.",
        })
    return output


def search_students(db: Session, query: str, filters: dict[str, Any] | None = None, limit: int = 50, offset: int = 0) -> dict:
    rows = fetch_rows(db, filters)
    q = (query or "").strip().lower()
    if q:
        rows = [
            r for r in rows
            if any(q in str(r.get(field) or "").lower() for field in (
                "student_id", "application_id", "full_name", "city", "state", "country", "year", "class_applied"
            ))
        ]
    return {
        "total": len(rows),
        "limit": limit,
        "offset": offset,
        "is_demo": data_mode(db) == "demo",
        "results": rows[offset:offset + limit],
    }


def filter_options(db: Session) -> dict[str, list]:
    """Distinct values for populating filter dropdowns."""
    states = [value for (value,) in db.query(Location.state).distinct().order_by(Location.state) if value]
    districts = [value for (value,) in db.query(Location.district).distinct().order_by(Location.district) if value]
    cities = [value for (value,) in db.query(Location.city).distinct().order_by(Location.city) if value]
    countries = [value for (value,) in db.query(Location.country).distinct().order_by(Location.country) if value]
    years = [value for (value,) in db.query(AcademicYear.year).distinct().order_by(AcademicYear.year)]
    genders = [value for (value,) in db.query(Student.gender).distinct().order_by(Student.gender) if value]
    classes = [value for (value,) in db.query(Student.class_applied).distinct().order_by(Student.class_applied) if value]
    statuses = [value for (value,) in db.query(Student.admission_status).distinct().order_by(Student.admission_status) if value]
    school_types = [value for (value,) in db.query(School.school_type).distinct().order_by(School.school_type) if value]
    return {
        "years": years, "states": states, "districts": districts, "cities": cities,
        "countries": countries, "genders": genders, "classes": classes,
        "statuses": statuses, "school_types": school_types,
    }
