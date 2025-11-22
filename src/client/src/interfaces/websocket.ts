/**
 * WebSocket-related interfaces for real-time communication
 */

// WebSocket Connection Status
export interface WebSocketConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  lastConnectedAt: string | null;
  connectionAttempts: number;
  error: string | null;
}

// WebSocket Event Base
export interface WebSocketEvent {
  id: string;
  type: string;
  timestamp: string;
  source: 'nina' | 'dashboard' | 'system';
  data: any;
}

// WebSocket Manager Config
export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  eventBufferSize: number;
  deduplicationWindow: number;
}

// WebSocket Event Handlers
export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (event: WebSocketEvent) => void;
  onReconnect?: (attempt: number) => void;
}

// Unified WebSocket Hook Return Type
export interface UseWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  lastEvent: WebSocketEvent | null;
  connectionStatus: WebSocketConnectionStatus;
  sendMessage: (message: any) => void;
  disconnect: () => void;
  reconnect: () => void;
}

// Widget-specific WebSocket Hooks
export interface UseNINAStatusWebSocketReturn extends UseWebSocketReturn {
  onEquipmentUpdate: (handler: (event: any) => void) => () => void;
  onStatusUpdate: (handler: (status: any) => void) => () => void;
}

export interface UseSessionWebSocketReturn extends UseWebSocketReturn {
  onSessionUpdate: (handler: (session: any) => void) => () => void;
  onWidgetEvent: (handler: (event: any) => void) => () => void;
}



// WebSocket Event Subscription
export interface WebSocketSubscription {
  id: string;
  eventTypes: string[];
  handler: (event: WebSocketEvent) => void;
  active: boolean;
  createdAt: string;
}

// WebSocket Event Filter
export interface WebSocketEventFilter {
  eventTypes?: string[];
  sources?: string[];
  minTimestamp?: string;
  maxEvents?: number;
}

// WebSocket Message Types
export interface WebSocketMessage {
  id: string;
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'event' | 'command';
  payload: any;
  timestamp: string;
}

// WebSocket Health Status
export interface WebSocketHealth {
  connected: boolean;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
  reconnections: number;
  lastError: string | null;
  subscriptions: number;
  eventBuffer: {
    size: number;
    maxSize: number;
    oldestEvent: string | null;
    newestEvent: string | null;
  };
}
