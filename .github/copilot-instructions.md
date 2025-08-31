{
  "Response": "2025-07-20T09:43:44+02:00",
  "Error": "string",
  "StatusCode": 200,
  "Success": true,
  "Type": "API"
}# GitHub Copilot Instructions - Astro Observatory Dashboard

## Project Overview
This is a **production-ready full-stack astrophotography dashboard** for monitoring NINA (Nighttime Imaging 'N' Astronomy) equipment with React 18 + TypeScript + Radix UI + Express.js + SQLite.

## Critical Development Rules

### UI Framework - ALWAYS Use Radix UI
```tsx
// ✅ CORRECT - Use Radix components
import { Card, Button, Flex, Progress, Badge } from '@radix-ui/themes';
import { VideoIcon, GearIcon } from '@radix-ui/react-icons';

<Card>
  <Flex direction="column" gap="3">
    <Button variant="soft"><VideoIcon />Stream</Button>
    <Progress value={75} />
    <Badge color="green">Active</Badge>
  </Flex>
</Card>

// ❌ WRONG - Don't create custom CSS
<div className="custom-card">...</div>
```

### Icons - Use Radix Icons Only
```tsx
// ✅ CORRECT
import { DesktopIcon, ActivityLogIcon, VideoIcon } from '@radix-ui/react-icons';

// ❌ WRONG - Never use emojis or custom icons
const icon = "🖥️"; 
```

### TypeScript - Maintain Type Safety
```tsx
// ✅ CORRECT - Use centralized interface system
interface SystemStatus {
  cpu: { usage: number; temperature: number | null };
  memory: { total: number; used: number; usagePercent: number };
}

// Import from organized interface files (as of Aug 31, 2025)
import { NINAStatusProps, Equipment } from '../interfaces/nina';
import { WeatherResponse, SafetyBannerProps } from '../interfaces/weather';
import { ConfigData } from '../interfaces/config';
import { SessionData } from '../interfaces/session';
```

## 🛡️ **CRITICAL: Enhanced Backend Stability (August 2025)**
The backend has been completely overhauled for production reliability:
- **Memory Leak Prevention**: Events limited to 500 max, 4-hour cleanup cycles
- **WebSocket Health**: Heartbeat monitoring with auto-reconnection
- **Error Handling**: Graceful recovery prevents process crashes
- **Modular Architecture**: APIRoutes class with separated concerns
- **Process Monitoring**: Auto-restart capabilities with health checks

## 🔌 **WebSocket Connection Stability (August 31, 2025)**
Major improvements to WebSocket connection resilience for equipment state changes:
- **Equipment-Aware Reconnection**: 2s delays for equipment changes vs 5s for other issues
- **Connection Deduplication**: Prevents cascading failures during NINA equipment connects/disconnects
- **Frontend Stability**: 1-second stabilization delay prevents reconnection storms
- **Unified Architecture**: Single WebSocket connection eliminates duplicate event processing
- **Production Tested**: Handles FOCUSER-CONNECTED/DISCONNECTED events gracefully without connection loss

## Current Architecture Status

### ✅ Enhanced Components (ALL PRODUCTION READY)
- `SystemStatusWidget.tsx` - Real-time cross-platform monitoring ✅ WORKING
- `NINAStatus.tsx` - Live equipment status monitoring with 25+ endpoints ✅ WORKING
- `TargetSchedulerWidget.tsx` - Live project progress from SQLite database ✅ WORKING  
- `SessionWidget.tsx` - WebSocket-based real-time session tracking ✅ WORKING
- `TimeAstronomicalWidget.tsx` - Live twilight phases and moon calculations ✅ WORKING
- `RTSPViewer.tsx` - Live video streams with enhanced UX ✅ WORKING
- `ImageViewer.tsx` - Real-time NINA image display ✅ WORKING
- `Settings.tsx` - Database-backed configuration ✅ WORKING
- `Dashboard.tsx` - Main layout with modular widget system ✅ WORKING

### ✅ Interface Architecture (August 31, 2025 - REORGANIZED)
Complete TypeScript interface consolidation with 700+ lines organized across specialized files:
- `src/client/src/interfaces/nina.ts` - NINA-specific operations (135+ lines)
- `src/client/src/interfaces/weather.ts` - Weather and safety monitoring (67 lines)
- `src/client/src/interfaces/config.ts` - Configuration management (enhanced)
- `src/client/src/interfaces/dashboard.ts` - UI component props and layouts
- `src/client/src/interfaces/equipment.ts` - Core equipment definitions
- `src/client/src/interfaces/session.ts` - Session management and tracking
- `src/client/src/interfaces/system.ts` - System monitoring interfaces
- `src/client/src/interfaces/websocket.ts` - WebSocket event types
- `src/client/src/interfaces/index.ts` - Unified exports for clean imports

### Backend APIs Enhanced (25+ Endpoints)
```typescript
// Configuration (Enhanced)
GET/POST /api/config
GET /api/config/health         // Health check endpoint
GET /api/config/export         // Configuration export
POST /api/config/import        // Configuration import
GET /api/config/stats          // Database statistics

// System Monitoring (Enhanced)
GET /api/system/status
GET /api/system/cpu
GET /api/system/memory
GET /api/system/disk
GET /api/system/network
GET /api/system/uptime          // System uptime info

// Target Scheduler (Enhanced)
GET /api/scheduler/progress     // Project progress overview
GET /api/scheduler/project/:id  // Individual project details  
GET /api/scheduler/status       // Current/next target status
GET /api/scheduler/activity     // Recent imaging activity

// NINA Equipment APIs (Comprehensive - 25+ endpoints)
GET /api/nina/equipment         // Live equipment status monitoring
GET /api/nina/status            // NINA connection status
GET /api/nina/flat-panel        // Flat panel safety monitoring
GET /api/nina/weather           // Weather station data
GET /api/nina/session           // Complete session data with images
GET /api/nina/image-history     // Image acquisition history
GET /api/nina/latest-image      // Most recent captured image
GET /api/nina/camera            // Camera information and settings
GET /api/nina/event-history     // NINA event stream history
GET /api/nina/session-state     // Current session state analysis
POST /api/nina/session-state/refresh // Manual session refresh

// Astronomical Data (Enhanced)
GET /api/time/astronomical      // Time zones, sun/moon data, twilight

// Dashboard Management (Enhanced)
GET /api/dashboard-widgets      // Widget configuration
POST /api/dashboard-widgets     // Create new widget
PUT /api/dashboard-widgets/layout // Bulk layout updates
PUT /api/dashboard-widgets/:id  // Update specific widget
DELETE /api/dashboard-widgets/:id // Remove widget
```

## Platform-Specific Critical Knowledge

### macOS Memory Reporting Fix (IMPLEMENTED)
```javascript
// ✅ This fix is already implemented in systemMonitor.js
// DON'T modify unless there are accuracy issues
if (platform === 'darwin') {
  // macOS: Use active memory * 3.2x for accuracy
  usedGB = activeMemory * 3.2;
} else if (platform === 'win32') {
  // Windows: Direct values are accurate
  usedGB = mem.used / (1024**3);
}
```

## Development Patterns

### API Integration Pattern
```typescript
// Follow this pattern for new API integrations
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/api/endpoint');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Mobile-First Responsive Design
```tsx
// ✅ Radix handles responsive automatically
<Flex direction={{ initial: 'column', md: 'row' }} gap="3">
  {/* Content adapts automatically */}
</Flex>

// ❌ Don't write custom media queries
@media (max-width: 768px) { ... }
```

## Configuration Files

### Database Configuration
```javascript
// All settings stored in SQLite database: src/server/dashboard-config.sqlite
// Access via ConfigDatabase class:
const { ConfigDatabase } = require('./src/server/configDatabase.js');
const db = new ConfigDatabase();
const config = db.getConfig(); // Get all settings

// Web API endpoints:
// GET /api/config - Get current configuration
// POST /api/config - Update configuration values
```

## Common Tasks & Solutions

### Adding New System Monitoring Metrics
```typescript
// Add to systemMonitor.js following existing patterns
async getNewMetric() {
  return this.getCachedData('newMetric', async () => {
    // Implementation with 2-second cache
    const data = await si.someFunction();
    return processedData;
  });
}
```

### NINA API Integration (High Priority)
```typescript
// Pattern for NINAStatus.tsx enhancement
const ninaApiUrl = `${config.nina.baseUrl}:${config.nina.apiPort}`;

// Use existing ninaApi.ts service
import { getNINAStatus } from '../services/ninaApi';
```

### Error Handling Pattern
```tsx
if (loading) return <Spinner />;
if (error) return <Callout.Root color="red">{error}</Callout.Root>;
if (!data) return null;
```

## File Structure Reference
```
NINA.WebControlPanel/
├── src/
│   ├── client/              # React frontend
│   │   ├── src/
│   │   │   ├── components/  # 9/9 components implemented
│   │   │   ├── services/    # Frontend API integration
│   │   │   ├── types/       # TypeScript definitions
│   │   │   └── styles/      # Radix UI + minimal CSS
│   │   └── package.json     # Frontend dependencies
│   └── server/              # Express backend
│       ├── config-server.js # Main API server (port 3001)
│       ├── systemMonitor.js # Cross-platform monitoring
│       ├── configDatabase.js # Database operations
│       └── services/        # Backend services
├── docs/                    # ALL documentation (organized)
├── scripts/                 # Utility scripts (organized by category)
│   ├── database/           # Database utilities
│   ├── development/        # Dev utilities
│   └── deployment/         # Deployment scripts
├── tests/                  # Test files
├── resources/              # Development resources (gitignored)
│   ├── schedulerdb.sqlite  # Target scheduler database
│   └── samples/            # Sample files
└── config.json             # Main configuration
```

## Testing & Validation
- Enhanced development: `npm start` (unified React + Express with stability)
- Stability monitoring: `npm run start:stable` (auto-restart on crashes)
- Frontend: http://localhost:3000 
- Backend API: http://localhost:3001
- Health check: `curl http://localhost:3001/api/config/health`
- System monitoring: `curl http://localhost:3001/api/system/status`
- NINA equipment: `curl http://localhost:3001/api/nina/equipment`
- Real-time monitoring: `npm run monitor`

## Enhanced Development Commands
```bash
# Stability-enhanced development
npm run start:stable         # Auto-restart with monitoring
npm run monitor             # Real-time health monitoring
npm run health              # Backend health check
npm run fix-backend         # Apply stability fixes
```

## What NOT to Do
- ❌ Don't modify production-ready components without specific request
- ❌ Don't use custom CSS when Radix components exist  
- ❌ Don't modify platform-specific memory calculations (macOS fix implemented)
- ❌ Don't modify SessionStateManager.fixed.js (stability fixes applied)
- ❌ **NEVER create new .md files** - Update existing documentation only
- ❌ Don't create files like FEATURE_COMPLETE.md, INTEGRATION_DONE.md
- ❌ Don't duplicate documentation across multiple files
- ❌ Don't break existing stability improvements or error handling

## Repository Cleanliness Rules

### 🧹 **NEVER Create Scripts in Root Directory**
```bash
# ❌ WRONG - Don't create temporary files in root
./debug-script.js
./test-database.js
./update-config.js

# ✅ CORRECT - Use organized locations
./scripts/debug/debug-script.js
./scripts/database/test-database.js
./scripts/database/update-config.js
```

### 📂 **Proper Script Organization**
- **Database scripts**: `scripts/database/`
- **Debug/testing**: `scripts/debug/` 
- **Development utilities**: `scripts/development/`
- **Deployment scripts**: `scripts/deployment/`

### 🚮 **Always Clean Up Temporary Files**
```javascript
// At the end of any temporary script creation:
// 1. Test the functionality
// 2. Apply the changes
// 3. DELETE the temporary script files
console.log('🧹 Cleaning up temporary files...');
// Remove temporary files immediately after use
```

### 🎯 **Clean Root Directory Policy**
**The root directory should ONLY contain:**
- Package files (`package.json`, `package-lock.json`)
- Configuration files (`config.json`, `.gitignore`, `README.md`)
- Essential startup scripts (`start-dev.js`)
- Organized folders (`src/`, `docs/`, `scripts/`, `tests/`, `resources/`)

**NEVER leave temporary files in root after development tasks!**

## Documentation Management
**When making changes, update existing .md files:**
- **Feature updates**: Update `AGENTS.md` directly
- **User features**: Update `README.md`  
- **Widget patterns**: Update `WIDGET_FORMAT_STANDARD.md`
- **Database schema**: Update `TARGET_SCHEDULER_DATABASE.md`

**Always update "Last Updated" timestamps in modified files.**
- ❌ Don't break TypeScript compilation
- ❌ Don't modify platform-specific memory calculations
- ❌ Don't use emojis instead of Radix icons

## Priority Tasks for NINA Integration
1. Connect NINAStatus.tsx to live API (http://172.26.81.152:1888)
2. Implement live image directory scanning in ImageViewer.tsx  
3. ✅ **Target Scheduler Integration COMPLETE** - Production-ready observatory automation monitoring
   - Real-time project progress from SQLite database with 4 API endpoints
   - Professional hover cards with filter breakdowns and integration time tracking
   - Fixed data accuracy issues (excluded deleted exposure templates)
   - Widget integrated directly into Dashboard.tsx with manual refresh only
4. Add advanced NINA equipment controls

When implementing these, follow the established patterns and maintain the production-ready architecture.

---

## 📋 Documentation Sync Notice

**This file is synced with `AGENTS.md`** - the comprehensive AI agent guide.

**🔄 Sync Process:**
- Run `./sync-docs.sh` to auto-sync timestamps and status
- Manually sync critical changes: component status, priorities, new patterns
- Both files should reflect the same project state but with different detail levels

**⚠️ Critical Sync Points:**
- Component completion status changes (✅🚧❌)
- New platform-specific fixes (especially macOS memory calculations)  
- Priority task updates (🔴🟡🟢)
- New API endpoints or patterns
- Development rule changes
- Interface architecture updates and WebSocket stability improvements

*Last Updated: August 31, 2025 at 08:45 - WebSocket Connection Stability & Interface Architecture Complete*
