@echo off
title Vidhya Praman Django Database ^& Auth API (Port 8001)
cd /d "%~dp0server_django"
call ..\.venv\Scripts\activate.bat
echo Starting Vidhya Praman Django Database ^& Auth Engine...
python manage.py runserver 0.0.0.0:8001
pause
