/**
 * Session-related interfaces for NINA Web Control Panel
 * Extracted to reduce component file sizes and improve maintainability
 */

// Enhanced Session State Interfaces
export interface EnhancedSessionState {
  session: {
    startedAt: string | null;
    finishedAt: string | null;
  };
  target: {
    name: string | null;
    project: string | null;
    raString: string | null;
    decString: string | null;
    rotation: number | null;
    targetEndTime: string | null;
    since: string | null;
  };
  filter: {
    name: string | null;
    since: string | null;
  };
  image: {
    lastSavedAt: string | null;
  };
  safety: {
    isSafe: boolean | null;
    changedAt: string | null;
  };
  activity: {
    subsystem: 'camera' | 'guider' | 'mount' | 'rotator' | null;
    state: 'autofocus' | 'guiding' | 'slewing' | 'homed' | 'rotating' | null;
    since: string | null;
  };
  equipmentLastChange: {
    device: string | null;
    event: 'connected' | 'disconnected' | null;
    at: string | null;
  };
  watermark: {
    lastEventTimeUTC: string | null;
    lastEventId: string | null;
  };
}

// Legacy Session State Interfaces (for backward compatibility)
export interface LegacySessionTarget {
  name: string;
  project: string;
  coordinates: {
    ra: number;
    dec: number;
    raString: string;
    decString: string;
    epoch: string;
    raDegrees: number;
  };
  rotation: number | null;
}

export interface LegacySessionFilter {
  name: string;
}

export interface LegacySessionLastImage {
  time: string;
}

export interface LegacySessionSafe {
  isSafe: boolean | null;
  time: string | null;
}

export interface LegacySessionActivity {
  subsystem: 'autofocus' | 'guiding' | 'mount' | 'rotator' | null;
  state: 'running' | 'guiding' | 'slewing' | 'homed' | 'syncing' | null;
  since: string | null;
}

export interface LegacySessionEquipmentChange {
  device: string;
  event: 'CONNECTED' | 'DISCONNECTED';
  time: string;
  originalEvent: string;
}

export interface LegacySessionState {
  target: LegacySessionTarget | null;
  filter: LegacySessionFilter | null;
  lastImage: LegacySessionLastImage | null;
  safe: LegacySessionSafe;
  activity: LegacySessionActivity;
  lastEquipmentChange: LegacySessionEquipmentChange | null;
  sessionStart: string | null;
  isActive: boolean;
  lastUpdate: string | null;
}

// Current Session Widget Interfaces (used by simplified widget)
export interface SessionTarget {
  name: string;
  project: string;
  coordinates: {
    ra: number;
    dec: number;
    raString: string;
    decString: string;
    epoch: string;
    raDegrees: number;
  };
  rotation: number | null;
}

export interface SessionFilter {
  name: string;
}

export interface SessionLastImage {
  time: string;
}

export interface SessionSafe {
  isSafe: boolean | null;
  time: string | null;
}

export interface SessionActivity {
  subsystem: 'autofocus' | 'guiding' | 'mount' | 'rotator' | null;
  state: 'running' | 'guiding' | 'slewing' | 'homed' | 'syncing' | null;
  since: string | null;
}

export interface SessionEquipmentChange {
  device: string;
  event: 'CONNECTED' | 'DISCONNECTED';
  time: string;
}

export interface SessionData {
  target: SessionTarget | null;
  filter: SessionFilter | null;
  lastImage: SessionLastImage | null;
  safe: SessionSafe;
  activity: SessionActivity;
  lastEquipmentChange: SessionEquipmentChange | null;
  sessionStart: string | null;
  isActive: boolean;
  lastUpdate: string | null;
}

// Session Widget Component Props
export interface SessionWidgetProps {
  enableEnhancedMode?: boolean;
  showSessionWindow?: boolean;
  enableTimezoneFormatting?: boolean;
  hideHeader?: boolean;  // Backward compatibility with original SessionWidget
  onRefresh?: () => void;  // Backward compatibility with original SessionWidget
}

export interface BasicSessionWidgetProps {
  hideHeader?: boolean;
  onRefresh?: () => void;
}

// WebSocket and Manager interfaces
export interface SessionManagerHealth {
  hasEnhancedFeatures: boolean;
  isConnected: boolean;
  lastEventTime: string | null;
  eventCount: number;
}

export interface SessionWebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}
