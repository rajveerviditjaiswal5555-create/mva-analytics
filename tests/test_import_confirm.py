"""Verify the complete import-confirm flow, then restore demo mode."""
from __future__ import annotations

import csv
import io
import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def call(path, method="GET", data=None, headers=None):
    hdrs = dict(headers or {})
    if data is not None and "Content-Type" not in hdrs:
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=hdrs, method=method)
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read())


def main():
    token = call("/api/auth/login", "POST", json.dumps({
        "username": "superadmin", "password": "Admin@MVA2026!",
    }).encode())["token"]
    auth = {"Authorization": f"Bearer {token}"}

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=[
        "Student ID", "Application ID", "Name", "Gender", "Class", "Year",
        "State", "District", "City", "Country", "Score", "Percentage", "Status",
    ])
    writer.writeheader()
    writer.writerow({
        "Student ID": "TEST-CONFIRM-001", "Application ID": "APP-CONFIRM-001",
        "Name": "Test Synthetic", "Gender": "Other", "Class": "Class 9", "Year": 2026,
        "State": "Madhya Pradesh", "District": "Burhanpur", "City": "Burhanpur",
        "Country": "India", "Score": 320, "Percentage": 78, "Status": "Pending",
    })

    boundary = "----MVAImportBoundary"
    payload = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="test.csv"\r\n'
        "Content-Type: text/csv\r\n\r\n"
        f"{buffer.getvalue()}\r\n--{boundary}--\r\n"
    ).encode()
    preview = call("/api/admin/import/preview", "POST", payload, {
        "Content-Type": f"multipart/form-data; boundary={boundary}", **auth,
    })
    print("Preview:", preview["valid_records"], "valid record(s)")

    result = call("/api/admin/import/confirm", "POST", json.dumps({
        "staging_id": preview["staging_id"], "replace_demo": False,
    }).encode(), auth)
    print("Confirm:", result)
    assert result["imported"] == 1
    assert call("/api/analytics/overview")["data_mode"] == "official"

    restored = call("/api/admin/demo/regenerate", "POST", b"{}", auth)
    overview = call("/api/analytics/overview")
    print("Restored:", restored, "total:", overview["total_students"], "mode:", overview["data_mode"])
    assert overview["data_mode"] == "demo"
    assert overview["total_students"] >= 15000
    print("IMPORT/RESTORE TEST PASSED ✅")


if __name__ == "__main__":
    main()
