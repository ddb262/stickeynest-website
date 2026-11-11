@echo off
title StickyNest Store
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed to run this store. Install the current LTS version from nodejs.org, then try again.
  pause
  exit /b 1
)
start "" /b node server.mjs
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"
echo StickyNest is running. Keep this window open while you use the store.
pause
