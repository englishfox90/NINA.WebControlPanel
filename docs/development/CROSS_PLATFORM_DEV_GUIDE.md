# Cross-Platform Development Guide

This document addresses platform-specific issues and best practices when developing the Astro Observatory Dashboard across Windows, macOS, and Linux.

## 🚨 Common Platform Issues

### Terminal Command Execution

#### Windows PowerShell vs Command Line
**Issue**: PowerShell and Command Prompt have different syntax and behaviors.

**Solutions**:
- Use semicolon `;` instead of `&&` for command chaining in PowerShell
- PowerShell cmdlets are case-insensitive but prefer PascalCase
- Use `$env:VARIABLE` for environment variables instead of `$VARIABLE`

```powershell
# ✅ Correct for PowerShell
cd NINA.WebControlPanel; npm run server

# ❌ Incorrect for PowerShell (bash syntax)  
cd NINA.WebControlPanel && npm run server
```

#### macOS/Linux Bash
**Issue**: Different command structure and case sensitivity.

**Solutions**:
- Use `&&` for command chaining
- Commands and paths are case-sensitive
- Use `$VARIABLE` or `${VARIABLE}` for environment variables

```bash
# ✅ Correct for Bash
cd NINA.WebControlPanel && npm run server

# ❌ Incorrect for Bash (PowerShell syntax)
cd NINA.WebControlPanel; npm run server
```

### SQL Query Execution

#### SQLite Command Line Tools
**Windows Issues**:
- SQLite3 CLI not installed by default
- Different path separators (`\` vs `/`)
- PowerShell escaping issues with quotes

**Solutions**:
```powershell
# Use Node.js with better-sqlite3 instead of CLI
node -e "const db = require('better-sqlite3')('dashboard-config.sqlite'); console.log(db.prepare('SELECT * FROM dashboard_widgets').all()); db.close();"
```

**macOS/Linux**:
- SQLite3 usually pre-installed
- Standard Unix paths work fine

```bash
sqlite3 dashboard-config.sqlite "SELECT * FROM dashboard_widgets;"
```

### Database Management

#### Common SQL Syntax Errors
**Issue**: Invalid SQL syntax that appears to work but doesn't.

```sql
-- ❌ WRONG: ALTER TABLE IF NOT EXISTS (invalid syntax)
ALTER TABLE IF NOT EXISTS dashboard_widgets (
    id TEXT PRIMARY KEY,
    component TEXT NOT NULL
);

-- ✅ CORRECT: CREATE TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id TEXT PRIMARY KEY,
    component TEXT NOT NULL
);
```

### Server Management & API Testing

#### Terminal Session Management
**Issue**: Running server commands in the same terminal kills the server when making API calls.

**Problem Pattern**:
1. Start server: `node config-server.js` (server running in Terminal 1)
2. Test API in same terminal: `Invoke-RestMethod ...` (kills server)
3. Server stops, API call fails

**Solutions**:

**Windows PowerShell**:
```powershell
# Terminal 1 - Start server (keep this running)
node config-server.js

# Terminal 2 - Test API (separate window/tab)
Invoke-RestMethod -Uri "http://localhost:3001/api/config" -Method GET
```

**macOS/Linux**:
```bash
# Terminal 1 - Start server (keep running)
node config-server.js

# Terminal 2 - Test API  
curl http://localhost:3001/api/config
```

#### Background Process Management

**Windows**:
```powershell
# Start server in background
Start-Process node -ArgumentList "config-server.js" -WindowStyle Hidden

# Stop background processes
Get-Process -Name "node" | Stop-Process -Force
```

**macOS/Linux**:
```bash
# Start server in background
nohup node config-server.js &

# Stop background processes
pkill -f "node config-server.js"
```

## 🛠️ Platform-Specific Tools

### Package Management

**Windows**:
- **Node.js**: Download from nodejs.org or use `winget install OpenJS.NodeJS`
- **Git**: Download from git-scm.com or use `winget install Git.Git`

**macOS**:
- **Node.js**: Use Homebrew `brew install node` or download from nodejs.org
- **Git**: Pre-installed or `brew install git`

**Linux**:
- **Node.js**: Use package manager (`apt install nodejs npm`, `yum install nodejs`, etc.)
- **Git**: Usually pre-installed or via package manager

### File Paths

**Windows**:
- Use forward slashes `/` or escaped backslashes `\\\\` in code
- PowerShell accepts both `/` and `\\` for most commands
- Environment variable: `$env:APPDATA`

**macOS/Linux**:
- Always use forward slashes `/`
- Case-sensitive paths
- Environment variable: `$HOME`

## 🔧 Development Best Practices

### 1. Use Cross-Platform Node.js Scripts
Instead of platform-specific shell commands, use Node.js scripts:

```javascript
// setup-database.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dashboard-config.sqlite');
const db = new Database(dbPath);

// Cross-platform SQL execution
db.exec(`CREATE TABLE IF NOT EXISTS dashboard_widgets (...)`);
```

### 2. Environment Detection
```javascript
// detect-platform.js
const os = require('os');

const isWindows = os.platform() === 'win32';
const isMacOS = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

if (isWindows) {
    // Windows-specific code
} else if (isMacOS) {
    // macOS-specific code  
} else {
    // Linux/Unix-specific code
}
```

### 3. Use Package.json Scripts
Define cross-platform commands in `package.json`:

```json
{
  "scripts": {
    "start": "node config-server.js",
    "setup-db": "node setup-database.js", 
    "test-api": "node test-api.js",
    "dev": "concurrently \"npm run start\" \"npm run test-api\""
  }
}
```

### 4. Path Resolution
```javascript
// Always use path.join() for file paths
const path = require('path');

// ✅ Cross-platform
const dbPath = path.join(__dirname, 'dashboard-config.sqlite');

// ❌ Windows-only  
const dbPath = __dirname + '\\dashboard-config.sqlite';

// ❌ Unix-only
const dbPath = __dirname + '/dashboard-config.sqlite';
```

## 🐛 Common Debugging Issues

### "Cannot find module" Errors
1. Ensure `npm install` was run
2. Check if you're in the correct directory
3. Verify Node.js version compatibility

### Database Lock Errors
1. Close all database connections properly
2. Stop any running processes using the database
3. Use transactions for multiple operations

### API Connection Refused
1. Verify server is running in a separate terminal
2. Check the correct port (default: 3001)
3. Ensure firewall isn't blocking the connection

### Memory Issues
1. On Windows: Use Task Manager to check actual memory usage
2. On macOS: Use Activity Monitor (matches our corrected calculations)
3. On Linux: Use `htop` or `free -h`

## 📝 Testing Checklist

Before committing changes, test on your platform:

- [ ] Server starts without errors
- [ ] API endpoints respond correctly  
- [ ] Database operations complete successfully
- [ ] Widget configurations load properly
- [ ] No cross-platform syntax issues in terminal commands

## 🆘 Emergency Fixes

### Kill All Node Processes
**Windows**:
```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

**macOS/Linux**:
```bash
pkill -f node
```

### Reset Database
```bash
rm dashboard-config.sqlite
node setup-database.js
```

### Clear Node Modules
```bash
rm -rf node_modules package-lock.json
npm install
```

---

*This guide will be updated as new platform-specific issues are discovered during development.*
