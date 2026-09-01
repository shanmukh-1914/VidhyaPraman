@echo off
title Vidhya Praman FastAPI Backend (Port 8000)
cd /d "%~dp0"
call .venv\Scripts\activate.bat
echo Starting Vidhya Praman Unified AI/ML FastAPI Server...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
