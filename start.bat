@echo off
title Macro Vision Academy - Analytics Platform
echo ============================================================
echo   MACRO VISION ACADEMY
echo   Student Entrance Analytics ^& Forecasting System
echo ============================================================
echo.
echo Starting API server on http://localhost:8000 ...
start "MVA Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul
echo Starting frontend dev server on http://localhost:5173 ...
start "MVA Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Open http://localhost:5173 in your browser.
echo API docs: http://localhost:8000/docs
echo.
pause
