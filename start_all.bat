@echo off
echo ===================================================================
echo   AICTE SENTINEL - Full Stack Launcher
echo   Smart India Hackathon 2026 (Problem Statement ID: 26264)
echo ===================================================================
echo.
echo Launching Backend (FastAPI on http://127.0.0.1:8000)...
start "AICTE Sentinel - Backend" cmd /k "cd /d %~dp0 && call start_backend.bat"

timeout /t 3 /nobreak >nul

echo Launching Frontend (Vite on http://127.0.0.1:5173)...
start "AICTE Sentinel - Frontend" cmd /k "cd /d %~dp0 && call start_frontend.bat"

echo.
echo ===================================================================
echo   AICTE Sentinel is starting up!
echo   - Web Portal: http://127.0.0.1:5173
echo   - Backend API Docs: http://127.0.0.1:8000/docs
echo   - Demo Super Admin: superadmin / Admin@123
echo ===================================================================
