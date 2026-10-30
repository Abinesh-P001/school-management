@echo off
echo ========================================================
echo  Starting Oakridge School Management System
echo  Backend (FastAPI) + Frontend (React / Vite)
echo ========================================================

echo Starting FastAPI Backend on http://127.0.0.1:8000...
start "Oakridge Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Vite Frontend...
start "Oakridge Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Backend:  http://127.0.0.1:8000/api
echo Frontend: http://localhost:5173/
echo ========================================================
pause

