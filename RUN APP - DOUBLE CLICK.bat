@echo off
cd /d "%~dp0"
title Mad King Conditioning App

echo ========================================
echo Mad King Conditioning App
echo ========================================
echo.
echo Keep this window open.
echo If this window is closed, the website will say:
echo localhost refused to connect.
echo.
echo Browser address:
echo http://localhost:3000/login
echo.

if not exist node_modules (
  echo Installing app files. This may take a few minutes...
  npm.cmd install --cache ./.npm-cache
)

echo Starting app now...
echo.
npm.cmd run dev

echo.
echo ========================================
echo The app stopped.
echo Take a picture of this window and send it to Codex.
echo ========================================
pause
