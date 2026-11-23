"""Forecasting, validation and scenario simulation (pure Python, no heavy deps)."""
from __future__ import annotations

import math
from typing import Iterable

Point = dict[str, float | int | str | None]

METHOD_LABELS = {
    "linear": "Linear regression (OLS)",
    "exponential": "Exponential trend (log-linear)",
    "moving_average": "Moving average (3-year)",
    "holt": "Holt's linear exponential smoothing",
}


def _ols(xs: list[float], ys: list[float]) -> tuple[float, float]:
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return 0.0, my
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx
    return slope, my - slope * mx


def _predict(model: str, slope: float, intercept: float, x: float) -> float:
    """Predict at ``x = target_year - first_year`` of the fitted window.

    ``holt`` and ``moving_average`` re-base their parameters to the first year
    of the fitting window, so the same affine form works for every candidate.
    """
    if model == "exponential":
        value = math.exp(max(-10, min(50, intercept + slope * x)))
    elif model == "moving_average":
        value = intercept
    else:  # linear and holt
        value = intercept + slope * x
    return max(0.0, value)


_ALPHAS = (0.2, 0.4, 0.6, 0.8)
_BETAS = (0.1, 0.3, 0.5)


def _holt_smooth(
    values: list[float], alpha: float, beta: float
) -> tuple[float, float, float, list[float]]:
    """One Holt pass; returns (level, trend, sse, one-step-ahead fits)."""
    level = values[0]
    trend = values[1] - values[0] if len(values) > 1 else 0.0
    sse = 0.0
    fitted = [level]
    for t in range(1, len(values)):
        forecast = level + trend
        sse += (values[t] - forecast) ** 2
        fitted.append(forecast)
        previous_level = level
        level = alpha * values[t] + (1 - alpha) * forecast
        trend = beta * (level - previous_level) + (1 - beta) * trend
    return level, trend, sse, fitted


def _holt_fit(values: list[float]) -> tuple[float, float, list[float]]:
    """Grid-search Holt's smoothing parameters.

    Returns ``(trend, level_at_first_year, fitted)`` so callers can reuse the
    standard ``intercept + slope * x`` prediction form.
    """
    best: tuple[float, float, float, list[float]] | None = None
    for alpha in _ALPHAS:
        for beta in _BETAS:
            result = _holt_smooth(values, alpha, beta)
            if best is None or result[2] < best[2]:
                best = result
    assert best is not None
    level, trend, _, fitted = best
    # level is the level at the final training year; re-base it to year 0 so
    # intercept + trend * x == level + h * trend for x = target - first_year.
    return trend, level - trend * (len(values) - 1), fitted


def _fit(years: list[int], values: list[float], model: str) -> tuple[float, float, list[float]]:
    xs = [float(y - years[0]) for y in years]
    if model == "moving_average":
        window = values[-3:]
        average = sum(window) / len(window)
        return 0.0, average, [average] * len(values)
    if model == "holt":
        return _holt_fit(values)
    target = [math.log(max(1.0, v)) for v in values] if model == "exponential" else list(values)
    slope, intercept = _ols(xs, target)
    fitted = [_predict(model, slope, intercept, x) for x in xs]
    return slope, intercept, fitted


def _errors(actual: Iterable[float], predicted: Iterable[float]) -> dict[str, float | None]:
    pairs = [(a, p) for a, p in zip(actual, predicted)]
    if not pairs:
        return {"mae": None, "rmse": None, "mape": None}
    abs_err = [abs(a - p) for a, p in pairs]
    sq_err = [(a - p) ** 2 for a, p in pairs]
    pct = [abs(a - p) / a * 100 for a, p in pairs if a > 0]
    return {
        "mae": round(sum(abs_err) / len(abs_err), 2),
        "rmse": round(math.sqrt(sum(sq_err) / len(sq_err)), 2),
        "mape": round(sum(pct) / len(pct), 2) if pct else None,
    }


def _rolling_validation(years: list[int], values: list[float], model: str) -> dict:
    """Train on the first k points, predict k+1, for every possible k."""
    actuals: list[float] = []
    predicted: list[float] = []
    details: list[dict] = []
    for k in range(2, len(values)):
        sub_years, sub_values = years[:k], values[:k]
        slope, intercept, _ = _fit(sub_years, sub_values, model)
        pred = _predict(model, slope, intercept, float(years[k] - sub_years[0]))
        actuals.append(values[k])
        predicted.append(pred)
        details.append({
            "year": years[k],
            "actual": round(values[k], 1),
            "forecast": round(pred, 1),
            "error": round(pred - values[k], 1),
            "error_pct": round((pred - values[k]) / values[k] * 100, 1) if values[k] else None,
        })
    return {**_errors(actuals, predicted), "details": details}


def forecast(years: list[int], counts: list[int], horizon: int = 10) -> dict:
    """Return a validated forecast for the given historical annual counts.

    Method is chosen automatically by comparing rolling-origin accuracy of a
    linear trend, an exponential trend, a 3-year moving average and Holt's
    linear exponential smoothing. All outputs are ESTIMATES.
    """
    years = list(years)
    counts = [max(0.0, float(c)) for c in counts]
    if len(years) < 2:
        return {"available": False, "reason": "At least two years of data are required for forecasting.", "points": []}

    # Choose method using rolling-origin validation on history only.
    candidates = []
    for model in ("linear", "exponential", "moving_average", "holt"):
        try:
            validation = _rolling_validation(years, counts, model)
            score = validation["mae"] if validation["mae"] is not None else float("inf")
            candidates.append((score, model, validation))
        except (ValueError, OverflowError):
            continue
    if not candidates:
        return {"available": False, "reason": "Forecast could not be fitted to this data.", "points": []}
    candidates.sort(key=lambda item: item[0])
    best_score, method, validation = candidates[0]

    model_comparison = [
        {"method": METHOD_LABELS[m], "mae": v["mae"], "rmse": v["rmse"]}
        for _, m, v in candidates
    ]

    slope, intercept, fitted = _fit(years, counts, method)
    residuals = [c - f for c, f in zip(counts, fitted)]
    n = len(years)
    resid_std = math.sqrt(sum(r * r for r in residuals) / max(1, n - 2))
    mean_x = sum((y - years[0]) for y in years) / n
    sxx = sum(((y - years[0]) - mean_x) ** 2 for y in years) or 1.0

    points: list[Point] = []
    for y, c in zip(years, counts):
        points.append({"year": y, "actual": round(c, 1), "predicted": None, "lower": None, "upper": None, "is_forecast": False})
    for step in range(1, horizon + 1):
        target_year = years[-1] + step
        x = float(target_year - years[0])
        pred = _predict(method, slope, intercept, x)
        leverage = 1 + 1 / n + ((x - mean_x) ** 2) / sxx
        margin = 1.96 * resid_std * math.sqrt(leverage)
        points.append({
            "year": target_year,
            "actual": None,
            "predicted": round(pred, 1),
            "lower": round(max(0, pred - margin), 1),
            "upper": round(pred + margin, 1),
            "is_forecast": True,
        })

    first, last = counts[0], counts[-1]
    cagr = ((last / first) ** (1 / max(1, len(counts) - 1)) - 1) * 100 if first > 0 else 0.0
    next_year_predicted = next((p["predicted"] for p in points if p["is_forecast"]), None)

    direction = (
        "downward"
        if (slope < 0 or (abs(slope) < 1e-9 and counts[-1] < counts[0]))
        else "upward"
    )
    if method == "linear":
        explanation = (
            f"A straight-line trend was fitted to the {n} historical years. "
            f"Registrations change by about {abs(slope):.0f} students per year "
            f"({direction} direction)."
        )
    elif method == "exponential":
        explanation = (
            f"A compound-growth trend was fitted to the {n} historical years, "
            f"implying an average yearly change of about {abs((math.exp(slope) - 1) * 100):.1f}% "
            f"({direction} direction)."
        )
    elif method == "moving_average":
        explanation = (
            f"The forecast holds at the 3-year moving average of the most recent "
            f"observations (about {intercept:,.0f} students), smoothing out short-term "
            f"noise while the historical direction is {direction}."
        )
    else:  # holt
        explanation = (
            f"Holt's linear exponential smoothing tracked both the level and the trend "
            f"across the {n} historical years; the trend is {direction} by about "
            f"{abs(slope):.0f} students per year."
        )

    return {
        "available": True,
        "method": METHOD_LABELS[method],
        "method_key": method,
        "model_comparison": model_comparison,
        "slope": round(slope, 3),
        "historical_cagr_pct": round(cagr, 2),
        "growth_rate_pct": round(cagr, 2),
        "points": points,
        "next_year": years[-1] + 1,
        "next_year_predicted": round(next_year_predicted, 1) if next_year_predicted is not None else None,
        "forecast_3y": next((p["predicted"] for p in points if p["year"] == years[-1] + 3), None),
        "forecast_5y": next((p["predicted"] for p in points if p["year"] == years[-1] + 5), None),
        "forecast_10y": next((p["predicted"] for p in points if p["year"] == years[-1] + 10), None),
        "validation": {
            "mae": validation["mae"],
            "rmse": validation["rmse"],
            "mape": validation["mape"],
            "details": validation["details"],
            "note": "Rolling-origin back-test: each forecast was made using only years before the target year.",
        },
        "explanation": explanation,
        "disclaimer": "ESTIMATE ONLY — predictions are statistical projections, not guaranteed registration numbers.",
    }


def what_if(current: float, growth_pct: float, horizon: int = 5) -> dict:
    """Compound a user-supplied growth rate onto the current student count."""
    rate = growth_pct / 100.0
    points = [{"year_offset": 0, "students": round(current, 1), "is_forecast": False}]
    for step in range(1, horizon + 1):
        points.append({"year_offset": step, "students": round(current * ((1 + rate) ** step), 1), "is_forecast": True})
    return {"growth_pct": growth_pct, "current": round(current, 1), "points": points}


def scenario_series(current: float, horizon: int = 5) -> dict:
    scenarios = {
        "Declining (-10%)": -10.0,
        "Conservative (+5%)": 5.0,
        "Normal (+10%)": 10.0,
        "Optimistic (+20%)": 20.0,
    }
    return {name: what_if(current, rate, horizon)["points"] for name, rate in scenarios.items()}


def classify_growth(first: float, last: float, threshold_pct: float = 5.0) -> str:
    if first <= 0:
        return "insufficient data"
    change = (last - first) / first * 100
    if change > threshold_pct:
        return "growing"
    if change < -threshold_pct:
        return "declining"
    return "stable"
