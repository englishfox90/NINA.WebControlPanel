# NINA Web Control Panel - Development Startup Script (Windows)
# This script starts both the backend API server and frontend React app

Write-Host "🌟 Starting NINA Web Control Panel..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        foreach ($processId in $processes) {
            if ($processId) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "🔧 Killed process $processId on port $Port" -ForegroundColor Yellow
            }
        }
    } catch {
        # Port not in use, continue
    }
}

# Kill any existing processes on these ports
Write-Host "🔧 Cleaning up existing processes..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 3001

# Function to handle cleanup on script exit
function Stop-Servers {
    Write-Host "`n🛑 Shutting down servers..." -ForegroundColor Red
    if ($BackendProcess -and !$BackendProcess.HasExited) {
        $BackendProcess.Kill()
    }
    if ($FrontendProcess -and !$FrontendProcess.HasExited) {
        $FrontendProcess.Kill()
    }
    Stop-ProcessOnPort -Port 3000
    Stop-ProcessOnPort -Port 3001
    exit 0
}

# Set up Ctrl+C handling
[Console]::CancelKeyPress += {
    Stop-Servers
}

try {
    # Start backend API server
    Write-Host "🚀 Starting backend API server (port 3001)..." -ForegroundColor Green
    Set-Location "../../src/server"
    $BackendProcess = Start-Process -FilePath "node" -ArgumentList "config-server.js" -NoNewWindow -PassThru
    
    # Wait a moment for backend to start
    Start-Sleep -Seconds 2
    
    # Check if backend started successfully
    if (!$BackendProcess.HasExited) {
        Write-Host "✅ Backend API server started successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start backend API server" -ForegroundColor Red
        exit 1
    }
    
    # Start frontend React app
    Write-Host "🚀 Starting frontend React app (port 3000)..." -ForegroundColor Green
    Set-Location "../../src/client"
    $FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru
    
    # Wait a moment for frontend to start
    Start-Sleep -Seconds 3
    
    Write-Host ""
    Write-Host "🎉 NINA Web Control Panel is starting up!" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "📊 Backend API:  http://localhost:3001" -ForegroundColor White
    Write-Host "🌐 Frontend App: http://localhost:3000" -ForegroundColor White
    Write-Host "🎥 Live Feeds:   Configured and ready" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
    Write-Host ""
    
    # Keep the script running and wait for user input
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if processes are still running
        if ($BackendProcess.HasExited) {
            Write-Host "❌ Backend process has stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        if ($FrontendProcess.HasExited) {
            Write-Host "❌ Frontend process has stopped unexpectedly" -ForegroundColor Red
            break
        }
    }
    
} catch {
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Stop-Servers
}
