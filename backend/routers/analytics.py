"""Public aggregate analytics endpoints (no individual student records)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import analytics
from ..services.forecasting import forecast, scenario_series, what_if

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _filters(request: Request) -> dict:
    return analytics.parse_filters(request.query_params)


def _latest_years(db: Session, filters: dict) -> tuple[int | None, int | None]:
    """Two most recent years available in the (non-year-filtered) data."""
    rows = analytics.fetch_rows(db, {k: v for k, v in filters.items() if k != "year"})
    years = sorted({r["year"] for r in rows if r.get("year") is not None})
    if len(years) >= 2:
        return years[-2], years[-1]
    return (years[0], years[0]) if years else (None, None)


@router.get("/overview")
def overview(request: Request, db: Session = Depends(get_db)):
    return analytics.overview(db, _filters(request))


@router.get("/insights")
def insights(request: Request, db: Session = Depends(get_db)):
    return {"insights": analytics.insights(db, _filters(request))}


@router.get("/data-quality")
def data_quality(request: Request, db: Session = Depends(get_db)):
    return analytics.data_quality(db, _filters(request))


@router.get("/states")
def states(request: Request, db: Session = Depends(get_db)):
    return analytics.state_analysis(db, _filters(request))


@router.get("/countries")
def countries(request: Request, db: Session = Depends(get_db)):
    return analytics.country_analysis(db, _filters(request))


@router.get("/years")
def years(request: Request, db: Session = Depends(get_db)):
    return analytics.year_analysis(db, _filters(request))


@router.get("/cities")
def cities(request: Request, db: Session = Depends(get_db)):
    rows = analytics.fetch_rows(db, _filters(request))
    return {"cities": analytics._ranking(rows, "city", len(rows)), "total": len(rows)}


@router.get("/filter-options")
def filter_options(db: Session = Depends(get_db)):
    return analytics.filter_options(db)


@router.get("/forecast")
def forecast_endpoint(
    request: Request,
    horizon: int = Query(default=10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    ov = analytics.overview(db, _filters(request))
    return ov["forecast"] if horizon == 10 else {
        **forecast([s["year"] for s in ov["yearly"]], [s["students"] for s in ov["yearly"]], horizon)
    }


@router.get("/what-if")
def what_if_endpoint(
    request: Request,
    growth: float = Query(default=10.0, ge=-95, le=200),
    horizon: int = Query(default=5, ge=1, le=15),
    db: Session = Depends(get_db),
):
    ov = analytics.overview(db, _filters(request))
    current = ov["current_year_students"]
    return {
        "current": current,
        "current_year": ov["current_year"],
        "what_if": what_if(current, growth, horizon),
        "scenarios": scenario_series(current, horizon),
        "data_mode": ov["data_mode"],
    }


@router.get("/state-forecast")
def state_forecast(
    request: Request,
    state: str = Query(default="", description="State name; leave blank for the leading state"),
    horizon: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    analysis = analytics.state_analysis(db, _filters(request))
    all_states = analysis["states"]
    selected = next((s for s in all_states if s["state"].lower() == state.lower()), None)
    if selected is None:
        selected = all_states[0] if all_states else None
    if selected is None:
        return {"available": False, "message": "No states in the selected data.", "states": []}

    by_year = selected["by_year"]
    years = sorted(int(y) for y in by_year)
    counts = [by_year[str(y)] for y in years]
    fc = forecast(years, counts, horizon)

    ranked = []
    for item in all_states:
        if item["students"] < 50:
            continue
        ranked.append({
            "state": item["state"],
            "students": item["students"],
            "growth": item["growth"],
            "trend": item["trend"],
        })
    fastest = sorted(ranked, key=lambda s: -s["growth"])[:5]
    declining = sorted(ranked, key=lambda s: s["growth"])[:5]
    stable = [s for s in ranked if s["trend"] == "stable"][:5]

    return {
        "available": True,
        "selected": selected,
        "forecast": fc,
        "fastest_growing": fastest,
        "declining": declining,
        "stable": stable,
        "states": [{"state": s["state"], "students": s["students"]} for s in all_states],
        "data_mode": analytics.data_mode(db),
    }


@router.get("/performance")
def performance(request: Request, db: Session = Depends(get_db)):
    return analytics.performance_analysis(db, _filters(request))


@router.get("/compare")
def compare(
    request: Request,
    year1: str | None = None,
    year2: str | None = None,
    db: Session = Depends(get_db),
):
    def parse_year(value: str | None, name: str) -> int | None:
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"{name} must be an integer year")

    parsed1 = parse_year(year1, "year1")
    parsed2 = parse_year(year2, "year2")
    if parsed1 is None or parsed2 is None:
        latest1, latest2 = _latest_years(db, _filters(request))
        if parsed1 is None:
            parsed1 = latest1
        if parsed2 is None:
            parsed2 = latest2
    return analytics.year_compare(db, _filters(request), year1=parsed1, year2=parsed2)
