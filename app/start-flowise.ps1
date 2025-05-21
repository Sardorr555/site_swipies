Write-Host "=== LLM Data Platform - Flowise AI Launcher ===" -ForegroundColor Cyan
Write-Host "Starting Flowise AI Pro Version..." -ForegroundColor Green

# Change to Flowise directory
Set-Location -Path "..\Flowise"

# Check if node_modules exists, if not, install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Flowise dependencies (this may take a few minutes)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error installing dependencies! Please check the console for details." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit $LASTEXITCODE
    }
}

# Start Flowise
Write-Host "Starting Flowise on http://localhost:3000" -ForegroundColor Green
npx flowise start
