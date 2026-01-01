# Install ImageMagick on Windows using Chocolatey or WinGet

Write-Host "🎨 Installing ImageMagick for icon generation..." -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs to run as Administrator" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or manually install from: https://imagemagick.org/script/download.php#windows" -ForegroundColor Cyan
    exit
}

# Try WinGet first (Windows 10/11)
Write-Host "Attempting installation via WinGet..." -ForegroundColor Green
try {
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        winget install --id ImageMagick.ImageMagick -e --source winget
        Write-Host "✅ ImageMagick installed via WinGet" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal and run:" -ForegroundColor Cyan
        Write-Host "  npm run generate-icons" -ForegroundColor White
        exit 0
    }
} catch {
    Write-Host "WinGet not available, trying Chocolatey..." -ForegroundColor Yellow
}

# Try Chocolatey
Write-Host "Attempting installation via Chocolatey..." -ForegroundColor Green
try {
    $chocoCheck = Get-Command choco -ErrorAction SilentlyContinue
    if ($chocoCheck) {
        choco install imagemagick -y
        Write-Host "✅ ImageMagick installed via Chocolatey" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal and run:" -ForegroundColor Cyan
        Write-Host "  npm run generate-icons" -ForegroundColor White
        exit 0
    } else {
        Write-Host "Chocolatey not found. Installing Chocolatey first..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        choco install imagemagick -y
        Write-Host "✅ ImageMagick installed" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal and run:" -ForegroundColor Cyan
        Write-Host "  npm run generate-icons" -ForegroundColor White
        exit 0
    }
} catch {
    Write-Host "❌ Automatic installation failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Manual Installation:" -ForegroundColor Yellow
Write-Host "1. Download from: https://imagemagick.org/script/download.php#windows" -ForegroundColor White
Write-Host "2. Run the installer" -ForegroundColor White
Write-Host "3. Make sure 'Add to PATH' is checked" -ForegroundColor White
Write-Host "4. Restart your terminal" -ForegroundColor White
Write-Host "5. Run: npm run generate-icons" -ForegroundColor White
