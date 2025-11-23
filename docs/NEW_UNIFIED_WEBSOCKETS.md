# Unified NINA State WebSocket Design

This document describes how to implement a **unified WebSocket state stream** for the existing Node-based backend + frontend project that integrates with NINA.

The goal is to provide the frontend dashboard with a **single WebSocket message format** that always contains a full, up-to-date snapshot of observatory state, plus a small hint about *what changed* so individual widgets can react intelligently.

---

## 0. Scope & Constraints

### Goals

1. Maintain a single in-memory **unified state** object that includes:
   - Current session (target, imaging, guiding)
   - Equipment status (normalized across device types)
   - Last 5 recent events (summarized, not raw)

2. On backend startup:
   - Call NINA’s `GET /event-history` to **seed** this unified state.

3. During runtime:
   - Subscribe to `SUB /socket` WebSocket from NINA for **live events**.
   - For each NINA event:
     - Update the unified state.
     - Broadcast a **unified WebSocket message** to frontend clients.

4. Frontend behavior:
   - Fetch initial snapshot via `GET /api/state`.
   - Subscribe to backend WebSocket for incremental updates.
   - Use `updateKind` / `updateReason` to decide which widgets should react to each message.

### Constraints

- **Do not** restructure the project or move existing files.
- Follow existing patterns for:
  - Configuration & environment variables
  - Logging
  - HTTP & WebSocket servers
- Reuse existing HTTP/WS client choices (e.g., axios, fetch, ws, etc.) where possible.
- NINA connection points:
  - `GET /event-history`
  - `SUB /socket` (NINA WebSocket for live events)

---

## 1. Unified State Shape

The backend maintains a single in-memory `UnifiedState` object. TypeScript-style definitions below describe the contract (use JS or TS according to the existing project):

```ts
type UnifiedState = {
  currentSession: {
    isActive: boolean | null;
    startedAt: string | null; // ISO timestamp

    target: {
      projectName: string | null;
      targetName: string | null;
      ra: number | null;
      dec: number | null;
      panelIndex: number | null;
      rotationDeg: number | null;
    };

    imaging: {
      currentFilter: string | null;
      exposureSeconds: number | null;
      frameType: "LIGHT" | "DARK" | "BIAS" | "FLAT" | null;
      sequenceName: string | null;
      progress: {
        frameIndex: number | null;
        totalFrames: number | null;
      } | null;
      lastImage: {
        at: string;       // ISO
        filePath: string;
      } | null;
    };

    guiding: {
      isGuiding: boolean;
      lastRmsTotal: number | null;
      lastRmsRa: number | null;
      lastRmsDec: number | null;
      lastUpdate: string | null;
    };
  } | null;

  equipment: Array<{
    id: string;   // stable logical id: "mount", "camera", "filterWheel", "guider", "focuser", etc.
    type: "mount" | "camera" | "filterWheel" | "guider" | "focuser" | "rotator" | "other";
    name: string;
    connected: boolean;
    status:
      | "idle"
      | "slewing"
      | "tracking"
      | "exposing"
      | "settling"
      | "error"
      | "warming"
      | "cooling"
      | "calibrating"
      | "guiding"
      | "focusing"
      | "unknown";
    lastChange: string | null; // ISO timestamp
    details: Record<string, any>;
  }>;

  recentEvents: Array<{
    time: string;   // ISO
    type: string;   // e.g. "IMAGE-SAVE", "GUIDING-STATE", "TARGET-CHANGE"
    summary: string;
    meta?: Record<string, any>;
  }>;
};
````

Notes:

* `currentSession` is `null` if nothing is active or no session info is known yet.
* `equipment` is normalized so that each device has:

  * a stable `id` across events
  * a generic `type`
  * generic `status` and `details`
* `recentEvents` holds up to 5 of the most recent high-level events (not raw spam).

---

## 2. WebSocket Envelope Shape (Backend → Frontend)

Every message sent from backend to frontend over the project’s WebSocket should use this envelope:

```ts
type UnifiedWsMessage = {
  schemaVersion: 1;
  timestamp: string;        // ISO
  updateKind:
    | "session"
    | "equipment"
    | "image"
    | "stack"
    | "events"
    | "fullSync"
    | "heartbeat";
  updateReason: string;      // e.g. "guiding-started", "image-saved", "mount-tracking"
  changed: {
    path: string;            // e.g. "currentSession.guiding", "equipment.mount", "currentSession.imaging.lastImage"
    summary: string;         // short human-readable description
    meta?: Record<string, any>;
  } | null;
  state: UnifiedState;       // full snapshot
};
```

**Important design rule:**

* Every message contains the **full `state` snapshot**.
* `updateKind` / `updateReason` / `changed` allow widgets to decide if they care about this particular update, without having to diff the state.

Examples:

* Session started:

  * `updateKind: "session"`
  * `updateReason: "sequence-started"`
  * `changed.path: "currentSession"`
* New image saved:

  * `updateKind: "image"`
  * `updateReason: "image-saved"`
  * `changed.path: "currentSession.imaging.lastImage"`

---

## 3. Unified State Manager (Backend)

Create a module that encapsulates the in-memory state and provides simple helpers to update it.

Example interface:

```ts
let state: UnifiedState = {
  currentSession: null,
  equipment: [],
  recentEvents: []
};

export function getState(): UnifiedState;

export function setState(newState: UnifiedState): void;

export function updateSession(
  partial: Partial<UnifiedState["currentSession"]>
): void;

export function upsertEquipment(device: {
  id: string;
  type: UnifiedState["equipment"][number]["type"];
  name: string;
  connected: boolean;
  status: UnifiedState["equipment"][number]["status"];
  details?: Record<string, any>;
}): void;

export function addRecentEvent(event: {
  time: string;
  type: string;
  summary: string;
  meta?: Record<string, any>;
}): void;
```

Implementation details:

* `setState(newState)`
  Fully replaces the internal `state`.

* `updateSession(partial)`

  * If `state.currentSession` is `null`, create a new session object with defaults and merge `partial`.
  * Otherwise, shallow-merge `partial` into the existing session object.

* `upsertEquipment(device)`

  * Search `state.equipment` by `device.id`.
  * If found:

    * Update `connected`, `status`, `details` (shallow merge).
    * Set `lastChange = now`.
  * If not found:

    * Push a new entry with `lastChange = now`, `details = device.details || {}`.

* `addRecentEvent(event)`

  * Insert the event at the front of `state.recentEvents`.
  * If length > 5, truncate to keep only the first 5.
  * `meta` should remain compact and relevant (no huge dumping of raw payloads).

---

## 4. Seeding State from `GET /event-history`

On backend startup (and optionally on reconnect), seed the unified state from NINA’s event history.

### 4.1 Call NINA’s `/event-history`

* Use existing HTTP client patterns (axios/fetch/custom wrapper).
* Base URL and `/event-history` path should come from existing config/env.
* Handle errors gracefully:

  * On failure, log and fall back to an empty state (`currentSession = null`, `equipment = []`, `recentEvents = []`).

### 4.2 Mapping `/event-history` → `UnifiedState`

Using the existing understanding of NINA’s event payloads:

1. Fetch recent history from `GET /event-history`.

2. Process events **in chronological order** (oldest → newest).

3. For each event:

   * Update `currentSession`:

     * Session start/end
     * Target/coordinates
     * Imaging/filter/sequence info
     * Guiding state
   * Update `equipment`:

     * Camera connection and cooling state
     * Mount slewing/tracking state
     * Filter wheel position/name
     * Focuser position, etc.

4. Build `recentEvents` from the **last 5** meaningful events:

   * For each event, create:

     ```ts
     {
       time: event.timestamp,
       type: event.type,             // or normalized type
       summary: "<short description>",
       meta: { /* minimal useful context */ }
     }
     ```

5. After processing all history:

   * Call `setState(unifiedState)`.

If `/event-history` returns nothing or is unavailable, that’s fine; live events from `/socket` will populate the state.

---

## 5. NINA WebSocket Subscription (`SUB /socket`)

Create a backend module responsible for connecting to and consuming NINA’s live WebSocket stream.

### 5.1 Connection

* Use the project’s existing WS client library if available; otherwise add what’s standard for the project (e.g., `ws`).
* NINA WebSocket URL comes from config/env.
* Implement minimal reconnect logic:

  * On `close` or `error`, log the issue, wait a few seconds, and reconnect.
  * Avoid tight reconnect loops.

### 5.2 Event Handling

For each WebSocket message received from NINA:

1. Parse JSON.
2. Use the event’s type/shape to decide:

   * What part of `UnifiedState` to update.
   * Which `updateKind` and `updateReason` to use.
   * Which `changed.path` and `changed.summary` to emit.

Example mapping patterns (names are illustrative):

* **Guiding events**

  * NINA types: `"GuidingStarted"`, `"GuidingStopped"`, `"GuidingStatsUpdated"`, etc.
  * Actions:

    * Update `state.currentSession.guiding`.
    * `updateKind = "session"`.
    * `updateReason` in `{ "guiding-started", "guiding-stopped", "guiding-update" }`.
    * `changed.path = "currentSession.guiding"`.

* **Target / session events**

  * NINA types: `"TargetChanged"`, `"SequenceStarted"`, `"SequenceCompleted"`, etc.
  * Actions:

    * Update `currentSession.target` and `currentSession.imaging`.
    * Set `isActive` / `startedAt` as appropriate.
    * `updateKind = "session"`.
    * `updateReason` e.g. `"target-changed"`, `"sequence-started"`, `"sequence-completed"`.
    * `changed.path = "currentSession"`.

* **Equipment events**

  * NINA types: `"MountSlewing"`, `"MountTracking"`, `"CameraConnected"`, `"FilterChanged"`, `"FocuserMoving"`, etc.
  * Actions:

    * Call `upsertEquipment()` using stable IDs like `"mount"`, `"camera"`, `"filterWheel"`, `"focuser"`, `"guider"`.
    * Map NINA’s specific states to one of the generic `status` values.
    * `updateKind = "equipment"`.
    * `updateReason` e.g. `"mount-slewing"`, `"mount-tracking"`, `"camera-connected"`, `"filter-changed"`.

* **Image events**

  * NINA types: `"ImageSaved"`, etc.
  * Actions:

    * Update `currentSession.imaging.lastImage`.
    * Optionally update `currentSession.imaging.progress`.
    * Call `addRecentEvent` with a summary like `"LIGHT Ha 300s saved"`.
    * `updateKind = "image"`.
    * `updateReason = "image-saved"`.
    * `changed.path = "currentSession.imaging.lastImage"`.

* **Stacking events** (if provided by NINA)

  * NINA types: `"StackProgress"`, `"StackCompleted"`, etc.
  * Actions:

    * Update any stack-related structure in the state if you decide to track it.
    * `updateKind = "stack"`.
    * `updateReason` in `{ "stack-progress", "stack-completed" }`.

For each processed event:

1. Update `state` via the helper functions.

2. Construct a `UnifiedWsMessage`:

   ```ts
   const message: UnifiedWsMessage = {
     schemaVersion: 1,
     timestamp: new Date().toISOString(),
     updateKind,        // "session" | "equipment" | "image" | ...
     updateReason,      // e.g. "guiding-started"
     changed: {
       path,            // e.g. "currentSession.guiding"
       summary,         // short summary string
       meta             // small set of key details
     },
     state: getState()
   };
   ```

3. Broadcast this message to **all connected frontend WS clients**.

---

## 6. Backend WebSocket to Frontend

Use the existing backend WebSocket server if one already exists. If not, attach a WS server to the HTTP server following current project conventions.

### 6.1 On Client Connect

When a frontend client connects:

* Immediately send a **full sync** message:

```ts
const fullSync: UnifiedWsMessage = {
  schemaVersion: 1,
  timestamp: new Date().toISOString(),
  updateKind: "fullSync",
  updateReason: "initial-state",
  changed: null,
  state: getState()
};
```

* After that, the client will receive all subsequent incremental updates produced from NINA WS events.

### 6.2 Broadcasting Updates

On each NINA event:

* After updating state, send the corresponding `UnifiedWsMessage` (with specific `updateKind`, `updateReason`, and `changed`) to all connected frontend clients.

---

## 7. HTTP Endpoint for Initial State

Expose a simple HTTP endpoint for initial load:

* `GET /api/state` → returns `UnifiedState` (without the WS envelope).

Example:

```ts
app.get("/api/state", (req, res) => {
  res.json(getState());
});
```

Frontend flow:

1. On page load, call `GET /api/state` to get the initial state.
2. Open the WebSocket connection.
3. Apply `fullSync` message and subsequent incremental updates.

---

## 8. Frontend Consumption Pattern

The exact implementation depends on the existing frontend stack (React, Vue, etc.). At a high level:

* Create a small client-side “store” that:

  * Holds the current `UnifiedState`.
  * Holds metadata about the last message: `updateKind`, `updateReason`, `changed`.

Example responsibilities:

1. On mount:

   * Fetch `/api/state` and set local state.
   * Connect to backend WS.
2. On WS `message`:

   * Parse `UnifiedWsMessage`.
   * Replace local state with `message.state`.
   * Expose `message.updateKind`, `updateReason`, `changed` to components.

Widgets can then choose to react selectively:

* **Guiding widget**

  * Only respond if `updateKind === "session"` and `changed.path` starts with `"currentSession.guiding"`.

* **Equipment widget**

  * Only respond if `updateKind === "equipment"`.

* **Image preview widget**

  * Only respond if `updateKind === "image"` and `updateReason === "image-saved"`.

This avoids unnecessary re-renders while keeping the state management simple (always store the full snapshot).

---

## 9. Testing & Validation

### 9.1 Local / Unit Tests

* Add tests (or a dev-only route) to inspect `getState()` for various synthetic event sequences.
* Validate that:

  * Session state transitions are correct.
  * Equipment entries are normalized and updated as expected.
  * `recentEvents` never exceeds 5 entries and are in descending time order.

### 9.2 End-to-End Checks

1. Start backend with NINA available.
2. Confirm on startup:

   * `GET /event-history` is called.
   * Unified state is seeded from history.
3. Connect a test WS client (or the real frontend) and verify:

   * On first connection, a `fullSync` message is received.
   * As NINA emits events, incremental messages are received with:

     * Appropriate `updateKind` / `updateReason`.
     * Correct `changed.path` / `summary`.
     * `state` that reflects the expected new values.

### 9.3 Resilience

* Simulate NINA WS disconnection:

  * Confirm backend logs the error, waits, and reconnects.
  * Confirm state is preserved across reconnects.
* Simulate `/event-history` failure on startup:

  * Backend should continue running with an empty state and populate from live events.

---

## 10. Summary

* Unified state lives in a single in-memory object (`UnifiedState`).
* Backend seeds state from `GET /event-history`.
* Backend keeps state current by consuming NINA’s `SUB /socket` WebSocket.
* Backend exposes:

  * `GET /api/state` for initial snapshot.
  * A WebSocket stream emitting `UnifiedWsMessage` envelopes for live updates.
* Frontend:

  * Loads the initial state via HTTP.
  * Subscribes to WS for updates and uses `updateKind` / `updateReason` / `changed` to drive widget-level updates efficiently.
