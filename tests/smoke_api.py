"""End-to-end smoke test of the MVA Analytics API using only the standard library.

Run with:  python tests/smoke_api.py
Requires the backend to be running on http://127.0.0.1:8000
"""
from __future__ import annotations

import csv
import io
import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8000"
TOKEN = ""


def call(path: str, method: str = "GET", data: bytes | None = None, headers: dict | None = None, raw: bool = False):
    all_headers = dict(headers or {})
    if TOKEN:
        all_headers["Authorization"] = f"Bearer {TOKEN}"
    if data is not None and "Content-Type" not in all_headers:
        all_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=all_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
            return content if raw else json.loads(content)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        raise AssertionError(f"{method} {path} -> {exc.code}: {body[:300]}")


def main() -> None:
    global TOKEN
    print("== Health ==")
    assert call("/api/health")["status"] == "ok"
    print("OK")

    print("== Authentication ==")
    login = call("/api/auth/login", "POST", json.dumps({"username": "superadmin", "password": "Admin@MVA2026!"}).encode())
    TOKEN = login["token"]
    assert login["user"]["role"] == "SUPER_ADMIN"
    assert call("/api/auth/me")["authenticated"]
    print("OK — logged in as", login["user"]["username"])

    print("== Aggregate analytics ==")
    ov = call("/api/analytics/overview")
    assert ov["total_students"] >= 15000, ov["total_students"]
    assert ov["is_demo"] and ov["data_mode"] == "demo"
    assert len(ov["yearly"]) == 5
    assert ov["forecast"]["available"]
    assert ov["forecast"]["validation"]["mae"] is not None
    print(f"OK — {ov['total_students']} records, {ov['states_count']} states, {ov['countries_count']} countries, "
          f"trend={ov['trend']}, forecast={ov['forecast']['next_year_predicted']}")

    print("== Filtered analytics ==")
    filtered = call("/api/analytics/overview?state=" + urllib.parse.quote("Madhya Pradesh"))
    assert 0 < filtered["total_students"] < ov["total_students"]
    assert filtered["top_states"][0]["name"] == "Madhya Pradesh"
    print("OK —", filtered["total_students"], "records in Madhya Pradesh")

    print("== Geography / Year / Insights / Quality ==")
    assert len(call("/api/analytics/states")["states"]) >= 15
    assert len(call("/api/analytics/countries")["countries"]) >= 5
    assert len(call("/api/analytics/years")["years"]) == 5
    assert len(call("/api/analytics/insights")["insights"]) >= 3
    quality = call("/api/analytics/data-quality")
    assert 0 <= quality["score"] <= 100
    print("OK — quality score:", quality["score"])

    print("== Forecast / What-if / State forecast ==")
    fc = call("/api/analytics/forecast?horizon=10")
    assert len([p for p in fc["points"] if p["is_forecast"]]) == 10
    wi = call("/api/analytics/what-if?growth=10&horizon=5")
    assert len(wi["scenarios"]) == 4
    sf = call("/api/analytics/state-forecast?state=" + urllib.parse.quote("Madhya Pradesh"))
    assert sf["available"] and sf["selected"]["state"] == "Madhya Pradesh"
    print("OK —", fc["method"], "| scenarios:", list(wi["scenarios"]))

    print("== Student search (protected) ==")
    search = call("/api/students/search?q=Burhanpur&page=1")
    assert search["total"] > 0 and search["is_demo"]
    assert all(r["is_synthetic"] for r in search["results"])
    print("OK —", search["total"], "synthetic records matched 'Burhanpur'")

    print("== Exports ==")
    for fmt, mime in (("csv", b"DEMO DATA"), ("xlsx", b"PK"), ("pdf", b"%PDF"), ("students_csv", b"student_id")):
        content = call(f"/api/admin/export?format={fmt}", raw=True)
        assert mime in content, f"{fmt} export missing marker: {content[:60]!r}"
        print(f"OK — {fmt}: {len(content):,} bytes")

    print("== Import preview (no commit) ==")
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=[
        "Student ID", "Application ID", "Name", "Gender", "Class", "Year",
        "State", "District", "City", "Country", "Score", "Percentage", "Status",
    ])
    writer.writeheader()
    writer.writerow({
        "Student ID": "TEST-IMPORT-001", "Application ID": "APP-TEST-001", "Name": "Test Synthetic",
        "Gender": "Other", "Class": "Class 9", "Year": 2026, "State": "Madhya Pradesh",
        "District": "Burhanpur", "City": "Burhanpur", "Country": "India",
        "Score": 320, "Percentage": 78, "Status": "Pending",
    })
    boundary = "----MVAsmokeboundary"
    payload = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.csv\"\r\n"
        f"Content-Type: text/csv\r\n\r\n{buffer.getvalue()}\r\n--{boundary}--\r\n"
    ).encode()
    preview = call("/api/admin/import/preview", "POST", payload,
                   {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    assert preview["total_records"] == 1 and preview["valid_records"] == 1
    assert preview["column_mapping"]["Student ID"] == "student_id"
    print("OK — preview validated 1 record with", len(preview["column_mapping"]), "mapped columns")

    print("== Admin management endpoints ==")
    assert len(call("/api/admin/users")) >= 4
    assert len(call("/api/admin/audit-logs")) >= 1
    assert "data_mode" in call("/api/admin/settings")
    assert call("/api/admin/students?page=1")["total"] >= 15000
    print("OK — users, audit logs, settings and record listing accessible")

    print("\nALL SMOKE TESTS PASSED ✅")


if __name__ == "__main__":
    main()
