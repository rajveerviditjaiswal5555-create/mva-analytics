"""CSV, Excel and PDF report generation for authorized administrators."""
from __future__ import annotations

import csv
import io
from typing import Any

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from . import analytics

BRAND = colors.HexColor("#0B3B5C")
ACCENT = colors.HexColor("#C9A227")


def _report_payload(db: Session, filters: dict[str, Any]) -> dict:
    return {
        "overview": analytics.overview(db, filters),
        "states": analytics.state_analysis(db, filters)["states"],
        "countries": analytics.country_analysis(db, filters)["countries"],
        "quality": analytics.data_quality(db, filters),
        "insights": analytics.insights(db, filters),
    }


def export_csv(db: Session, filters: dict[str, Any]) -> bytes:
    payload = _report_payload(db, filters)
    ov = payload["overview"]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["MACRO VISION ACADEMY — Student Entrance Analytics Report"])
    writer.writerow(["Data mode", ov["data_mode"].upper(), "Generated from", "Database"])
    if ov["is_demo"]:
        writer.writerow(["NOTICE", "DEMO DATA — synthetic records for demonstration only"])
    writer.writerow([])
    writer.writerow(["Metric", "Value"])
    for key, label in [
        ("total_students", "Total students"), ("states_count", "States"),
        ("countries_count", "Countries"), ("cities_count", "Cities"),
        ("current_year_students", "Current year registrations"),
        ("previous_year_students", "Previous year registrations"),
        ("yoy_growth", "YoY growth %"), ("five_year_growth", "5-year growth %"),
    ]:
        writer.writerow([label, ov[key]])
    writer.writerow([])
    writer.writerow(["Year", "Students", "Change", "Growth %"])
    for item in ov["yearly"]:
        writer.writerow([item["year"], item["students"], item["change"], item["growth"]])
    writer.writerow([])
    writer.writerow(["Rank", "State", "Students", "Percentage", "Growth %", "Trend"])
    for item in payload["states"]:
        writer.writerow([item["rank"], item["state"], item["students"], item["percentage"], item["growth"], item["trend"]])
    writer.writerow([])
    writer.writerow(["Rank", "Country", "Students", "Percentage", "Growth %"])
    for item in payload["countries"]:
        writer.writerow([item["rank"], item["country"], item["students"], item["percentage"], item["growth"]])
    writer.writerow([])
    writer.writerow(["Forecast (ESTIMATES)", "Predicted", "Lower", "Upper"])
    for point in ov["forecast"].get("points", []):
        if point["is_forecast"]:
            writer.writerow([point["year"], point["predicted"], point["lower"], point["upper"]])
    writer.writerow([])
    writer.writerow(["Data quality score", payload["quality"]["score"]])
    writer.writerow(["Active filters", str(ov["active_filters"])])
    return output.getvalue().encode("utf-8-sig")


def export_xlsx(db: Session, filters: dict[str, Any]) -> bytes:
    payload = _report_payload(db, filters)
    ov = payload["overview"]
    wb = Workbook()
    ws = wb.active
    ws.title = "Summary"
    ws.append(["MACRO VISION ACADEMY — Analytics Report"])
    ws.append(["Data mode", ov["data_mode"].upper()])
    if ov["is_demo"]:
        ws.append(["NOTICE", "DEMO DATA — synthetic records for demonstration only"])
    ws.append([])
    ws.append(["Metric", "Value"])
    for key, label in [
        ("total_students", "Total students"), ("states_count", "States"),
        ("countries_count", "Countries"), ("cities_count", "Cities"),
        ("current_year_students", "Current year registrations"),
        ("previous_year_students", "Previous year registrations"),
        ("yoy_growth", "YoY growth %"), ("five_year_growth", "5-year growth %"),
    ]:
        ws.append([label, ov[key]])

    ws2 = wb.create_sheet("Five-Year Trend")
    ws2.append(["Year", "Students", "Change", "Growth %"])
    for item in ov["yearly"]:
        ws2.append([item["year"], item["students"], item["change"], item["growth"]])

    ws3 = wb.create_sheet("States")
    ws3.append(["Rank", "State", "Students", "Percentage", "Growth %", "Trend"])
    for item in payload["states"]:
        ws3.append([item["rank"], item["state"], item["students"], item["percentage"], item["growth"], item["trend"]])

    ws4 = wb.create_sheet("Countries")
    ws4.append(["Rank", "Country", "Students", "Percentage", "Growth %"])
    for item in payload["countries"]:
        ws4.append([item["rank"], item["country"], item["students"], item["percentage"], item["growth"]])

    ws5 = wb.create_sheet("Forecast (ESTIMATES)")
    ws5.append(["Year", "Predicted", "Lower bound", "Upper bound"])
    for point in ov["forecast"].get("points", []):
        if point["is_forecast"]:
            ws5.append([point["year"], point["predicted"], point["lower"], point["upper"]])

    ws6 = wb.create_sheet("Data Quality")
    ws6.append(["Check", "Issues", "Status"])
    for item in payload["quality"]["breakdown"]:
        ws6.append([item["check"], item["issues"], item["status"]])

    for sheet in wb.worksheets:
        sheet.column_dimensions["A"].width = 28
        sheet.column_dimensions["B"].width = 22
        sheet.freeze_panes = "A2"
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def export_students_csv(db: Session, filters: dict[str, Any]) -> bytes:
    rows = analytics.fetch_rows(db, filters)
    if not rows:
        return b"".encode()
    columns = [key for key in rows[0].keys() if key not in ("id",)]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8-sig")


def export_pdf(db: Session, filters: dict[str, Any]) -> bytes:
    payload = _report_payload(db, filters)
    ov = payload["overview"]
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Title"], textColor=BRAND, fontSize=20, spaceAfter=4)
    subtitle = ParagraphStyle("subtitle", parent=styles["Normal"], alignment=TA_CENTER, textColor=colors.HexColor("#555"), fontSize=10)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=BRAND, fontSize=13, spaceBefore=12, spaceAfter=5)
    normal = ParagraphStyle("body", parent=styles["Normal"], fontSize=9, leading=12)

    story: list = [
        Paragraph("MACRO VISION ACADEMY", title_style),
        Paragraph("Student Entrance Analytics &amp; Forecasting Report | Burhanpur, Madhya Pradesh", subtitle),
        Spacer(1, 6 * mm),
    ]
    if ov["is_demo"]:
        story.append(Paragraph("<b>DEMO DATA — synthetic records for demonstration only.</b>", normal))
    story.append(Paragraph(f"Data mode: <b>{ov['data_mode'].upper()}</b> | Records analysed: <b>{ov['total_students']:,}</b> | Filters: {ov['active_filters'] or 'None'}", normal))

    summary = [
        ["Total students", f"{ov['total_students']:,}"],
        ["States / Countries / Cities", f"{ov['states_count']} / {ov['countries_count']} / {ov['cities_count']}"],
        ["Current year registrations", f"{ov['current_year_students']:,} ({ov['current_year']})"],
        ["Previous year registrations", f"{ov['previous_year_students']:,} ({ov['previous_year']})"],
        ["Year-over-year growth", f"{ov['yoy_growth']:+.1f}%"],
        ["Five-year growth", f"{ov['five_year_growth']:+.1f}%"],
        ["Next-year forecast (ESTIMATE)", f"{(ov['forecast'].get('next_year_predicted') or 0):,.0f} ({ov['forecast'].get('next_year', '')})"],
        ["Data quality score", f"{payload['quality']['score']}%"],
    ]
    story.append(Paragraph("1. Executive Summary", h2))
    table = Table(summary, colWidths=[90 * mm, 75 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF1F6")),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C6D1")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(table)

    story.append(Paragraph("2. Five-Year Trend", h2))
    trend_data = [["Year", "Students", "Change", "Growth %"]] + [
        [str(i["year"]), str(i["students"]), f"{i['change']:+,}", f"{i['growth']:+.1f}%"] for i in ov["yearly"]
    ]
    story.append(_simple_table(trend_data, [30 * mm, 40 * mm, 40 * mm, 40 * mm]))

    story.append(Paragraph("3. Top 10 States", h2))
    state_data = [["#", "State", "Students", "Share", "Growth"]] + [
        [str(i["rank"]), i["state"], str(i["students"]), f"{i['percentage']}%", f"{i['growth']:+.1f}%"]
        for i in payload["states"][:10]
    ]
    story.append(_simple_table(state_data, [12 * mm, 62 * mm, 30 * mm, 28 * mm, 28 * mm]))

    story.append(Paragraph("4. Country Distribution", h2))
    country_data = [["#", "Country", "Students", "Share"]] + [
        [str(i["rank"]), i["country"], str(i["students"]), f"{i['percentage']}%"]
        for i in payload["countries"][:10]
    ]
    story.append(_simple_table(country_data, [12 * mm, 80 * mm, 35 * mm, 35 * mm]))

    fc = ov["forecast"]
    if fc.get("available"):
        story.append(Paragraph("5. Forecast (ESTIMATES only)", h2))
        story.append(Paragraph(f"Method: {fc['method']}. {fc['explanation']}", normal))
        story.append(Paragraph(
            f"Back-test accuracy — MAE: {fc['validation']['mae']}, RMSE: {fc['validation']['rmse']}, MAPE: {fc['validation']['mape']}%.", normal
        ))
        forecast_data = [["Year", "Predicted", "Lower", "Upper"]] + [
            [str(p["year"]), f"{p['predicted']:,.0f}", f"{p['lower']:,.0f}", f"{p['upper']:,.0f}"]
            for p in fc["points"] if p["is_forecast"]
        ]
        story.append(_simple_table(forecast_data, [35 * mm, 45 * mm, 45 * mm, 45 * mm]))

    story.append(Paragraph("6. Key Insights", h2))
    for item in payload["insights"]:
        story.append(Paragraph(f"• {item['text']}", normal))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(
        "Predictions are statistical estimates, not guaranteed outcomes. "
        "When DEMO DATA is shown, no record represents a real student of Macro Vision Academy.", normal
    ))

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm)
    doc.build(story)
    return output.getvalue()


def _simple_table(data: list[list[str]], widths: list[float]) -> Table:
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C6D1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F6F9")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table
