@echo off
title KoderKids ERP - Production Build

:: `npm run build` auto-loads frontend/.env.production (REACT_APP_API_URL etc.)
:: — no env-switching step needed anymore.

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
