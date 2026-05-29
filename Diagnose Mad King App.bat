@echo off
cd /d "%~dp0"
set LOG=mad-king-startup.log

echo ======================================== > "%LOG%"
echo Mad King startup check >> "%LOG%"
echo Started: %DATE% %TIME% >> "%LOG%"
echo Folder: %CD% >> "%LOG%"
echo ======================================== >> "%LOG%"
echo. >> "%LOG%"

echo Checking Node...
node -v >> "%LOG%" 2>&1
echo Checking npm... >> "%LOG%"
npm.cmd -v >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo Checking app files... >> "%LOG%"
if not exist package.json (
  echo ERROR: package.json is missing. >> "%LOG%"
  type "%LOG%"
  pause
  exit /b 1
)
if not exist node_modules (
  echo node_modules missing. Installing dependencies... >> "%LOG%"
  npm.cmd install --cache ./.npm-cache >> "%LOG%" 2>&1
)

echo. >> "%LOG%"
echo Generating Prisma client... >> "%LOG%"
npm.cmd run prisma:generate >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo Syncing database... >> "%LOG%"
npx.cmd prisma db push >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo Building app... >> "%LOG%"
npm.cmd run build >> "%LOG%" 2>&1
if errorlevel 1 (
  echo. >> "%LOG%"
  echo ERROR: Build failed. >> "%LOG%"
  type "%LOG%"
  pause
  exit /b 1
)

echo. >> "%LOG%"
echo Starting app on http://localhost:3000/login >> "%LOG%"
echo If this window closes, open mad-king-startup.log and send the last lines to Codex. >> "%LOG%"
type "%LOG%"
npm.cmd start >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo ERROR: Server stopped. >> "%LOG%"
type "%LOG%"
pause
