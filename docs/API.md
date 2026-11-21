# API Reference

Base URL: `http://localhost:8000` · Interactive docs: `/docs`

## Public aggregate endpoints

These endpoints never return individual student records.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Service health |
| GET | `/api/analytics/overview` | All dashboard KPIs, yearly series, top states/cities/countries, performance, forecast, insights inputs |
| GET | `/api/analytics/insights` | Auto-generated insights from the selected dataset |
| GET | `/api/analytics/data-quality` | Quality score and breakdown |
| GET | `/api/analytics/states` | Full state analysis with year-wise data |
| GET | `/api/analytics/countries` | Country analysis |
| GET | `/api/analytics/years` | Year table with growth and change |
| GET | `/api/analytics/cities` | City ranking |
| GET | `/api/analytics/filter-options` | Distinct values for filter dropdowns |
| GET | `/api/analytics/forecast?horizon=10` | Forecast points + validation |
| GET | `/api/analytics/what-if?growth=10&horizon=5` | Scenario simulation |
| GET | `/api/analytics/state-forecast?state=...` | Single-state projection and growth rankings |

All analytics endpoints accept filters as query parameters: `year`, `state`, `district`, `city`, `country`, `gender`, `class_applied`, `admission_status`, `school_type`, `score_min`, `score_max`, `percentage_min`, `percentage_max`.

## Authentication

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | body `{username, password}` → `{token, user}` |
| POST | `/api/auth/logout` | Bearer token |
| GET | `/api/auth/me` | Optional Bearer token |

Send the token as `Authorization: Bearer <token>`.

## Protected endpoints

| Method | Path | Min role |
|---|---|---|
| GET | `/api/students/search?q=&page=` | ANALYST |
| GET | `/api/students/{id}` | ANALYST |
| POST | `/api/admin/import/preview` (multipart `file`) | SCHOOL_ADMIN |
| POST | `/api/admin/import/confirm` | SCHOOL_ADMIN |
| GET | `/api/admin/import/history` | SCHOOL_ADMIN |
| POST | `/api/admin/demo/regenerate` | SCHOOL_ADMIN |
| DELETE | `/api/admin/demo/clear` | SUPER_ADMIN |
| GET/POST/PUT/DELETE | `/api/admin/students` | SCHOOL_ADMIN |
| GET/POST/PUT/DELETE | `/api/admin/users` | SUPER_ADMIN for writes |
| GET | `/api/admin/audit-logs` | SCHOOL_ADMIN |
| GET/PUT | `/api/admin/settings` | SCHOOL_ADMIN |
| GET | `/api/admin/export?format=csv\|xlsx\|pdf\|students_csv` | SCHOOL_ADMIN |

Roles: `VIEWER` (1) < `ANALYST` (2) < `SCHOOL_ADMIN` (3) < `SUPER_ADMIN` (4).

## Example: filtered overview

```bash
curl "http://localhost:8000/api/analytics/overview?year=2026&state=Madhya%20Pradesh"
```

## Example: login + student search

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Admin@MVA2026!"}' | jq -r .token)

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/students/search?q=Burhanpur"
```
