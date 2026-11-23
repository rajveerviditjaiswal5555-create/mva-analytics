"""CSV, Excel and PDF report generation for authorized administrators."""
from __future__ import annotations

import base64
import csv
import io
import math
from typing import Any

from openpyxl import Workbook
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable, HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)
from sqlalchemy.orm import Session

from . import analytics

BRAND = colors.HexColor("#0B3B5C")
ACCENT = colors.HexColor("#C9A227")

_CHART_W = 480
_CHART_H = 230
_BLUE = colors.HexColor("#1F5C8B")
_GRID = colors.HexColor("#E2E9EE")
_MUTED = colors.HexColor("#555555")
_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


# --------------------------------------------------------------------------- #
# Chart helpers (reportlab primitives -> in-memory PNG -> platypus Image)
# --------------------------------------------------------------------------- #
def _safe_text(value: Any) -> str:
    """Return a compact, ASCII-only label safe for the PDF base fonts."""
    text = "" if value is None else str(value)
    for source, target in (
        ("\u2013", "-"), ("\u2014", "-"), ("\u2018", "'"), ("\u2019", "'"),
        ("\u201c", '"'), ("\u201d", '"'), ("\u00a0", " "), ("\u00b0", " deg"),
    ):
        text = text.replace(source, target)
    text = text.encode("ascii", "replace").decode("ascii")
    return " ".join(text.split())


def _fmt_num(value: float) -> str:
    if abs(value) >= 1000:
        return f"{value / 1000:.1f}k"
    if abs(value - round(value)) < 0.05:
        return f"{round(value):,}"
    return f"{value:,.1f}"


def _nice_max(value: float) -> float:
    """Round a maximum up to a readable axis bound."""
    if value <= 0:
        return 1.0
    base = 10.0 ** math.floor(math.log10(value))
    for factor in (1, 2, 2.5, 5, 10):
        if value <= factor * base * 1.0000001:
            return factor * base
    return 10 * base


def _as_color(color: Any, default: colors.Color) -> colors.Color:
    if isinstance(color, colors.Color):
        return color
    if isinstance(color, str):
        try:
            return colors.HexColor(color)
        except (ValueError, TypeError):
            return default
    return default


def _placeholder_png(message: str) -> io.BytesIO:
    """A framed placeholder for empty data or a failed rasterisation."""
    width, height = _CHART_W, 120
    buffer = io.BytesIO()
    try:
        from PIL import Image as PILImage, ImageDraw

        image = PILImage.new("RGB", (width, height), (251, 253, 254))
        draw = ImageDraw.Draw(image)
        draw.rectangle([0, 0, width - 1, height - 1], outline=(183, 198, 209))
        label = _safe_text(message) or "No data"
        try:
            draw.text((width // 2, height // 2), label, fill=(85, 85, 85), anchor="mm")
        except TypeError:  # older Pillow without anchor support
            draw.text((width // 2, height // 2), label, fill=(85, 85, 85))
        image.save(buffer, format="PNG")
    except Exception:
        buffer = io.BytesIO(_TINY_PNG)
    buffer.seek(0)
    return buffer


class VectorChart(Flowable):
    """Draw a reportlab Drawing as vector graphics directly into the PDF.

    Avoids rasterisation dependencies (Cairo/Pillow) so the Docker build stays
    dependency-light, and produces crisp charts at any zoom level.
    """

    def __init__(self, drawing: Drawing, width: float, height: float):
        Flowable.__init__(self)
        self.drawing = drawing
        self.width = width
        self.height = height

    def draw(self):
        self.canv.saveState()
        self.canv.scale(self.width / self.drawing.width, self.height / self.drawing.height)
        renderPDF.draw(self.drawing, self.canv, 0, 0)
        self.canv.restoreState()

    def wrap(self, availWidth, availHeight):
        return self.width, self.height


def _drawing_png(drawing: Drawing) -> VectorChart:
    """Return a vector flowable for a chart drawing (name kept for compatibility)."""
    return VectorChart(drawing, _CHART_W, _CHART_H)


def _placeholder_chart(message: str) -> VectorChart:
    drawing = Drawing(_CHART_W, _CHART_H)
    drawing.add(Rect(0, 0, _CHART_W, _CHART_H, fillColor=colors.HexColor("#F2F6F9"),
                     strokeColor=colors.HexColor("#D7E1E8"), strokeWidth=0.6))
    drawing.add(String(_CHART_W / 2, _CHART_H / 2, _safe_text(message), fontName="Helvetica",
                       fontSize=10, fillColor=colors.HexColor("#64748B"), textAnchor="middle"))
    return _drawing_png(drawing)


def _axis_frame(drawing: Drawing, vmax: float, left: float, plot_w: float,
                plot_h: float, bottom: float,
                x_labels: list[tuple[float, str]]) -> None:
    """Shared gridlines, value axis and category labels for both chart types."""
    for index in range(5):
        y = bottom + plot_h * index / 4
        drawing.add(Line(left, y, left + plot_w, y,
                         strokeColor=_GRID, strokeWidth=0.5))
        drawing.add(String(left - 6, y - 2, _fmt_num(vmax * index / 4),
                           fontName="Helvetica", fontSize=6.5,
                           fillColor=_MUTED, textAnchor="end"))
    drawing.add(Line(left, bottom, left, bottom + plot_h,
                     strokeColor=BRAND, strokeWidth=0.9))
    drawing.add(Line(left, bottom, left + plot_w, bottom,
                     strokeColor=BRAND, strokeWidth=0.9))
    for x, label in x_labels:
        drawing.add(String(x, bottom - 13, label, fontName="Helvetica",
                           fontSize=6.2, fillColor=_MUTED, textAnchor="middle"))


def _chart_background(drawing: Drawing, title: str) -> None:
    drawing.add(Rect(0, 0, _CHART_W, _CHART_H,
                     fillColor=colors.HexColor("#FBFDFE"),
                     strokeColor=colors.HexColor("#D7E1E8"), strokeWidth=0.6))
    drawing.add(String(_CHART_W / 2, _CHART_H - 17, _safe_text(title),
                       fontName="Helvetica-Bold", fontSize=11,
                       fillColor=BRAND, textAnchor="middle"))


def _bar_chart_png(labels: list, values: list, title: str, color: Any) -> VectorChart:
    """Vertical bar chart with axis labels and value labels above each bar."""
    labels = [_safe_text(item) for item in (labels or [])]
    raw_values = list(values or [])
    count = min(len(labels), len(raw_values))
    if count <= 0:
        return _placeholder_chart("No data available")

    bars: list[tuple[str, float]] = []
    for index in range(count):
        try:
            amount = float(raw_values[index])
        except (TypeError, ValueError):
            amount = 0.0
        bars.append((labels[index] or "Unknown", max(0.0, amount)))

    drawing = Drawing(_CHART_W, _CHART_H)
    _chart_background(drawing, title)
    left, right, top, bottom = 52, 16, 38, 44
    plot_w = _CHART_W - left - right
    plot_h = _CHART_H - top - bottom
    vmax = _nice_max(max(value for _, value in bars))

    slot = plot_w / count
    x_labels = []
    for index, (label, _) in enumerate(bars):
        short = label if len(label) <= 11 else label[:10] + "."
        x_labels.append((left + slot * (index + 0.5), short))
    _axis_frame(drawing, vmax, left, plot_w, plot_h, bottom, x_labels)

    bar_color = _as_color(color, ACCENT)
    bar_width = min(slot * 0.66, 36)
    for index, (_, value) in enumerate(bars):
        cx = left + slot * (index + 0.5)
        height = plot_h * value / vmax if vmax else 0.0
        drawing.add(Rect(cx - bar_width / 2, bottom, bar_width, height,
                         fillColor=bar_color, strokeColor=colors.white,
                         strokeWidth=0.4))
        drawing.add(String(cx, bottom + height + 4, _fmt_num(value),
                           fontName="Helvetica", fontSize=6.4,
                           fillColor=BRAND, textAnchor="middle"))
    return _drawing_png(drawing)


def _line_chart_png(years: list, actuals: list, predictions: list,
                    title: str) -> VectorChart:
    """Line chart: solid blue actuals, dashed gold forecast estimates."""
    years = list(years or [])
    actuals = list(actuals or [])
    predictions = list(predictions or [])
    actual_series = [(y, a) for y, a in zip(years, actuals) if a is not None]
    forecast_series = [(y, p) for y, p in zip(years, predictions) if p is not None]
    if actual_series and forecast_series and forecast_series[0][0] > actual_series[-1][0]:
        forecast_series = [actual_series[-1]] + forecast_series
    if not actual_series and not forecast_series:
        return _placeholder_chart("No trend data available")

    all_years = sorted({y for y, _ in actual_series + forecast_series})
    vmax = _nice_max(max(v for _, v in actual_series + forecast_series))
    drawing = Drawing(_CHART_W, _CHART_H)
    _chart_background(drawing, title)
    left, right, top, bottom = 52, 16, 48, 46
    plot_w = _CHART_W - left - right
    plot_h = _CHART_H - top - bottom
    count = len(all_years)
    positions = {
        year: left + (plot_w * index / (count - 1) if count > 1 else plot_w / 2)
        for index, year in enumerate(all_years)
    }
    step = 1 if count <= 10 else 2
    x_labels = [
        (positions[year], str(year))
        for index, year in enumerate(all_years)
        if index % step == 0 or index == count - 1
    ]
    _axis_frame(drawing, vmax, left, plot_w, plot_h, bottom, x_labels)

    def y_pos(value: float) -> float:
        return bottom + plot_h * value / vmax

    for index in range(1, len(actual_series)):
        x1, y1 = actual_series[index - 1]
        x2, y2 = actual_series[index]
        drawing.add(Line(positions[x1], y_pos(y1), positions[x2], y_pos(y2),
                         strokeColor=_BLUE, strokeWidth=1.8))
    for year, value in actual_series:
        drawing.add(Rect(positions[year] - 1.8, y_pos(value) - 1.8, 3.6, 3.6,
                         fillColor=_BLUE, strokeColor=None))

    # Dashed forecast line, drawn as short segments (no backend quirks).
    dash, gap = 5.0, 4.0
    for index in range(1, len(forecast_series)):
        x1, y1 = forecast_series[index - 1]
        x2, y2 = forecast_series[index]
        sx, sy = positions[x1], y_pos(y1)
        ex, ey = positions[x2], y_pos(y2)
        length = math.hypot(ex - sx, ey - sy)
        if length <= 0:
            continue
        offset = 0.0
        while offset < length:
            segment = min(dash, length - offset)
            t0, t1 = offset / length, (offset + segment) / length
            drawing.add(Line(sx + (ex - sx) * t0, sy + (ey - sy) * t0,
                             sx + (ex - sx) * t1, sy + (ey - sy) * t1,
                             strokeColor=ACCENT, strokeWidth=1.8))
            offset += dash + gap

    # Legend.
    lx, ly = left + 6, bottom + plot_h - 12
    drawing.add(Line(lx, ly, lx + 18, ly, strokeColor=_BLUE, strokeWidth=1.8))
    drawing.add(String(lx + 22, ly - 2, "Actual", fontName="Helvetica",
                       fontSize=7, fillColor=_MUTED))
    drawing.add(Line(lx + 85, ly, lx + 94, ly,
                     strokeColor=ACCENT, strokeWidth=1.8))
    drawing.add(Line(lx + 98, ly, lx + 107, ly,
                     strokeColor=ACCENT, strokeWidth=1.8))
    drawing.add(String(lx + 111, ly - 2, "Forecast (ESTIMATE)",
                       fontName="Helvetica", fontSize=7, fillColor=_MUTED))
    return _drawing_png(drawing)


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
    brand_title = ParagraphStyle("brand_title", parent=styles["Title"],
                                 textColor=BRAND, fontSize=17, leading=20, spaceAfter=2)
    brand_sub = ParagraphStyle("brand_sub", parent=styles["Normal"],
                               textColor=colors.HexColor("#444444"), fontSize=9.5, leading=12)
    brand_loc = ParagraphStyle("brand_loc", parent=styles["Normal"],
                               textColor=ACCENT, fontSize=8, leading=10)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=BRAND, fontSize=13, spaceBefore=12, spaceAfter=5)
    normal = ParagraphStyle("body", parent=styles["Normal"], fontSize=9, leading=12)
    caption = ParagraphStyle("caption", parent=styles["Normal"], fontSize=7.5,
                             leading=9.5, textColor=colors.HexColor("#666666"),
                             spaceBefore=2, spaceAfter=6)

    monogram = Table([["M"]], colWidths=[13 * mm], rowHeights=[13 * mm])
    monogram.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND),
        ("BOX", (0, 0), (-1, -1), 1.1, ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 17),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    brand_copy = [
        Paragraph("MACRO VISION ACADEMY", brand_title),
        Paragraph("Student Entrance Analytics &amp; Forecasting Report", brand_sub),
        Paragraph("Burhanpur, Madhya Pradesh, India", brand_loc),
    ]
    header = Table([[monogram, brand_copy]], colWidths=[17 * mm, 155 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story: list = [
        header,
        HRFlowable(width="100%", thickness=1.1, color=ACCENT,
                   spaceBefore=5, spaceAfter=8),
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

    predicted_by_year = {
        int(point["year"]): point["predicted"]
        for point in ov["forecast"].get("points", [])
        if point.get("is_forecast") and point.get("predicted") is not None
    }
    actual_by_year = {item["year"]: item["students"] for item in ov["yearly"]}
    trend_years = sorted(set(actual_by_year) | set(predicted_by_year))
    trend_actuals = [actual_by_year.get(year) for year in trend_years]
    trend_predictions = [predicted_by_year.get(year) for year in trend_years]
    story.append(_line_chart_png(trend_years, trend_actuals, trend_predictions,
                                 "Entrance Registrations: Actual vs Forecast"))
    story.append(Paragraph(
        "Solid blue = actual registrations; dashed gold = statistical forecast (ESTIMATE).", caption
    ))

    story.append(Paragraph("3. Top 10 States", h2))
    state_data = [["#", "State", "Students", "Share", "Growth"]] + [
        [str(i["rank"]), i["state"], str(i["students"]), f"{i['percentage']}%", f"{i['growth']:+.1f}%"]
        for i in payload["states"][:10]
    ]
    story.append(_simple_table(state_data, [12 * mm, 62 * mm, 30 * mm, 28 * mm, 28 * mm]))
    story.append(_bar_chart_png(
        [item["state"] for item in payload["states"][:10]],
        [item["students"] for item in payload["states"][:10]],
        "Top 10 States by Registrations", BRAND,
    ))
    story.append(Paragraph(
        "Bars show the number of registrations from each leading state.", caption
    ))

    story.append(Paragraph("4. Country Distribution", h2))
    country_data = [["#", "Country", "Students", "Share"]] + [
        [str(i["rank"]), i["country"], str(i["students"]), f"{i['percentage']}%"]
        for i in payload["countries"][:10]
    ]
    story.append(_simple_table(country_data, [12 * mm, 80 * mm, 35 * mm, 35 * mm]))
    story.append(_bar_chart_png(
        [item["country"] for item in payload["countries"][:10]],
        [item["students"] for item in payload["countries"][:10]],
        "Country Distribution", ACCENT,
    ))
    story.append(Paragraph(
        "Bars show registrations by country; one country may account for the whole selection.", caption
    ))

    fc = ov["forecast"]
    if fc.get("available"):
        story.append(Paragraph("5. Forecast (ESTIMATES only)", h2))
        story.append(Paragraph(f"Method: {fc['method']}. {fc['explanation']}", normal))
        story.append(Paragraph(
            f"Back-test accuracy — MAE: {fc['validation']['mae']}, RMSE: {fc['validation']['rmse']}, MAPE: {fc['validation']['mape']}%.", normal
        ))
        story.append(_line_chart_png(trend_years, trend_actuals, trend_predictions,
                                     "Historical Trend and Forecast (ESTIMATE)"))
        story.append(Paragraph(
            "The dashed gold segments are estimates, not guaranteed outcomes.", caption
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
