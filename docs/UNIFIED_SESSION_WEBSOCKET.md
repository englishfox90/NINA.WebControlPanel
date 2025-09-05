# Unified Session WebSocket System

**Last Updated:** September 4, 2025  
**Status:** Production Ready ✅

## Overview

The **Unified Session System** is a complete rewrite of session management that provides real-time astrophotography session data through a single WebSocket connection. This system replaces all previous session management implementations and provides a clean, modular architecture for tracking NINA equipment states, session progress, and safety monitoring.

## Key Features

- ✅ **Always-On Event Capture**: Backend captures NINA WebSocket events 24/7 regardless of frontend connections
- ✅ **Unified Data Model**: Single WebSocket message type (`unifiedSession`) contains all session data  
- ✅ **Real-time Updates**: Immediate WebSocket broadcasts when session state changes
- ✅ **Persistent State**: SQLite database maintains session state across server restarts
- ✅ **Modular Architecture**: 5-component system for maintainability and scalability
- ✅ **Event Processing**: Batch processing of historical events for state reconstruction
- ✅ **Safety Monitoring**: Real-time safety state tracking with proper event handling

## WebSocket Connection

### Frontend Connection
```javascript
// Connect to unified session stream
const ws = new WebSocket('ws://localhost:3001/ws/unified');

ws.onopen = () => {
  console.log('Connected to unified session stream');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'connection':
      // Initial connection confirmation
      console.log('Connection established:', message.data.message);
      break;
      
    case 'unifiedSession':
      // Main session data updates
      handleSessionUpdate(message.data);
      break;
      
    case 'heartbeat':
      // Keep-alive messages (every 20 seconds)
      break;
  }
};
```

### Initial Session Data
Upon connection, clients immediately receive:
1. **Connection message**: Confirms WebSocket connection established
2. **Initial unifiedSession message**: Current session state from database

## Unified Session Message Format

The `unifiedSession` WebSocket message contains all session data in a single, comprehensive object:

```json
{
  "type": "unifiedSession",
  "timestamp": "2025-09-04T12:34:56.789Z",
  "data": {
    "session_id": "session_12345",
    "target_name": "Barnard 160",
    "target_coordinates": {
      "ra": "18h 02m 45s",
      "dec": "+07° 08' 30\""
    },
    "session_state": "active",
    "start_time": "2025-09-04T01:30:00.000Z",
    "end_time": null,
    "duration": 39600,
    "is_safe": 1,
    "safety_timestamp": "2025-09-04T19:30:00.000Z",
    "is_guiding": 1,
    "guiding_state": "Guiding",
    "guiding_rms": 1.08,
    "current_filter": "Luminance",
    "filter_timestamp": "2025-09-04T08:15:00.000Z",
    "total_images": 45,
    "exposure_time": 300,
    "camera_temperature": -10.5,
    "recent_events": [
      {
        "eventType": "IMAGE-SAVED",
        "timestamp": "2025-09-04T12:33:45.000Z",
        "ImagePath": "/path/to/image.fits",
        "FilterName": "Luminance"
      }
    ],
    "session_stats": {
      "total_exposure_time": 13500,
      "images_per_filter": {
        "Luminance": 30,
        "Red": 8,
        "Green": 7
      }
    }
  }
}
```

## Backend Architecture

### Always-On Event Processing ✅

**CONFIRMED**: The backend captures NINA WebSocket events continuously, regardless of frontend connections. This ensures:

- Database always contains the latest session state
- No data loss when frontend clients disconnect
- Immediate session data available when clients reconnect
- Complete event history preserved for analysis

### Modular Components

1. **UnifiedSessionManager**: Main orchestrator and public API
2. **SessionInitializer**: Startup, historical event seeding, WebSocket connection
3. **SessionEventHandler**: Live WebSocket event processing
4. **SessionStateManager**: Database state persistence and retrieval  
5. **SessionStatsManager**: Session statistics and analytics

### Database Schema

**session_events table**: Rolling 20 most recent events
```sql
CREATE TABLE session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**session_state table**: Current session state
```sql
CREATE TABLE session_state (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  target_name TEXT,
  target_coordinates TEXT,
  session_state TEXT,
  start_time TEXT,
  end_time TEXT,
  duration INTEGER,
  is_safe INTEGER,
  safety_timestamp TEXT,
  is_guiding INTEGER,
  current_filter TEXT,
  total_images INTEGER,
  exposure_time INTEGER,
  camera_temperature REAL,
  session_data TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Widget Integration TODOs

### ✅ **COMPLETED: Task 1 - Guider Widget Migration**

**COMPLETED** ✅ (September 4, 2025)
- ✅ Modified GuiderService to use unified WebSocket session updates instead of separate connection
- ✅ Updated `/api/nina/session-state` endpoint to return unified session format with `isGuiding` field
- ✅ GuiderService now bootstraps initial state from API, then listens to WebSocket for real-time updates
- ✅ Eliminated redundant WebSocket connection - GuiderService uses single unified connection
- ✅ Enhanced error handling and debug logging for session state detection
- ✅ Guider graph now polls API every ~3 seconds when `isGuiding: true` from unified session

**Key Learning**: The bootstrap pattern is essential - widgets must:
1. **Load initial state** from API endpoint during initialization  
2. **Listen for updates** via WebSocket unified session messages
3. **Use same data format** between API and WebSocket for consistency

### ✅ **COMPLETED: Task 2 - Recent Image Widget Migration**

**COMPLETED** ✅ (September 4, 2025)
- ✅ Applied bootstrap pattern: ImageViewer loads initial session state from `/api/nina/session-state` to detect active imaging sessions
- ✅ Enhanced session awareness: Widget now knows when we're in an active imaging session vs idle state
- ✅ Unified WebSocket integration: Subscribes to `session:update` events for real-time session state changes  
- ✅ IMAGE-SAVED event handling: Processes events from unified session `recent_events` array and direct WebSocket events
- ✅ NINA API integration: Continues using prepared-image endpoint (no need for `last_image_path` tracking as NINA API always returns latest)
- ✅ Enhanced UI feedback: Shows "Live Session" badge and target name when in active imaging session
- ✅ Session context in image details: Displays target name and project information from unified session data
- ✅ Improved default states: Different messages for "active session waiting for images" vs "no active session"

**Key Learning**: NINA's prepared-image API eliminates need for path tracking - the API always returns the most recent image, making the widget implementation cleaner and more reliable.

### ✅ **COMPLETED: Task 3 - Session Widget Display Migration**

**COMPLETED** ✅ (September 4, 2025)
- ✅ Applied bootstrap pattern: SessionWidget loads initial session state from `/api/nina/session-state` using unified session format
- ✅ Unified WebSocket integration: Migrated from legacy `useSessionWebSocket` to direct `useUnifiedWebSocket` for session updates
- ✅ Removed redundant API logic: Eliminated old session WebSocket connection and unnecessary API polling
- ✅ Data format compatibility: Existing utility functions (`getSessionStatus`, `extractTargetInfo`, etc.) already support unified session format
- ✅ Real-time updates: SessionWidget now receives live session updates via `session:update` WebSocket events
- ✅ Enhanced error handling: Better error states and debug logging for session state detection
- ✅ Maintains feature parity: All existing SessionWidget functionality preserved (target info, activity, status, alerts)
- ✅ Performance optimization: Eliminated duplicate network requests by using single unified data source

**Key Learning**: The SessionWidget's modular utility architecture made migration seamless - utility functions like `extractTargetInfo` and `getSessionStatus` already handled the unified session format through the `isActive` and `target` properties.

### Remaining Priority Tasks

**4. Update Target Scheduler Widget**
- [ ] Listen for `target_name` changes to detect active sessions
- [ ] Continue to show "Shooting Now" badge for any target in active imaging from the new UnifiedSession WS
- [ ] Apply bootstrap pattern: initial state from API + WebSocket updates

**5. Remove Legacy Session Management**
- [ ] Delete `src/services/sessionStateManager.js` (legacy)
- [ ] Remove old WebSocket connection (`/ws/session`)
- [ ] Clean up old API endpoints that duplicate unified session data
- [ ] Update frontend components to use single unified WebSocket

## Migration Guide

### From Legacy Session System

**Before (Multiple WebSocket Connections)**:
```javascript
// Old system - multiple connections
const sessionWs = new WebSocket('ws://localhost:3001/ws/session');
const ninaWs = new WebSocket('ws://localhost:3001/ws/nina');

sessionWs.onmessage = (event) => {
  const sessionData = JSON.parse(event.data);
  // Handle session updates
};

ninaWs.onmessage = (event) => {
  const ninaEvent = JSON.parse(event.data);
  // Handle NINA events  
};
```

**After (Single Unified Connection)**:
```javascript
// New system - single connection with all data
const unifiedWs = new WebSocket('ws://localhost:3001/ws/unified');

unifiedWs.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'unifiedSession') {
    // All session data in one message
    const sessionData = message.data;
    updateGuiderWidget(sessionData.is_guiding, sessionData.guiding_rms);
    updateSessionWidget(sessionData.target_name, sessionData.duration);
    updateSchedulerWidget(sessionData.target_name);
  }
};
```

## API Endpoints

### Current Session State
```bash
GET /api/nina/session-state
```
Returns current unified session data (same format as WebSocket message data).

### Manual Session Refresh  
```bash
POST /api/nina/session-state/refresh
```
Triggers manual refresh of session state from NINA event history.

## Development & Testing

### Start Development Environment
```bash
npm start
# Backend: http://localhost:3001
# Frontend: http://localhost:3000  
# WebSocket: ws://localhost:3001/ws/unified
```

### Health Check
```bash
curl http://localhost:3001/api/config/health
```

### Test WebSocket Connection
```bash
# Test unified session WebSocket
wscat -c ws://localhost:3001/ws/unified
```

## Legacy System Retirement

### Files to Remove After Migration ⚠️
- `docs/CURRENT_SESSION_WEBSOCKET.md` (superseded by this document)
- `docs/development/SESSIONSTATE_REFACTORING.md` (historical)  
- `docs/development/SESSION_WIDGET_BACKEND_ANALYSIS.md` (historical)
- `src/services/sessionStateManager.js` (legacy implementation)
- Any references to `/ws/session` and `/ws/nina` endpoints

### Migration Checklist
- [ ] All widgets updated to use unified session WebSocket
- [ ] Frontend uses single `/ws/unified` connection  
- [ ] Legacy WebSocket endpoints removed
- [ ] Old session API endpoints cleaned up
- [ ] Documentation updated to reflect new system
- [ ] Legacy files removed from repository

---

## Technical Implementation Details

### Event Processing Flow
1. **NINA WebSocket** → **SessionEventHandler** (live events)
2. **EventNormalizer** → standardizes event format
3. **SessionFSM** → processes state transitions  
4. **SessionStateManager** → persists to database
5. **UnifiedSessionManager** → broadcasts via WebSocket

### State Persistence
- Events processed in batches of 50 for performance
- Only last 20 events stored in database (rolling window)  
- Complete session state reconstructed from event history on startup
- Real-time state updates broadcast immediately to connected clients

### Error Handling & Recovery
- WebSocket auto-reconnection with exponential backoff
- Graceful handling of NINA disconnections
- Database transaction safety for state updates
- Event deduplication to prevent data corruption

*This system provides a robust, scalable foundation for real-time astrophotography session monitoring with NINA.*
