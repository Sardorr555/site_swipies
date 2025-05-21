Write-Host "=== LLM Data Platform - Flowise AI Launcher ===" -ForegroundColor Cyan
Write-Host "Starting Flowise AI Pro Version..." -ForegroundColor Green

# Change to Flowise directory
Set-Location -Path "D:\chatbase\chat-go\Flowise"

# Install Flowise globally if not already installed
try {
    $flowiseVersion = npm list -g flowise 2>$null
    if (-not $flowiseVersion) {
        Write-Host "Installing Flowise globally..." -ForegroundColor Yellow
        npm install -g flowise
    } else {
        Write-Host "Flowise is already installed." -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking Flowise installation. Installing anyway..." -ForegroundColor Yellow
    npm install -g flowise
}

# Start Flowise
Write-Host "Starting Flowise on http://localhost:3000" -ForegroundColor Green
npx flowise start
