# ==========================================================================
# Macro Vision Academy — single-container production image
# Builds the React frontend, then serves everything through FastAPI.
# Result: one HTTPS service on $PORT (Render/Railway/Fly/VPS).
# ==========================================================================

# --- Stage 1: build frontend ------------------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
# Changing BUILD_ID invalidates the cached frontend layer so deploys pick up UI changes.
ARG BUILD_ID=20261127b
RUN echo $BUILD_ID > /tmp/mva-build-id
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python runtime -----------------------------------------------
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY database/ ./database/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DATABASE_URL=sqlite:////app/database/mva.db

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
