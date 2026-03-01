@echo off
title KoderKids ERP - Production Build

:: Switch to production environment
python "%~dp0scripts\switch_env.py" prod --no-start

:: Build frontend
echo.
echo Building frontend... This may take a few minutes.
echo.
cd /d "%~dp0frontend"
call npm run build

:: Open build folder in Explorer
echo.
echo Build complete! Opening build folder...
start "" explorer "%~dp0frontend\build"

timeout /t 5 >nul
