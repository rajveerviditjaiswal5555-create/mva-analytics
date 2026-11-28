"""AI assistant: builds grounded context from aggregate analytics and calls an
OpenAI-compatible chat API server-side. The API key never reaches the browser.
"""
from __future__ import annotations

from groq import Groq
from sqlalchemy.orm import Session

from ..config import AI_API_KEY, AI_BASE_URL, AI_MODEL
from . import analytics

SYSTEM_PROMPT = """You are the Macro Vision Academy Analytics Assistant, helping school staff understand
student entrance analytics for Macro Vision Academy, Burhanpur.

Rules:
- Answer ONLY from the DATA CONTEXT provided. Never invent numbers, states, percentages or trends.
- If the answer is not in the context, say: "That is not available in the current dataset."
- Treat all forecasts as ESTIMATES, never guarantees.
- Never reveal or claim access to individual student records or personal information. If asked about a
  specific student's name or personal details, explain that only aggregated statistics are available here
  and authorised staff can use the Student Search page.
- Be concise and friendly. Use bullet points when helpful. Use Indian number formatting where natural.
- When demo data is in use, mention briefly that figures are synthetic demonstration records.
"""

SUGGESTED = [
    "How many students are in the current selection?",
    "Which state contributes the most students?",
    "What is the forecast for next year?",
    "Which regions are growing fastest?",
    "How accurate is the forecast?",
]


def build_context(db: Session, filters: dict) -> str:
    """Aggregate-only context. No student-level rows are ever included."""
    try:
        ov = analytics.overview(db, filters)
        states = analytics.state_analysis(db, filters)["states"]
        countries = analytics.country_analysis(db, filters)["countries"]
        quality = analytics.data_quality(db, filters)
        insights = analytics.insights(db, filters)
    except Exception:
        return "Analytics context is temporarily unavailable."

    fc = ov.get("forecast", {})
    lines = [
        "DATA CONTEXT (aggregated only):",
        f"- Data mode: {ov.get('data_mode')} (DEMO means synthetic records).",
        f"- Total students: {ov.get('total_students'):,}",
        f"- States/regions: {ov.get('states_count')}, countries: {ov.get('countries_count')}, cities: {ov.get('cities_count')}",
        f"- Current year {ov.get('current_year')}: {ov.get('current_year_students'):,} registrations; previous year {ov.get('previous_year')}: {ov.get('previous_year_students'):,}",
        f"- Year-over-year growth: {ov.get('yoy_growth')}% ; five-year growth: {ov.get('five_year_growth')}% ; trend: {ov.get('trend')}",
        "- Yearly registrations: " + ", ".join(f"{y['year']}={y['students']:,} ({y['growth']:+}%)" for y in ov.get("yearly", [])),
        "- Top states: " + ", ".join(
            f"{s['name']} {s['students']:,} ({s['percentage']}%, growth {s.get('growth', 0):+}%)"
            for s in ov.get("top_states", [])[:10]
        ),
        "- Top countries: " + ", ".join(f"{c['name']} {c['students']:,} ({c['percentage']}%)" for c in ov.get("top_countries", [])[:8]),
        "- Top cities: " + ", ".join(f"{c['name']} {c['students']:,}" for c in ov.get("top_cities", [])[:10]),
        f"- Average entrance score: {ov.get('performance', {}).get('average_entrance_score')} ; admission rate: {ov.get('performance', {}).get('admission_rate')}%",
        f"- Data quality score: {quality.get('score')}%",
    ]
    if fc.get("available"):
        lines += [
            f"- Forecast method: {fc.get('method')} (selected by back-test MAE).",
            f"- Predicted {fc.get('next_year')}: {fc.get('next_year_predicted'):,.0f} (ESTIMATE)",
            f"- Predicted 3y: {fc.get('forecast_3y'):,.0f}, 5y: {fc.get('forecast_5y'):,.0f}, 10y: {fc.get('forecast_10y'):,.0f} (ESTIMATES)",
            f"- Back-test MAE {fc.get('validation', {}).get('mae')}, RMSE {fc.get('validation', {}).get('rmse')}, MAPE {fc.get('validation', {}).get('mape')}%",
        ]
        lines.append("- Model comparison: " + ", ".join(
            f"{m['method']} MAE {m['mae']}" for m in fc.get("model_comparison", [])[:4]
        ))
    if states:
        fastest = sorted([s for s in states if s["students"] >= 50], key=lambda s: -s["growth"])[:5]
        lines.append("- Fastest growing states: " + ", ".join(f"{s['state']} ({s['growth']:+}%)" for s in fastest))
    if insights:
        lines.append("- Insights: " + " ".join(i["text"] for i in insights[:6]))
    if filters:
        lines.append("- Active filters: " + ", ".join(f"{k}={v}" for k, v in filters.items()))
    return "\n".join(lines)


def ask(message: str, filters: dict, db: Session, history: list[dict] | None = None) -> dict:
    context = build_context(db, filters)
    if not AI_API_KEY:
        return {
            "answer": "The AI assistant is not configured yet. Set the AI_API_KEY environment variable on the server to enable it.",
            "suggested": SUGGESTED,
            "available": False,
        }

    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context}]
    for item in (history or [])[-6:]:
        if item.get("role") in ("user", "assistant") and isinstance(item.get("content"), str):
            messages.append({"role": item["role"], "content": item["content"][:1000]})
    messages.append({"role": "user", "content": message[:2000]})

    try:
        client = Groq(api_key=AI_API_KEY, base_url=AI_BASE_URL)
        kwargs = {"model": AI_MODEL, "messages": messages, "temperature": 0.2}
        try:
            completion = client.chat.completions.create(max_completion_tokens=600, **kwargs)
        except TypeError:
            completion = client.chat.completions.create(max_tokens=600, **kwargs)
        answer = (completion.choices[0].message.content or "").strip()
        return {"answer": answer, "suggested": SUGGESTED, "available": True}
    except Exception as exc:
        return {"answer": f"Unable to reach the AI service right now. {exc}", "suggested": SUGGESTED, "available": False}
