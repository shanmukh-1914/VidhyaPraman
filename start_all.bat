@echo off
title Vidhya Praman Unified Platform Launcher
cd /d "%~dp0"
echo ======================================================================
echo Launching Vidhya Praman Architecture:
echo  1. Django Database & Auth Engine  - http://127.0.0.1:8001
echo  2. FastAPI AI/ML Pipeline Engine  - http://127.0.0.1:8000
echo  3. React Vite Neural Dashboard    - http://localhost:5173
echo ======================================================================
start "Vidhya Praman Django DB (8001)" cmd /c "%~dp0start_django.bat"
timeout /t 2 >nul
start "Vidhya Praman FastAPI AI (8000)" cmd /c "%~dp0start_backend.bat"
timeout /t 2 >nul
start "Vidhya Praman React UI (5173)" cmd /c "%~dp0start_frontend.bat"
echo All 3 subsystems initiated!
