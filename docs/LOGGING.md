# Logging System Documentation

## Overview
NINA WebControlPanel includes a comprehensive logging system with automatic 7-day log rotation to help troubleshoot issues without cluttering disk space.

## Log Files Location
```
logs/
├── backend-2025-11-29.log          # Backend server logs
├── backend-startup-2025-11-29.log  # Backend startup logs
├── frontend-startup-2025-11-29.log # Frontend build logs
└── build-2025-11-29.log            # Build process logs
```

## Quick Start

### Enable Comprehensive Logging
```bash
# Start with file logging enabled
npm run start:logged
```

This creates separate log files for:
- Backend server operations
- Frontend build process
- API requests and responses
- Error stack traces
- WebSocket events

### View Logs in Real-Time
```bash
# View all logs
npm run logs

# View specific service logs
npm run logs:backend
npm run logs:frontend

# Using PowerShell script (more options)
.\scripts\monitoring\view-logs.ps1 -Type backend -Follow
.\scripts\monitoring\view-logs.ps1 -Type latest -Lines 100
```

### Clean Old Logs
```bash
# Delete all log files
npm run logs:clean

# Or use interactive script
.\scripts\monitoring\view-logs.ps1 -Clean
```

## Log Formats

### Backend Logs
```
[2025-11-29T16:30:45.123Z] [INFO ] [backend] 🔧 Initializing services...
[2025-11-29T16:30:45.456Z] [INFO ] [backend] GET /api/config - 200 (45ms)
[2025-11-29T16:30:50.789Z] [ERROR] [backend] Database connection failed | {"error":"ENOENT"}
```

### Frontend Logs
```
[2025-11-29T16:30:45.123Z] Compiled successfully!
[2025-11-29T16:30:45.456Z] webpack compiled with 1 warning
[2025-11-29T16:30:50.789Z] [ERROR] Failed to fetch: /api/nina/status
```

## Log Levels

### INFO
Normal operational messages:
- Server startup
- Successful API calls
- Configuration changes
- Service initialization

### WARN
Warning conditions that should be investigated:
- Deprecated API usage
- Missing optional configuration
- Slow API responses (>1000ms)
- Retry attempts

### ERROR
Error conditions requiring attention:
- Failed API calls
- Database errors
- WebSocket disconnections
- Unhandled exceptions

### DEBUG
Detailed diagnostic information (only when DEBUG=true):
- Request/response payloads
- WebSocket message details
- Internal state changes
- Performance metrics

## Automatic Log Rotation

### How It Works
1. **Daily Rollover**: New log file created each day at midnight
2. **7-Day Retention**: Logs older than 7 days are automatically deleted
3. **No Manual Cleanup**: System manages disk space automatically

### File Naming Convention
```
{service}-{YYYY-MM-DD}.log
```

Examples:
- `backend-2025-11-29.log`
- `frontend-startup-2025-11-22.log`

## Advanced Usage

### PowerShell Log Viewer

#### View Latest Logs
```powershell
.\scripts\monitoring\view-logs.ps1 -Type latest -Lines 50
```

#### Follow Backend Logs in Real-Time
```powershell
.\scripts\monitoring\view-logs.ps1 -Type backend -Follow
```

#### View Specific Service with Custom Line Count
```powershell
.\scripts\monitoring\view-logs.ps1 -Type frontend -Lines 200
```

#### Clean All Logs Interactively
```powershell
.\scripts\monitoring\view-logs.ps1 -Clean
```

### Programmatic Access

#### Using Logger in Your Code
```javascript
const { getBackendLogger } = require('./utils/logger');

const logger = getBackendLogger();

// Log levels
logger.info('Service started successfully');
logger.warn('Configuration missing, using defaults');
logger.error('Failed to connect to database', { error: err.message });
logger.debug('Detailed state information', { state: currentState });

// Log HTTP requests
logger.request('GET', '/api/config', 200, 45);

// Log API calls
logger.api('/api/nina/status', 'GET', 200, 120);
logger.api('/api/nina/status', 'GET', 500, 5000, new Error('Timeout'));
```

## Troubleshooting Common Issues

### Issue: Logs Not Being Created

**Check:**
1. Ensure `logs/` directory exists (auto-created on startup)
2. Verify file permissions (should have write access)
3. Check disk space availability

**Solution:**
```bash
# Manually create logs directory
mkdir logs

# Verify permissions (Windows)
icacls logs /grant Everyone:(OI)(CI)F
```

### Issue: Log Files Growing Too Large

**Check:**
1. Verify log rotation is working (files should be dated)
2. Check if DEBUG mode is accidentally enabled
3. Look for infinite loops or excessive logging

**Solution:**
```bash
# Clean logs immediately
npm run logs:clean

# Check log file sizes
Get-ChildItem logs -Recurse | Select-Object Name, Length, LastWriteTime

# Disable DEBUG mode if enabled
# Remove DEBUG=true from environment variables
```

### Issue: Cannot View Logs on Windows

**Check:**
1. Ensure PowerShell execution policy allows scripts
2. Verify PowerShell version (5.1+ required)

**Solution:**
```powershell
# Check execution policy
Get-ExecutionPolicy

# Set execution policy (if needed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Check PowerShell version
$PSVersionTable.PSVersion
```

### Issue: Missing Startup Logs

**Check:**
1. Using `npm run start:logged` instead of `npm start`
2. Verify log streams are being created

**Solution:**
```bash
# Use logged startup command
npm run start:logged

# Verify logs are being written
Get-ChildItem logs | Sort-Object LastWriteTime -Descending
```

## Best Practices

### During Development
```bash
# Use standard startup for normal development
npm start

# Enable logging when investigating issues
npm run start:logged

# Follow logs in separate terminal
npm run logs:backend
```

### During Troubleshooting
```bash
# Start with comprehensive logging
npm run start:logged

# In separate terminal, follow all logs
npm run logs

# Reproduce the issue
# Review logs for errors

# Export logs for sharing
Get-Content logs/backend-*.log | Out-File issue-report.txt
```

### For Bug Reports
When reporting issues, include:
1. Relevant log excerpts (last 50-100 lines)
2. Timestamps of when issue occurred
3. Any error stack traces
4. Configuration (sanitized, no passwords)

Example export:
```powershell
# Export last 100 lines of all logs
Get-Content logs/*.log -Tail 100 | Out-File bug-report-logs.txt
```

## Log File Structure

### Backend Server Log
```
[Timestamp] [Level] [Service] Message | Metadata

Example:
[2025-11-29T16:30:45.123Z] [INFO ] [backend] GET /api/config - 200 (45ms)
[2025-11-29T16:30:50.789Z] [ERROR] [backend] Database error | {"table":"config","error":"SQLITE_BUSY"}
```

### Startup Logs
```
[Timestamp] Service message

Example:
[2025-11-29T16:30:45.123Z] [BACKEND] 🔧 Initializing services...
[2025-11-29T16:30:45.456Z] [FRONTEND] Compiled successfully!
```

## Performance Impact

### Disk Space
- **Average log size**: ~500 KB/day per service
- **7-day retention**: ~3.5 MB total (3 services × 7 days)
- **Minimal impact**: Auto-cleanup prevents accumulation

### CPU/Memory
- **Logging overhead**: <1% CPU, <10 MB RAM
- **File I/O**: Async writes, non-blocking
- **Buffered streams**: Efficient disk writes

## Integration with Monitoring

### Health Check
```bash
# Check backend health (includes log status)
npm run health
```

### Backend Monitor
```bash
# Real-time monitoring with log analysis
npm run monitor
```

## Future Enhancements

Planned features:
- [ ] Log aggregation dashboard
- [ ] Search/filter logs by keyword
- [ ] Export logs as JSON/CSV
- [ ] Email alerts for critical errors
- [ ] Integration with external log services

---

**Last Updated**: November 29, 2025
**Version**: 1.0
**Maintenance**: Logs are automatically managed - no manual intervention needed
