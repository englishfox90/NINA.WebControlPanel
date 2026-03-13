@echo off
REM Windows-specific startup script for NINA WebControlPanel
REM Sets environment variables that .env files sometimes don't work for on Windows

echo Starting NINA WebControlPanel for Windows...

REM Set webpack dev server environment variables
set WDS_SOCKET_HOST=localhost
set WDS_SOCKET_PORT=3000
set DISABLE_ESLINT_PLUGIN=true

REM Start the application after forcing absolute paths to work around sequencer powerup limitation
SET scriptpath=%~dp0
start cmd /K "cd %scriptpath:~0,-1% && node start-dev.js"
