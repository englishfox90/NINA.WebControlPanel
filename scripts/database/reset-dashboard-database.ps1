#!/usr/bin/env pwsh
# Reset Dashboard Database Script
# Creates a fresh database for new users while backing up existing data

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "     NINA WebControlPanel - Database Reset Tool       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$dbPath = "src\server\dashboard-config.sqlite"
$dbExists = Test-Path $dbPath

if ($dbExists) {
    # Create backup with timestamp
    $timestamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
    $backupName = "dashboard-config.sqlite.backup-$timestamp"
    $backupPath = "src\server\$backupName"
    
    Write-Host "Current database found!" -ForegroundColor Yellow
    Write-Host "Location: $dbPath`n" -ForegroundColor Gray
    
    # Show database info
    $dbInfo = Get-Item $dbPath
    Write-Host "Database Info:" -ForegroundColor Cyan
    Write-Host "  Size: $([math]::Round($dbInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
    Write-Host "  Last Modified: $($dbInfo.LastWriteTime)`n" -ForegroundColor Gray
    
    # Confirm reset
    $confirm = Read-Host "Reset database to defaults? This will backup current data. (Y/N)"
    
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        Write-Host "`nBacking up database..." -ForegroundColor Yellow
        Copy-Item $dbPath $backupPath
        Write-Host "Backup created: $backupPath" -ForegroundColor Green
        
        Write-Host "`nRemoving old database..." -ForegroundColor Yellow
        Remove-Item $dbPath
        Write-Host "Database removed successfully!" -ForegroundColor Green
        
        Write-Host "`n========================================================" -ForegroundColor Cyan
        Write-Host "                Database Reset Complete                " -ForegroundColor Green
        Write-Host "========================================================" -ForegroundColor Cyan
        
        Write-Host "`nWhat happens next:" -ForegroundColor Yellow
        Write-Host "  1. A fresh database will be auto-created on server start" -ForegroundColor Gray
        Write-Host "  2. Default widgets will be configured automatically" -ForegroundColor Gray
        Write-Host "  3. You'll need to configure NINA connection in Settings" -ForegroundColor Gray
        Write-Host "`nYour backup is safe at: $backupPath" -ForegroundColor Cyan
        
        Write-Host "`nTo restore from backup later:" -ForegroundColor Yellow
        Write-Host "  Copy-Item '$backupPath' '$dbPath'" -ForegroundColor Gray
        
    } else {
        Write-Host "`nReset cancelled. No changes made." -ForegroundColor Yellow
    }
    
} else {
    Write-Host "No existing database found - already in fresh state!" -ForegroundColor Green
    Write-Host "`nA new database will be created automatically when you run:" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor Gray
}

Write-Host ""
