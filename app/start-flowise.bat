@echo off
echo === LLM Data Platform - Flowise AI Launcher ===
echo Starting Flowise AI Pro Version...

REM Change to Flowise directory with proper path handling
cd /d "D:\chatbase\chat-go\Flowise"

REM Check if node_modules exists, if not, install dependencies
if not exist "node_modules" (
  echo Installing Flowise dependencies (this may take a few minutes)...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo Error installing dependencies! Please check the console for details.
    pause
    exit /b %ERRORLEVEL%
  )
)

REM Check if npx flowise is available, if not, install it globally
where flowise >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Installing Flowise globally...
  call npm install -g flowise
  if %ERRORLEVEL% NEQ 0 (
    echo Error installing Flowise! Please check the console for details.
    pause
    exit /b %ERRORLEVEL%
  )
)

REM Start Flowise
echo Starting Flowise on http://localhost:3000
call npx flowise start

