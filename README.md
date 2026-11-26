# MACRO VISION ACADEMY
## Student Entrance Analytics & Forecasting System
**Burhanpur, Madhya Pradesh, India**

A production-quality full-stack analytics platform for analysing five years of student entrance registrations. Every statistic, percentage, ranking, chart and prediction is **computed dynamically from the database** — nothing is hard-coded.

---

## ⚠️ IMPORTANT DATA RULE

**Demo data is always clearly labelled as synthetic.** When no official school dataset has been uploaded, the system automatically generates **16,500 completely fictional student records** and displays a prominent banner:

> **DEMO DATA — Synthetic records for demonstration only. No record represents a real student of Macro Vision Academy.**

When an authorised administrator uploads official data via the Admin Panel, the mode switches to **OFFICIAL SCHOOL DATA MODE** and the demo banner disappears. No invented record is ever presented as a real student.

---

## ✨ Features

**New in this release:** Figma-grade UI system — Inter typography, single blue accent, 1px panels, compact 30px controls, stroke icons and ⌘K page search — with the full motion layer retained (aurora, scroll reveals, count-ups, chart entrances, tilt, ripples, cursor glow, shimmer). All authenticated pages use an OpenRouter-inspired dark theme (near-black canvas, violet glow, animated sparkline on the dashboard, section tabs, blur-in charts and violet chart palettes); the public landing page keeps the vibrant navy/blue/teal/gold look. Also: interactive India choropleth map, entrance-performance analytics, side-by-side year comparison, four back-tested forecasting models, cascading state → district → city filters, a Prediction Year selector, a data-grounded **AI assistant** (Groq / Qwen 3.8 27B, key stays server-side), vector-chart PDF reports, shareable filter URLs, toasts, skeletons and a guided tour.

**Synthetic-data disclosure:** a compact `DEMO DATA` pill in the top bar plus one concise explanation on the dashboard — no repeated banners.

| Area | What it does |
|---|---|
| **Public Website** | Beautiful landing page with Home, About, Student Reach, State-wise Reach, Country-wise Reach, Five-Year Growth, Future Outlook, Contact/Admin Login. Aggregated statistics only — never individual records. |
| **Dashboard** | 8 KPI cards, AI insights, growth chart, state/country distribution, validated forecast chart, sortable Top-10 tables, admission/class charts, data-quality snapshot. |
| **Five-Year Data** | 16,500 deterministic synthetic records across 2022–2026 with 21 fields including IDs, names, gender, DOB, class, state, district, city, country, pincode, school type, scores, percentages, status, dates and referral source. |
| **Geographical Analytics** | State/country analysis with counts, percentage share, year-wise change, growth %, rank, trend; bar, donut and stacked-bar charts; detailed per-state year table. |
| **Year-wise Analysis** | Selectable years, growth % = `((current − previous) / previous) × 100`, interactive line chart and comparison table. |
| **Future Prediction** | Automatic method selection (linear regression vs exponential trend) via rolling-origin back-testing. 1/2/3/5/10-year estimates with confidence range, MAE/RMSE/MAPE, forecast-vs-actual comparison and plain-language explanation. |
| **What-If Simulator** | Growth/decline from −30% to +40%, presets ±5/10/15/20%, compound projection, optimistic / normal / declining scenario comparison. |
| **State-wise Forecast** | Per-state current/previous students, growth, 1/3/5-year predictions, fastest-growing / declining / stable states. |
| **Student Search** | Search by student ID, application ID, name, city, state, country, academic year or class. Restricted to ANALYST+, every record marked SYNTHETIC in demo mode. |
| **Advanced Filters** | Year, state, district, city, country, gender, class, admission status, school type, score range, percentage range. All charts and statistics update dynamically. |
| **Data Import** | Admin-only CSV/Excel upload with column mapping, validation, duplicate detection, missing-value detection, preview and confirmation. |
| **Data Export** | CSV, Excel and PDF reports plus raw student CSV — all respecting active filters. |
| **Admin Panel** | Demo regeneration/removal, record add/edit/delete, user management, audit logs, settings, report generation. |
| **Privacy & Security** | PBKDF2-SHA256 password hashing (240k iterations), token sessions with expiry, role-based access control (VIEWER / ANALYST / SCHOOL_ADMIN / SUPER_ADMIN), SQL injection protection via ORM, XSS-safe React rendering, file-type/size validation, audit logging, protected routes. |
| **Data Quality** | Missing values, duplicate IDs, invalid dates, invalid percentages, invalid states/countries, wrong types and impossible values → 0–100% score with detailed breakdown. |
| **AI Insights** | Every sentence calculated from the selected dataset — no unsupported claims. |
| **Responsive Design** | Desktop, laptop, tablet and mobile. Charts resize automatically, tables scroll horizontally. Figma-inspired light/dark themes. JS-driven animations: count-up KPIs, scroll reveals, chart entrances, growing bars, aurora drift, tilt, ripples, cursor glow and shimmer. |

---

## 🏗️ Architecture

```
School Project/
├── backend/
│   ├── main.py               # FastAPI app, CORS, SPA serving, lifespan
│   ├── config.py             # Environment-driven configuration
│   ├── database.py           # Engine, sessions, SQLite pragmas
│   ├── models.py             # Normalized SQLAlchemy schema (9 tables)
│   ├── security.py           # Hashing, sessions, RBAC, audit helper
│   ├── seed.py               # DB init + automatic demo seeding
│   ├── generators/
│   │   └── synthetic.py      # Deterministic fictional-record generator
│   ├── services/
│   │   ├── analytics.py      # All dynamically computed metrics
│   │   ├── forecasting.py     # OLS / exponential trend, validation, what-if
│   │   ├── importer.py        # CSV/Excel validation & import
│   │   └── exporter.py        # CSV / XLSX / PDF reports
│   └── routers/
│       ├── auth.py            # Login, logout, /me
│       ├── analytics.py       # Public aggregate endpoints
│       ├── students.py        # Protected student-level endpoints
│       └── admin.py           # Import, records, users, settings, audit, export
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, KpiCard, Charts, Filters, RankTable
│   │   ├── pages/            # Landing, Login, Dashboard, Geography, Years,
│   │   │                     # Forecast, Simulator, Students, Quality, Admin
│   │   ├── api.ts            # Typed API client
│   │   ├── store.tsx         # React context (filters, data, session)
│   │   ├── types.ts          # Shared TypeScript interfaces
│   │   ├── styles.css        # Premium design system + animations
│   │   └── main.tsx          # SPA router
│   ├── vite.config.ts        # Dev proxy to backend
│   └── dist/                 # Production build (served by FastAPI)
├── database/
│   ├── mva.db                # SQLite database (auto-created)
│   └── schema.sql            # Reference DDL
├── analytics/                # Analytics notes (see docs/)
├── forecasting/              # Forecasting notes (see docs/)
├── docs/                     # Setup, architecture, API, security guides
├── tests/                    # API smoke tests + import test
├── Dockerfile                # Single-container production build
├── render.yaml               # One-click Render blueprint → https://mva-analytics.onrender.com
├── railway.json, Procfile    # Alternative hosting configs
├── .dockerignore
└── .env.example              # Configuration template
```

### Direct page links
Each page has its own hash URL, so you can bookmark or share a specific view:
`http://localhost:8000/#/dashboard`, `/#/geography`, `/#/forecast`, `/#/simulator`, `/#/admin`, etc. Browser back/forward works normally.

### Public HTTPS URL
See `docs/DEPLOY.md` for the exact steps to get `https://mva-analytics.onrender.com` (free, valid SSL, MVA in the name).

### Database tables
`roles`, `users`, `sessions`, `academic_years`, `entrance_exams`, `locations`, `schools`, `students`, `forecast_results`, `audit_logs`, `uploaded_datasets`, `settings` — with indexes and foreign keys. SQLite by default; set `DATABASE_URL` to a PostgreSQL URL for production (install `psycopg2-binary`).

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** (tested with 3.15)
- **Node.js 18+** (tested with 22)

### 1. Backend

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The database is created and seeded automatically on first startup. API docs: <http://localhost:8000/docs>

### 2. Frontend (development)

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to port 8000.

### 3. Production build (single server)

```powershell
cd frontend
npm run build
cd ..
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

FastAPI serves the built SPA from `frontend/dist` at <http://localhost:8000>.

### 4. Windows helper

```powershell
.\start.bat
```

---

## 🔐 Demo credentials

| Username | Password | Role |
|---|---|---|
| `superadmin` | `Admin@MVA2026!` | SUPER ADMIN |
| `schooladmin` | `School@MVA2026!` | SCHOOL ADMIN |
| `analyst` | `Analyst@MVA2026!` | ANALYST |
| `viewer` | `Viewer@MVA2026!` | VIEWER |

> **Change these before production deployment.** Set `SECRET_KEY` and create real accounts in the Admin Panel.

---

## 🧪 Tests

```powershell
python tests/smoke_api.py          # full API smoke test (server must be running)
python tests/test_import_confirm.py # complete import → confirm → restore flow
python -m unittest discover -s tests # forecasting unit tests
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust. Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///database/mva.db` | Database connection (PostgreSQL-ready) |
| `SECRET_KEY` | dev placeholder | Application secret |
| `DEMO_RECORD_TARGET` | `16500` | Number of synthetic records |
| `DEMO_SEED` | `20260221` | Deterministic generation seed |
| `SESSION_TTL_HOURS` | `12` | Session lifetime |
| `ALLOWED_ORIGINS` | localhost:5173 | CORS allow-list |
| `MAX_UPLOAD_MB` | `25` | Upload size limit |

---

## 📊 Forecasting methodology

1. Build the annual registration series from the filtered dataset.
2. Fit both a **linear regression** and a **log-linear (compound growth)** trend.
3. Compare them with **rolling-origin validation**: each year is predicted using only earlier years.
4. Select the method with the lower MAE.
5. Project up to 10 years with a residual-based ± uncertainty interval.
6. Report MAE, RMSE and MAPE from the back-test.

All outputs are labelled **ESTIMATE** and include the disclaimer that they are not guaranteed registration numbers.

---

## 🛡️ Privacy notes

- Public pages expose **only aggregates** — `/api/analytics/*` never returns student rows.
- Student search and record management require ANALYST+ / ADMIN roles.
- In demo mode every card, table and search result is visibly labelled synthetic.
- Uploaded data is staged, validated and never shown publicly.
- All sensitive actions are written to `audit_logs`.

---

## 📄 License & attribution

Built for Macro Vision Academy, Burhanpur. Demo records are fictional and must not be represented as actual student records.
