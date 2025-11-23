# Unified WebSocket State System - Implementation Guide

## 🎯 Overview

The Unified WebSocket State System provides a **single, consistent state stream** for the entire observatory, combining NINA equipment status, session data, and live events into one unified state object that's automatically synchronized across all connected clients.

## 🏗️ Architecture

### Backend Components

#### 1. **UnifiedStateManager** (`src/services/unifiedState/UnifiedStateManager.js`)
- Maintains single in-memory state object
- Provides helper methods for state updates
- Manages subscriptions and broadcasts changes
- **State Structure:**
  ```javascript
  {
    currentSession: {
      isActive: boolean | null,
      startedAt: string | null,
      target: { projectName, targetName, ra, dec, ... },
      imaging: { currentFilter, exposureSeconds, frameType, ... },
      guiding: { isGuiding, lastRmsTotal, ... }
    },
    equipment: [
      { id, type, name, connected, status, lastChange, details }
    ],
    recentEvents: [
      { time, type, summary, meta }
    ]
  }
  ```

#### 2. **NINAWebSocketClient** (`src/services/unifiedState/NINAWebSocketClient.js`)
- Connects to NINA's `/socket` WebSocket endpoint
- Handles automatic reconnection (5-second delay)
- Forwards live NINA events to the EventNormalizer
- **Connection:** `ws://NINA_IP:1888/socket`

#### 3. **EventNormalizer** (`src/services/unifiedState/EventNormalizer.js`)
- Maps NINA events to unified state updates
- Determines `updateKind` and `updateReason` for each event
- Updates state and triggers notifications
- **Event Categories:**
  - Guiding events → Session updates
  - Target/sequence events → Session updates
  - Equipment events → Equipment updates
  - Image events → Image updates
  - Stack events → Stack updates

#### 4. **StateSeeder** (`src/services/unifiedState/StateSeeder.js`)
- Seeds initial state from NINA's `/event-history` endpoint
- Processes historical events chronologically
- Provides state summary on startup

#### 5. **UnifiedStateSystem** (`src/services/unifiedState/index.js`)
- Main orchestrator that coordinates all components
- Manages lifecycle (start/stop)
- Provides public API for state access

### Frontend Components

#### 1. **TypeScript Interfaces** (`src/client/src/interfaces/unifiedState.ts`)
Complete type definitions for:
- `UnifiedState` - Complete state structure
- `UnifiedWsMessage` - WebSocket message envelope
- `EquipmentDevice`, `CurrentSession`, etc.

#### 2. **React Hook** (`src/client/src/hooks/useUnifiedState.ts`)
Custom hooks for consuming unified state:
- `useUnifiedState()` - Full state with all updates
- `useSessionState()` - Session updates only
- `useEquipmentState()` - Equipment updates only
- `useImageState()` - Image updates only

## 🚀 Getting Started

### Backend Setup

The unified state system is **automatically initialized** when the backend starts. No additional configuration required!

```javascript
// Initialized in src/server/config-server.js
const unifiedStateSystem = new UnifiedStateSystem(ninaService);
await unifiedStateSystem.start();
```

### Frontend Usage

#### Basic Usage - Full State
```typescript
import { useUnifiedState } from '../hooks/useUnifiedState';

function MyWidget() {
  const { state, loading, error, connected, lastUpdate } = useUnifiedState();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Connected: {connected ? 'Yes' : 'No'}</p>
      <p>Session Active: {state?.currentSession?.isActive ? 'Yes' : 'No'}</p>
      <p>Equipment Count: {state?.equipment.length}</p>
    </div>
  );
}
```

#### Filtered Updates - Session Only
```typescript
import { useSessionState } from '../hooks/useUnifiedState';

function SessionWidget() {
  const { state, lastUpdate } = useSessionState((message) => {
    console.log('Session update:', message.updateReason);
  });

  const session = state?.currentSession;

  return (
    <div>
      <h3>Current Session</h3>
      {session?.target?.targetName && (
        <p>Target: {session.target.targetName}</p>
      )}
      {session?.guiding?.isGuiding && (
        <p>Guiding RMS: {session.guiding.lastRmsTotal?.toFixed(2)}"</p>
      )}
    </div>
  );
}
```

#### Custom Update Handler
```typescript
import { useUnifiedState } from '../hooks/useUnifiedState';

function ImageWidget() {
  const { state } = useUnifiedState({
    filterUpdateKinds: ['image', 'fullSync'],
    onUpdate: (message) => {
      if (message.updateKind === 'image') {
        // Handle new image
        console.log('New image:', message.state.currentSession?.imaging?.lastImage);
      }
    }
  });

  return <div>Last Image: {state?.currentSession?.imaging?.lastImage?.filePath}</div>;
}
```

## 📡 API Endpoints

### HTTP Endpoints

#### `GET /api/state`
Returns current unified state
```bash
curl http://localhost:3001/api/state
```

**Response:**
```json
{
  "currentSession": { ... },
  "equipment": [ ... ],
  "recentEvents": [ ... ]
}
```

#### `GET /api/state/status`
Returns system status
```bash
curl http://localhost:3001/api/state/status
```

**Response:**
```json
{
  "initialized": true,
  "seeded": true,
  "ninaWebSocket": "connected",
  "equipmentCount": 5,
  "sessionActive": true,
  "recentEventCount": 5
}
```

### WebSocket Endpoint

**URL:** `ws://localhost:3001`

#### Initial Connection
On connection, client immediately receives a `fullSync` message:
```json
{
  "schemaVersion": 1,
  "timestamp": "2025-11-22T10:30:00.000Z",
  "updateKind": "fullSync",
  "updateReason": "initial-state",
  "changed": null,
  "state": { ... }
}
```

#### Live Updates
Subsequent messages have specific `updateKind` and `updateReason`:
```json
{
  "schemaVersion": 1,
  "timestamp": "2025-11-22T10:31:00.000Z",
  "updateKind": "image",
  "updateReason": "image-saved",
  "changed": {
    "path": "currentSession.imaging.lastImage",
    "summary": "Image saved: LIGHT Ha",
    "meta": { ... }
  },
  "state": { ... }
}
```

#### Heartbeat (Optional)
Send ping to keep connection alive:
```json
// Client sends:
{ "type": "ping" }

// Server responds:
{ "type": "pong", "timestamp": "2025-11-22T10:31:00.000Z" }
```

## 🔄 Event Flow

### Startup Flow
```
1. Backend starts
2. UnifiedStateSystem initializes
3. StateSeeder fetches /event-history from NINA
4. Historical events processed chronologically
5. NINAWebSocketClient connects to NINA's /socket
6. System ready for live events
```

### Live Event Flow
```
1. NINA emits event → ws://NINA:1888/socket
2. NINAWebSocketClient receives event
3. EventNormalizer processes event
4. UnifiedStateManager updates state
5. UnifiedStateManager broadcasts to subscribers
6. WebSocket server sends to all connected clients
7. Frontend hook receives update
8. React component re-renders
```

## 📊 Update Kinds & Reasons

### Session Updates (`updateKind: 'session'`)
- `guiding-started` - Guiding activated
- `guiding-stopped` - Guiding deactivated
- `guiding-update` - Guiding stats updated
- `target-changed` - New target selected
- `sequence-started` - Imaging sequence started
- `sequence-completed` - Imaging sequence finished

### Equipment Updates (`updateKind: 'equipment'`)
- `mount-slewing` - Mount is slewing
- `mount-tracking` - Mount is tracking
- `camera-connected` - Camera connected
- `camera-exposing` - Camera capturing
- `filter-changed` - Filter wheel changed
- `focuser-moving` - Focuser moving

### Image Updates (`updateKind: 'image'`)
- `image-saved` - New image captured and saved

### Full Sync (`updateKind: 'fullSync'`)
- `initial-state` - First connection
- `state-reset` - Manual state reset

## 🛠️ Advanced Usage

### Manual Reconnection
```typescript
const { reconnect } = useUnifiedState();

// Trigger manual reconnection
reconnect();
```

### Disconnect
```typescript
const { disconnect } = useUnifiedState();

// Manually disconnect
disconnect();
```

### Refresh State from NINA
```typescript
// Backend-side refresh
const response = await fetch('http://localhost:3001/api/state/refresh', {
  method: 'POST'
});
```

## 🐛 Troubleshooting

### WebSocket Not Connecting
1. Check backend is running: `http://localhost:3001/api/state/status`
2. Check NINA WebSocket status in backend logs
3. Verify NINA API is accessible
4. Check firewall settings

### State Not Updating
1. Check WebSocket connection status in browser console
2. Verify NINA is emitting events
3. Check backend logs for event processing
4. Ensure `filterUpdateKinds` isn't too restrictive

### Reconnection Issues
1. Default reconnect delay is 5 seconds
2. Check network stability
3. Verify NINA is running and accessible
4. Review backend logs for connection errors

## 📝 Best Practices

1. **Use Filtered Hooks** - Use `useSessionState()`, `useEquipmentState()`, etc. to reduce unnecessary re-renders
2. **Handle Loading State** - Always check `loading` before accessing `state`
3. **Check Connection Status** - Display connection indicator for better UX
4. **Implement Error Handling** - Show user-friendly error messages
5. **Cleanup on Unmount** - Hook automatically disconnects, but be aware in complex scenarios
6. **Avoid State Mutations** - State is read-only, use it for display only
7. **Use Update Callbacks** - For side effects (e.g., notifications), use the `onUpdate` callback

## 🎯 Next Steps

Now that the unified WebSocket system is implemented, you can:

1. **Create New Widgets** - Use the hooks to build real-time dashboard widgets
2. **Migrate Existing Widgets** - Replace individual API calls with unified state
3. **Add Notifications** - React to specific events with toast notifications
4. **Build Activity Log** - Display `recentEvents` in a timeline widget
5. **Equipment Dashboard** - Show live equipment status grid

## 📚 Related Documentation

- [NEW_UNIFIED_WEBSOCKETS.md](./NEW_UNIFIED_WEBSOCKETS.md) - Original design specification
- [WIDGET_FORMAT_STANDARD.md](./WIDGET_FORMAT_STANDARD.md) - Widget development guide
- [AGENTS.md](./AGENTS.md) - AI agent development instructions

---

**Last Updated:** November 22, 2025  
**Implementation Status:** ✅ Complete and Production Ready  
**Version:** 1.0.0
