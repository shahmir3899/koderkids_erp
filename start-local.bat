@echo off
title KoderKids ERP - Local Dev

:: Switch to local environment
python "%~dp0scripts\switch_env.py" local --no-start

:: Open VS Code in project root
start "" code "%~dp0."

:: Start backend in a new terminal
start "Backend Server" cmd /k "cd /d %~dp0backend && python manage.py runserver"

:: Start frontend in a new terminal
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

echo All started! You can close this window.
timeout /t 3 >nul
