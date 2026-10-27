@echo off
echo ====================================================
echo   AICTE SENTINEL - Frontend Client Startup
echo   Smart India Hackathon 2026 (PS ID: 26264)
echo ====================================================
echo.
cd /d "%~dp0\frontend"

echo [1/2] Checking Node.js environment...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

echo [2/2] Starting Vite React application on http://127.0.0.1:5173...
echo.
npm run dev -- --host 127.0.0.1 --port 5173
pause
