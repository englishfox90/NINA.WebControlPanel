# Configuration Guide

## Database-Driven Configuration System

NINA Web Control Panel uses a SQLite database for all configuration management. This provides better reliability, transaction safety, and API integration compared to JSON files.

## Configuration Database Location

```
src/server/dashboard-config.sqlite
```

## Accessing Configuration

### 1. Web API (Recommended)

```bash
# Get current configuration
curl http://localhost:3001/api/config

# Update specific settings
curl -X POST http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "nina.baseUrl": "http://172.26.81.152/",
    "nina.apiPort": 1888,
    "directories.capturedImagesDirectory": "D:/Observatory/Captured"
  }'

# Export configuration backup
curl http://localhost:3001/api/config/export > backup.json

# Import configuration
curl -X POST http://localhost:3001/api/config/import \
  -H "Content-Type: application/json" \
  -d @backup.json
```

### 2. Dashboard Settings Panel

1. Open http://localhost:3000
2. Click the Settings gear icon
3. Update values in the UI
4. Changes are saved automatically to the database

### 3. Direct Database Access (Advanced)

```javascript
const { ConfigDatabase } = require('./src/server/configDatabase.js');

const db = new ConfigDatabase();

// Get all configuration
const config = db.getConfig();

// Set individual values
db.setConfigValue('nina.baseUrl', 'http://192.168.1.100/', 'nina');
db.setConfigValue('streams.liveFeed1', 'rtsp://camera/stream', 'streams');

// Get individual values with defaults
const ninaUrl = db.getConfigValue('nina.baseUrl', 'http://localhost/');
```

## Configuration Categories

### NINA Integration
```javascript
{
  "nina": {
    "apiPort": 1888,
    "baseUrl": "http://172.26.81.152/",
    "timeout": 5000,
    "retryAttempts": 3
  }
}
```

### Directory Paths
```javascript
{
  "directories": {
    "capturedImagesDirectory": "D:/Observatory/Captured",
    "liveStackDirectory": "D:/Observatory/LiveStacks",
    "logsDirectory": "./logs"
  }
}
```

### Video Streams
```javascript
{
  "streams": {
    "liveFeed1": "https://live.starfront.tools/allsky/",
    "liveFeed2": "https://live.starfront.tools/b8/",
    "defaultStream": 1,
    "connectionTimeout": 10000
  }
}
```

### Observatory Location
```javascript
{
  "observatory": {
    "name": "My Remote Observatory",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.006,
      "elevation": 100,
      "timezone": "America/New_York"
    }
  }
}
```

### Dashboard Settings
```javascript
{
  "dashboard": {
    "refreshInterval": 5000,
    "theme": "dark",
    "mobileOptimized": true,
    "autoRefresh": true
  }
}
```

## Migration from config.json

If you previously used a `config.json` file, the configuration has been automatically migrated to the database. The database provides:

- ✅ **Transaction Safety**: No partial writes or corruption
- ✅ **API Integration**: RESTful configuration management  
- ✅ **Backup/Restore**: Built-in export/import functionality
- ✅ **Type Safety**: Proper validation and defaults
- ✅ **Performance**: Faster access and caching

## Troubleshooting

### Reset Configuration
```bash
# Reset to defaults (this will recreate the database)
rm src/server/dashboard-config.sqlite
# Restart the server to regenerate with defaults
```

### Backup Configuration
```bash
# Create backup
curl http://localhost:3001/api/config/export > config-backup-$(date +%Y%m%d).json
```

### Restore Configuration
```bash
# Restore from backup
curl -X POST http://localhost:3001/api/config/import \
  -H "Content-Type: application/json" \
  -d @config-backup-20250830.json
```

### Validate Configuration
```bash
# Check configuration health
curl http://localhost:3001/api/config/health
```

---

*Last Updated: August 30, 2025*
*Database-first configuration system implemented*
