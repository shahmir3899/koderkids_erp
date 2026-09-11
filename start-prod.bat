@echo off
title KoderKids ERP - Production Mode (local run)

:: Runs the backend locally with ENVIRONMENT=production so you can sanity-check
:: prod-mode behavior (DEBUG=False, SMTP email, groq-only LLM, etc.) without
:: touching backend/.env or deploying. Frontend prod behavior only matters at
:: build time — see build-prod.bat.

start "Backend Server (PROD mode)" cmd /k "cd /d %~dp0backend && set ENVIRONMENT=production && python manage.py runserver"

echo Backend starting in PRODUCTION mode in a new terminal.
timeout /t 3 >nul
