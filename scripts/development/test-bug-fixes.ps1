#!/usr/bin/env pwsh
# Bug Fix Verification Script for NINA WebControlPanel
# Tests all three fixes from the first user bug report

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  NINA WebControlPanel - Bug Fix Verification Suite  " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

# Test 1: Check .env webpack configuration
Write-Host "[TEST 1] Webpack Dev Server Configuration" -ForegroundColor Yellow
Write-Host "Checking src/client/.env for WDS_SOCKET settings..." -ForegroundColor Gray

if (Test-Path "src\client\.env") {
    $envContent = Get-Content "src\client\.env" -Raw
    if ($envContent -match "WDS_SOCKET_HOST" -and $envContent -match "WDS_SOCKET_PORT") {
        Write-Host "PASS: Webpack configuration found in .env" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "FAIL: Missing WDS_SOCKET configuration in .env" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "FAIL: .env file not found" -ForegroundColor Red
    $testsFailed++
}

# Test 2: Check fs module import in start-dev.js
Write-Host "`n[TEST 2] fs Module Import" -ForegroundColor Yellow
Write-Host "Checking start-dev.js for fs require..." -ForegroundColor Gray

if (Test-Path "start-dev.js") {
    $startDevContent = Get-Content "start-dev.js" -Raw
    if ($startDevContent -like "*require('fs')*") {
        Write-Host "PASS: fs module properly imported" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "FAIL: fs module not imported" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "FAIL: start-dev.js not found" -ForegroundColor Red
    $testsFailed++
}

# Test 3: Check optional database handling in config-server.js
Write-Host "`n[TEST 3] Optional Target Scheduler Database Handling" -ForegroundColor Yellow
Write-Host "Checking config-server.js for graceful database fallback..." -ForegroundColor Gray

if (Test-Path "src\server\config-server.js") {
    $configServerContent = Get-Content "src\server\config-server.js" -Raw
    if ($configServerContent -like "*fs.existsSync*dbPath*" -and $configServerContent -like "*database not found*") {
        Write-Host "PASS: Graceful database fallback implemented" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "FAIL: Missing graceful database fallback logic" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "FAIL: config-server.js not found" -ForegroundColor Red
    $testsFailed++
}

# Test 4: Check README for correct git clone URL
Write-Host "`n[TEST 4] Git Clone URL Fix" -ForegroundColor Yellow
Write-Host "Checking README.md for correct repository URL..." -ForegroundColor Gray

if (Test-Path "README.md") {
    $readmeContent = Get-Content "README.md" -Raw
    if ($readmeContent -match "englishfox90/NINA\.WebControlPanel") {
        Write-Host "PASS: Correct git clone URL in README" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "FAIL: Git clone URL still shows 'yourusername'" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "FAIL: README.md not found" -ForegroundColor Red
    $testsFailed++
}

# Test 5: Check for Troubleshooting section
Write-Host "`n[TEST 5] Troubleshooting Documentation" -ForegroundColor Yellow
Write-Host "Checking README.md for troubleshooting section..." -ForegroundColor Gray

if (Test-Path "README.md") {
    $readmeContent = Get-Content "README.md" -Raw
    if ($readmeContent -match "Troubleshooting" -and $readmeContent -match "allowedHosts") {
        Write-Host "PASS: Comprehensive troubleshooting section added" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "FAIL: Missing troubleshooting documentation" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "FAIL: README.md not found" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "                    Test Summary                       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed
Write-Host "`nTests Passed: $testsPassed / $totalTests" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed / $totalTests" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })

if ($testsFailed -eq 0) {
    Write-Host "`nAll bug fixes verified! Ready for deployment." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Run 'npm start' to start development servers" -ForegroundColor Gray
    Write-Host "  2. Check console for clean startup (no errors/warnings)" -ForegroundColor Gray
    Write-Host "  3. Verify frontend loads at http://localhost:3000" -ForegroundColor Gray
    Write-Host "  4. Verify backend API at http://localhost:3001/api/config" -ForegroundColor Gray
} else {
    Write-Host "`nSome tests failed. Please review the errors above." -ForegroundColor Yellow
}

Write-Host ""

