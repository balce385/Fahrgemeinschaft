@echo off
chcp 65001 >nul
title Fahrgemeinschaft Dev-Server
cd /d "%~dp0"

echo.
echo ============================================
echo   Fahrgemeinschaft - lokaler Dev-Server
echo ============================================
echo.

if not exist "node_modules\" (
  echo [1/2] Erste Einrichtung - installiere Pakete...
  echo       Das dauert beim ersten Mal ~30-60 Sekunden.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [FEHLER] npm install fehlgeschlagen.
    echo          Pruefe ob Node.js installiert ist: node --version
    echo.
    pause
    exit /b 1
  )
  echo.
  echo [OK] Pakete installiert.
  echo.
)

echo [2/2] Starte Vite-Dev-Server...
echo.
echo Browser oeffnet automatisch in 5 Sekunden auf http://localhost:5173
echo Zum Beenden: dieses Fenster schliessen oder Strg+C
echo.

start "" /b cmd /c "timeout /t 5 /nobreak >nul 2>&1 && start http://localhost:5173"

call npm run dev

echo.
echo Server beendet.
pause
