@echo off
title God's Covenant Hospital — Server
echo.
echo  ==========================================
echo   God's Covenant Hospital — Starting...
echo  ==========================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists, install if not
if not exist "node_modules" (
  echo  Installing dependencies for the first time...
  echo  Please wait...
  npm install
  echo.
)

echo  Server starting on http://localhost:3000
echo  Open your browser to: http://localhost:3000
echo.
echo  Press Ctrl+C to stop the server.
echo.

node server.js
pause
