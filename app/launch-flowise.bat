@echo off
echo ===== LLM Data Platform - Flowise AI Pro Version =====
echo Starting Flowise for advanced LLM manipulation...

cd /d D:\chatbase\chat-go\Flowise

echo Installing Flowise globally...
call npm install -g flowise

echo Starting Flowise server...
start /b npx flowise start

echo ===== Flowise should now be running on http://localhost:3000 =====
echo ===== Your browser window will open automatically =====
timeout /t 5
start http://localhost:3000
