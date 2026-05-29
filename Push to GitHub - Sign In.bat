@echo off
cd /d "%~dp0"
title Push Mad King App to GitHub

echo ========================================
echo Push Mad King Conditioning App to GitHub
echo ========================================
echo.
echo This will ask you to sign in to GitHub if needed.
echo After sign-in, it uploads this local app to:
echo https://github.com/Madkingsonofogun/mad-king-conditioning-app
echo.
echo IMPORTANT:
echo This project uses .codex-git as its local Git folder.
echo.

git credential-manager github login --device --username Madkingsonofogun

echo.
echo Saving any new local changes...
git --git-dir=.codex-git --work-tree=. add .
git --git-dir=.codex-git --work-tree=. commit -m "Update app"

echo.
echo Uploading to GitHub...
git --git-dir=.codex-git --work-tree=. push --force-with-lease -u origin main

echo.
echo Done. If the push failed, read the message above.
echo If it says authentication failed, run this file again and complete GitHub sign-in.
pause
