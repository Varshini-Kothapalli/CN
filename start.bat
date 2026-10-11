@echo off
echo ======================================================================
echo Starting NetDiag: Automated Network Connectivity Diagnosis System
echo ======================================================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "NetDiag Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo [2/2] Starting React Frontend on http://localhost:5173 ...
start "NetDiag Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo Opening NetDiag Dashboard in default browser...
start http://localhost:5173

echo.
echo Application is running!
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo - Swagger:  http://127.0.0.1:8000/docs
echo ======================================================================
