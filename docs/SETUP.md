# Setup Guide

## Development

### Backend
```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
On first run, `init_db()` creates all tables, inserts the four roles and default users, and generates 16,500 synthetic records. See `backend/seed.py`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Vite runs on port 5173 and proxies `/api` requests to `http://127.0.0.1:8000`.

## Production (single origin)

```bash
cd frontend && npm run build && cd ..
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
`backend/main.py` detects `frontend/dist`, mounts `/assets` and serves `index.html` for all SPA routes. Visit `http://localhost:8000`.

## PostgreSQL

1. Install the driver: `pip install psycopg2-binary`
2. Create a database, e.g. `mva_analytics`.
3. Set `DATABASE_URL=postgresql+psycopg2://user:password@host:5432/mva_analytics`.
4. Restart the backend. Tables are created automatically; demo data is seeded if `students` is empty.

## Changing demo mode

- `DEMO_RECORD_TARGET` controls record count (default 16500).
- `DEMO_SEED` makes generation reproducible.
- Admin Panel → *Demo Data Management* can regenerate or remove synthetic records.
- Uploading official data via Admin Panel → *Data Import* switches `data_mode` to `official`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows "Unable to load analytics" | Ensure backend is running on port 8000. |
| Login returns 401 | Check username/password from README; passwords are case-sensitive. |
| Empty charts after importing data | Check filters — an incompatible filter can yield zero rows; click **Clear all**. |
| Port already in use | Change the port in the uvicorn command and update the Vite proxy target. |
| `npm.ps1 cannot be loaded` on Windows | Use `npm.cmd` explicitly or run commands in `cmd.exe`. |
