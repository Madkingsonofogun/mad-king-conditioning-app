@echo off
cd /d "%~dp0"

:start
cls
echo Starting Mad King Conditioning app in stable mode...
echo.
echo Keep this window open while you use the browser.
echo Open http://localhost:3000/login
echo.
if not exist node_modules (
  echo Installing app files first...
  npm.cmd install --cache ./.npm-cache
)
echo.
echo Building app...
npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. The app will retry in 10 seconds.
  timeout /t 10
  goto start
)
echo.
echo Starting stable local app server...
npm.cmd start
echo.
echo The app server stopped or crashed.
echo It will restart in 5 seconds. Press CTRL+C to stop it.
timeout /t 5
goto start
