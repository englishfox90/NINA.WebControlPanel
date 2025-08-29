# Windows Development Scripts

This directory contains Windows-specific scripts to start the NINA Web Control Panel development environment.

## Available Scripts

### `start-dev.bat` (Recommended)
Simple batch file that starts both backend and frontend servers.

**Usage:**
```cmd
# Double-click the file or run from command prompt
start-dev.bat
```

**Features:**
- Automatically kills existing processes on ports 3000 and 3001
- Starts backend API server (Node.js) on port 3001
- Starts frontend React app on port 3000
- Simple and reliable

### `start-dev.ps1` 
Advanced PowerShell script with better process management and colored output.

**Usage:**
```powershell
# Run from PowerShell
.\start-dev.ps1
```

**Features:**
- Colored console output with emojis
- Advanced process management
- Better error handling
- Automatic cleanup on Ctrl+C

## Manual Setup (Alternative)

If the scripts don't work, you can start the servers manually:

### Terminal 1 - Backend API Server
```cmd
node config-server.js
```

### Terminal 2 - Frontend React App  
```cmd
npm start
```

## Ports Used

- **Frontend (React)**: http://localhost:3000
- **Backend (API)**: http://localhost:3001
- **NINA API Proxy**: Configured to connect to NINA at http://172.26.81.152:1888

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors, the scripts will try to automatically kill existing processes. If this fails:

```cmd
# Kill processes manually
netstat -ano | findstr :3000
netstat -ano | findstr :3001
taskkill /f /pid <PID_NUMBER>
```

### Permission Issues with PowerShell
If the PowerShell script won't run due to execution policy:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Equivalent Linux/macOS Script

For comparison, the equivalent bash script is available as `start-dev.sh` for Linux/macOS users.
