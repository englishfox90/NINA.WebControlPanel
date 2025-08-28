# GitHub Copilot Instructions - Astro Observatory Dashboard

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
// ✅ CORRECT - Use existing types
interface SystemStatus {
  cpu: { usage: number; temperature: number | null };
  memory: { total: number; used: number; usagePercent: number };
}

// Import existing types from src/types/
import { NINAStatus, DashboardConfig } from '../types';
```

## Current Architecture Status

### ✅ Completed Components (DON'T MODIFY UNLESS REQUESTED)
- `SystemStatusWidget.tsx` - Real-time cross-platform monitoring ✅ WORKING
- `TargetSchedulerWidget.tsx` - Live project progress from SQLite database ✅ WORKING
  - Integrated directly into Dashboard.tsx (no separate component file)
  - Features: Interactive hover cards, integration time calculations, manual refresh only
  - Database: Direct connection to schedulerdb.sqlite with 4 API endpoints
  - UI: Professional progress bars, priority badges, filter breakdowns
- `RTSPViewer.tsx` - Live video streams with enhanced UX ✅ WORKING  
- `Dashboard.tsx` - Main layout with API integration ✅ WORKING
- `Settings.tsx` - Database-backed configuration ✅ WORKING

### 🚧 Ready for Enhancement
- `NINAStatus.tsx` - Mock data, ready for NINA API (port 1888)
- `ImageViewer.tsx` - Mock data, ready for directory scanning

### Backend APIs Available
```typescript
// Configuration
GET/POST /api/config
GET/POST /api/widgets

// System Monitoring (WORKING)
GET /api/system/status
GET /api/system/cpu  
GET /api/system/memory
GET /api/system/disk
GET /api/system/network

// Target Scheduler (WORKING)
GET /api/scheduler/progress    // Project progress overview
GET /api/scheduler/project/:id // Individual project details  
GET /api/scheduler/status      // Current/next target status
GET /api/scheduler/activity    // Recent imaging activity
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

### config.json Structure
```json
{
  "nina": { "apiPort": 1888, "baseUrl": "http://172.26.81.152/" },
  "streams": {
    "liveFeed1": "https://live.starfront.tools/allsky/",
    "liveFeed2": "https://live.starfront.tools/b8/"
  },
  "directories": {
    "capturedImagesDirectory": "D:/Observatory/Captured"
  }
}
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
src/
├── components/          # 9/9 components implemented
├── services/           # API integration layer
├── types/              # TypeScript definitions  
├── styles/             # Radix UI + minimal CSS
config-server.js        # Express backend (port 3001)
systemMonitor.js        # Cross-platform monitoring
```

## Testing & Validation
- Start both servers: `./start-dev.sh`
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Test system monitoring: `curl http://localhost:3001/api/system/status`

## What NOT to Do
- ❌ Don't modify SystemStatusWidget.tsx (production-ready)
- ❌ Don't use custom CSS when Radix components exist
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

*Last Synced: August 29, 2025 at 11:35
