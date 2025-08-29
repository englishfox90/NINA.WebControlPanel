@echo off
REM NINA Web Control Panel - Development Startup Script (Windows)
REM This script starts both the backend API server and frontend React app

echo 🌟 Starting NINA Web Control Panel...
echo ==================================

REM Kill any existing processes on these ports
echo 🔧 Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find "3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find "3001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo 🚀 Starting backend API server (port 3001)...
start /b node config-server.js

timeout /t 2 >nul

echo 🚀 Starting frontend React app (port 3000)...
start /b npm start

timeout /t 3 >nul

echo.
echo 🎉 NINA Web Control Panel is starting up!
echo ==================================
echo 📊 Backend API:  http://localhost:3001
echo 🌐 Frontend App: http://localhost:3000
echo 🎥 Live Feeds:   Configured and ready
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Keep the script running
pause
