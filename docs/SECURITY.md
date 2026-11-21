# Privacy & Security

## Implemented controls

- **Password hashing** — PBKDF2-HMAC-SHA256 with 240,000 iterations and a random 16-byte salt per user (`backend/security.py`). Plaintext passwords are never stored.
- **Session management** — cryptographically random bearer tokens (`secrets.token_urlsafe(48)`), server-side session rows, configurable expiry (`SESSION_TTL_HOURS`), single active session per user, logout revocation, client-side token removal.
- **Role-based access control** — four roles with rank checks. Public analytics require no authentication; student-level and admin endpoints enforce minimum roles via FastAPI dependencies.
- **SQL injection protection** — all queries use SQLAlchemy ORM parameter binding; no string-built SQL in request paths.
- **XSS protection** — React escapes rendered content by default; no `dangerouslySetInnerHTML` is used.
- **Secure uploads** — extension allow-list (`.csv`, `.xlsx`, `.xlsm`), 25 MB size limit, staged preview before commit, no direct file execution.
- **Input validation** — Pydantic request models for all write endpoints, numeric range checks in import validation, enum-like query patterns for export format.
- **Audit logs** — login success/failure, logout, imports, demo regeneration/removal, record and user CRUD, settings changes and exports are recorded with username, action, entity and IP.
- **Data separation** — public endpoints return aggregates only. Student search requires ANALYST+. Uploaded personal data is never rendered on public pages.
- **Demo labelling** — synthetic data is flagged in the API (`is_demo`, `is_synthetic`) and shown with banners/badges in every relevant UI area.

## Production checklist

1. Set a strong `SECRET_KEY` and a restricted `ALLOWED_ORIGINS` list.
2. Replace the four default demo accounts with real school accounts; delete or disable unused ones.
3. Enforce HTTPS at the reverse proxy and set secure cookies/headers there.
4. Use PostgreSQL with a dedicated database role and nightly encrypted backups.
5. Review audit logs regularly and restrict SUPER_ADMIN membership.
6. Remove demo data once official data is confirmed (`Admin → Remove demo data`).
7. Consider adding rate limiting (e.g. slowapi) on `/api/auth/login` for internet-facing deployments.

## Known scope

This build implements application-layer authentication and authorization suitable for a school deployment behind a trusted reverse proxy. Additional enterprise controls (SSO, MFA, field-level encryption at rest) are not included but can be layered on without changing the analytics layer.
