@echo off
echo ====================================================
echo   AICTE SENTINEL - Backend Server Startup
echo   Smart India Hackathon 2026 (PS ID: 26264)
echo ====================================================
echo.
cd /d "%~dp0"

echo [1/2] Checking Python environment...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.11+.
    pause
    exit /b 1
)

echo [2/2] Starting FastAPI backend on http://127.0.0.1:8000...
echo Interactive API Documentation: http://127.0.0.1:8000/docs
echo.
python backend\run_backend.py
pause
