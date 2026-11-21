# Architecture

## Request flow

```
Browser (React SPA)
   │  fetch /api/...
   ▼
FastAPI (backend/main.py)
   ├─ /api/auth/*        → security.py (PBKDF2, token sessions, RBAC)
   ├─ /api/analytics/*   → services/analytics.py → SQLAlchemy ORM → DB
   ├─ /api/students/*    → require_analyst → analytics.search_students
   └─ /api/admin/*       → require_admin / require_super_admin
                           ├─ importer.py  (CSV/Excel → staging → confirm)
                           ├─ exporter.py  (CSV / XLSX / PDF)
                           └─ seed.py      (demo regeneration)
```

## Data flow rule

**No analytics are hard-coded.** `analytics.fetch_rows()` builds one SQLAlchemy query with all active filters joined across `students`, `academic_years`, `locations` and `schools`. Every downstream function — `overview`, `state_analysis`, `country_analysis`, `year_analysis`, `data_quality`, `insights`, `search_students` — derives its result from those rows. Forecasts consume the year-count series produced from the same rows.

## Normalization

- `academic_years` — one row per year (2022–2026 in demo mode).
- `entrance_exams` — exam codes per year, linked to academic years.
- `locations` — deduplicated country/state/district/city tuples.
- `schools` — deduplicated previous-school names with board type.
- `students` — facts referencing the above dimension tables.
- `users` / `roles` / `sessions` — authentication and RBAC.
- `uploaded_datasets` — import staging (JSON payload with validated rows).
- `forecast_results` — forecast audit trail.
- `audit_logs` — security-relevant actions.
- `settings` — key/value dashboard configuration.

## Demo vs official mode

`settings.data_mode` is `demo` until an authorised import is confirmed. `Student.is_synthetic` marks every generated record. The frontend reads `overview.is_demo` and renders the orange DEMO banner across public and admin areas. Search results additionally tag each row `SYNTHETIC`.

## Animation strategy

Animations are JS-driven without a heavy animation library:
- `AnimatedNumber` uses `requestAnimationFrame` with cubic ease-out for KPI count-ups.
- `useReveal` attaches an `IntersectionObserver` to `.reveal` elements, adding `.visible` on scroll.
- Recharts handles chart entrance/morph animations; CSS `@keyframes` add bar growth, banner pulse, hero float and card lift.
- Theme (light/dark) is applied via `data-theme` on `<html>` and persisted in `localStorage`.
