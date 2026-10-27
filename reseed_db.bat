@echo off
echo ====================================================
echo   AICTE SENTINEL - Database Reseeder
echo   Smart India Hackathon 2026 (PS ID: 26264)
echo ====================================================
echo.
cd /d "%~dp0"

echo Resetting SQLite database to clean fictional demonstration baseline...
python backend\app\seed\seed_data.py
if errorlevel 1 (
    echo [ERROR] Failed to seed database.
    pause
    exit /b 1
)

echo.
echo Database successfully seeded with:
echo - 8 Fictional Institutions
echo - 25 Fictional Complaint Cases across RB, PGRC, Approval, Finance
echo - Active Cross-Bureau Overlaps and Conflicts
echo - Inter-Bureau Coordination Tasks
echo - 8-Block Tamper-Evident SHA-256 Audit Trail
echo.
pause
