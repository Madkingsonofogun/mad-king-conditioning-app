@echo off
cd /d "%~dp0"
echo Starting Mad King Conditioning app...
echo.
echo Keep this window open while you use the browser.
echo Open http://localhost:3000/login
echo.
if not exist node_modules (
  echo Installing app files first...
  npm.cmd install --cache ./.npm-cache
)
echo.
echo Starting local app server...
npm.cmd run dev
pause
