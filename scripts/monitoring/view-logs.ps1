#!/usr/bin/env pwsh
# Interactive log viewer for NINA WebControlPanel

param(
    [ValidateSet('backend', 'frontend', 'build', 'all', 'latest')]
    [string]$Type = 'all',
    
    [int]$Lines = 50,
    
    [switch]$Follow,
    
    [switch]$Clean
)

$logsDir = "logs"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       NINA WebControlPanel - Log Viewer              " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

if ($Clean) {
    Write-Host "Cleaning old log files..." -ForegroundColor Yellow
    $confirm = Read-Host "Delete all log files? (Y/N)"
    
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        Remove-Item "$logsDir\*.log" -Force -ErrorAction SilentlyContinue
        Write-Host "✅ All log files deleted" -ForegroundColor Green
    } else {
        Write-Host "Cancelled" -ForegroundColor Yellow
    }
    exit 0
}

if (-not (Test-Path $logsDir)) {
    Write-Host "❌ Logs directory not found: $logsDir" -ForegroundColor Red
    Write-Host "   Start the application first to generate logs" -ForegroundColor Gray
    exit 1
}

# Get log files based on type
$logFiles = @()
switch ($Type) {
    'backend' {
        $logFiles = Get-ChildItem "$logsDir\backend-*.log" -ErrorAction SilentlyContinue
    }
    'frontend' {
        $logFiles = Get-ChildItem "$logsDir\frontend-*.log" -ErrorAction SilentlyContinue
    }
    'build' {
        $logFiles = Get-ChildItem "$logsDir\build-*.log" -ErrorAction SilentlyContinue
    }
    'latest' {
        $logFiles = Get-ChildItem "$logsDir\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }
    'all' {
        $logFiles = Get-ChildItem "$logsDir\*.log" -ErrorAction SilentlyContinue
    }
}

if ($logFiles.Count -eq 0) {
    Write-Host "❌ No log files found for type: $Type" -ForegroundColor Red
    exit 1
}

Write-Host "Available log files:" -ForegroundColor Cyan
$logFiles | ForEach-Object {
    $age = (Get-Date) - $_.LastWriteTime
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  📄 $($_.Name)" -ForegroundColor Gray
    Write-Host "     Size: $size KB | Age: $($age.Days)d $($age.Hours)h $($age.Minutes)m" -ForegroundColor DarkGray
}
Write-Host ""

if ($Follow) {
    Write-Host "📡 Following logs (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "========================================================`n" -ForegroundColor Cyan
    
    $logFiles | ForEach-Object {
        Get-Content $_.FullName -Tail $Lines -Wait
    }
} else {
    Write-Host "📋 Showing last $Lines lines..." -ForegroundColor Yellow
    Write-Host "========================================================`n" -ForegroundColor Cyan
    
    $logFiles | ForEach-Object {
        Write-Host "`n--- $($_.Name) ---" -ForegroundColor Magenta
        Get-Content $_.FullName -Tail $Lines
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "Usage examples:" -ForegroundColor Yellow
Write-Host "  .\view-logs.ps1 -Type backend -Lines 100" -ForegroundColor Gray
Write-Host "  .\view-logs.ps1 -Type frontend -Follow" -ForegroundColor Gray
Write-Host "  .\view-logs.ps1 -Type latest -Lines 20" -ForegroundColor Gray
Write-Host "  .\view-logs.ps1 -Clean" -ForegroundColor Gray
Write-Host ""
