@echo off
title KoderKids ERP - Production

:: Switch to production environment
python "%~dp0scripts\switch_env.py" prod --no-start

:: Open VS Code in project root
start "" code "%~dp0."

echo Environment set to PRODUCTION. VS Code opened.
timeout /t 3 >nul
