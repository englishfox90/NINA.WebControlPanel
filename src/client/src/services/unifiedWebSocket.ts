// Unified WebSocket Manager - Single connection, intelligent routing
// Replaces multiple WebSocket connections with one efficient stream

import { EventEmitter } from 'events';

export interface NINAEvent {
  Type: string;
  Timestamp: string;
  Source: 'NINA' | 'Backend';
  Data?: any;
}

export interface WebSocketMessage {
  type: 'nina-event' | 'sessionUpdate' | 'connection' | 'error' | 'heartbeat';
  data: any;
  timestamp: string;
}

// Widget update triggers based on NINA events
export const WIDGET_TRIGGERS = {
  // NINA Status Widget - Equipment state changes
  'nina_status': [
    'CAMERA-CONNECTED', 'CAMERA-DISCONNECTED',
    'MOUNT-CONNECTED', 'MOUNT-DISCONNECTED',
    'FOCUSER-CONNECTED', 'FOCUSER-DISCONNECTED',
    'FILTERWHEEL-CONNECTED', 'FILTERWHEEL-DISCONNECTED',
    'GUIDER-CONNECTED', 'GUIDER-DISCONNECTED',
    'ROTATOR-CONNECTED', 'ROTATOR-DISCONNECTED',
    'SWITCH-CONNECTED', 'SWITCH-DISCONNECTED',
    'FLAT-CONNECTED', 'FLAT-DISCONNECTED',
    'WEATHER-CONNECTED', 'WEATHER-DISCONNECTED',
    'DOME-CONNECTED', 'DOME-DISCONNECTED',
    'SAFETY-CONNECTED', 'SAFETY-DISCONNECTED'
  ],
  
  // Image Viewer - New images saved
  'image_viewer': [
    'IMAGE-SAVE'
  ],
  
  // Current Session Widget - All session-related events
  'current_session': [
    'SEQUENCE-STARTING', 'SEQUENCE-FINISHED',
    'IMAGE-SAVE', 'AUTOFOCUS-RUNNING', 'AUTOFOCUS-FINISHED',
    'GUIDING-STARTED', 'GUIDING-STOPPED',
    'MOUNT-SLEWING', 'MOUNT-TRACKING',
    'FILTERWHEEL-CHANGED',
    // Flat panel events
    'FLAT-COVER-CLOSED', 'FLAT-COVER-OPENED',
    'FLAT-LIGHT-TOGGLED', 'FLAT-BRIGHTNESS-CHANGED'
  ],
  
  // Target Scheduler - Project progress updates
  'target_scheduler': [
    'IMAGE-SAVE', 'SEQUENCE-FINISHED'
  ]
} as const;

export class UnifiedWebSocketManager extends EventEmitter {
  private static instance: UnifiedWebSocketManager;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 2000;
  private isConnecting = false;
  private connectionHealthTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private url: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;

  // Widget subscriptions
  private widgetSubscriptions = new Map<string, Set<string>>();
  
  // Connection stability features
  private isDestroyed = false;
  private connectionStableTimeout: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.url = this.getWebSocketUrl();
    this.setupEventRouting();
  }

  public static getInstance(): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance) {
      UnifiedWebSocketManager.instance = new UnifiedWebSocketManager();
    }
    return UnifiedWebSocketManager.instance;
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'production' ? window.location.port : '3001';
    return `${protocol}//${host}:${port}/ws/unified`;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('WebSocket manager has been destroyed'));
        return;
      }

      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        this.once('connected', resolve);
        this.once('error', reject);
        return;
      }

      this.isConnecting = true;
      console.log('🔌 Connecting to unified WebSocket:', this.url);

      try {
        this.socket = new WebSocket(this.url);
        
        this.socket.onopen = () => {
          console.log('✅ Unified WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastHeartbeat = Date.now();
          this.shouldReconnect = true;
          this.startConnectionHealth();
          
          // Wait for connection to be stable before emitting connected
          this.connectionStableTimeout = setTimeout(() => {
            console.log('🔐 WebSocket connection stabilized');
            this.emit('connected');
            resolve();
          }, 1000);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket.onclose = (event) => {
          console.log(`❌ Unified WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
          this.handleDisconnection();
        };

        this.socket.onerror = (error) => {
          console.error('❌ Unified WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleDisconnection() {
    this.isConnecting = false;
    this.stopConnectionHealth();
    
    if (this.connectionStableTimeout) {
      clearTimeout(this.connectionStableTimeout);
      this.connectionStableTimeout = null;
    }
    
    this.emit('disconnected');
    
    // Implement intelligent reconnection with equipment state change handling
    if (!this.isDestroyed && this.shouldReconnect) {
      // Add a short delay to allow NINA equipment state changes to settle
      setTimeout(() => {
        if (this.shouldReconnect && !this.isConnected()) {
          console.log('🔄 Equipment state change detected, attempting reconnection...');
          this.scheduleReconnect();
        }
      }, 1000); // 1 second stabilization delay
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.lastHeartbeat = Date.now();

      // Route messages based on type
      switch (message.type) {
        case 'nina-event':
          this.handleNINAEvent(message.data);
          break;
        case 'sessionUpdate':
          this.emit('session:update', message.data);
          break;
        case 'connection':
          this.emit('connection:status', message.data);
          break;
        case 'heartbeat':
          // Heartbeat received, connection is healthy
          console.log('💓 Heartbeat received');
          break;
        default:
          console.log('📩 Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  private handleNINAEvent(event: NINAEvent) {
    // Emit the raw event for any listeners
    this.emit('nina:event', event);

    // Route to specific widgets based on event type
    this.routeToWidgets(event);
  }

  private routeToWidgets(event: NINAEvent) {
    // Check which widgets should be notified for this event type
    Object.entries(WIDGET_TRIGGERS).forEach(([widgetType, eventTypes]) => {
      if ((eventTypes as readonly string[]).includes(event.Type)) {
        console.log(`📡 Routing event ${event.Type} to widget ${widgetType}`);
        this.emit(`widget:${widgetType}`, event);
      }
    });

    // Special routing logic
    this.handleSpecialRouting(event);
  }

  private handleSpecialRouting(event: NINAEvent) {
    switch (event.Type) {
      case 'IMAGE-SAVE':
        // Notify both Image Viewer and Target Scheduler
        this.emit('widget:image_update', event);
        this.emit('widget:scheduler_refresh', event);
        break;
        
      case 'SEQUENCE-STARTING':
      case 'SEQUENCE-FINISHED':
        // Update session widget and scheduler
        this.emit('widget:session_update', event);
        this.emit('widget:scheduler_refresh', event);
        break;
        
      default:
        // Equipment connection changes
        if (event.Type.includes('-CONNECTED') || event.Type.includes('-DISCONNECTED')) {
          this.emit('widget:equipment_update', event);
        }
    }
  }

  private startConnectionHealth() {
    this.connectionHealthTimer = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
      
      // If no heartbeat for 30 seconds, consider connection stale
      if (timeSinceHeartbeat > 30000) {
        console.warn('⚠️ WebSocket connection appears stale, reconnecting...');
        this.disconnect();
      }
    }, 15000); // Check every 15 seconds
  }

  private stopConnectionHealth() {
    if (this.connectionHealthTimer) {
      clearInterval(this.connectionHealthTimer);
      this.connectionHealthTimer = null;
    }
  }

  private scheduleReconnect() {
    // Don't reconnect if we're already trying or if destroyed
    if (this.reconnectTimer || !this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💥 Max reconnection attempts reached, giving up');
      this.emit('connection:failed');
      this.shouldReconnect = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && !this.isConnected()) {
        this.connect().catch(() => {
          // Error handled in connect method, will schedule next attempt if needed
        });
      }
    }, delay);
  }

  public disconnect() {
    this.shouldReconnect = false;
    
    // Clear any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.stopConnectionHealth();
  }

  public destroy() {
    this.isDestroyed = true;
    this.shouldReconnect = false;
    this.disconnect();
    this.removeAllListeners();
  }

  // Widget subscription methods
  public subscribeWidget(widgetType: string, eventTypes: string[] = []) {
    if (!this.widgetSubscriptions.has(widgetType)) {
      this.widgetSubscriptions.set(widgetType, new Set());
    }
    
    eventTypes.forEach(eventType => {
      this.widgetSubscriptions.get(widgetType)!.add(eventType);
    });
  }

  public unsubscribeWidget(widgetType: string) {
    this.widgetSubscriptions.delete(widgetType);
  }

  // Connection status
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      subscribedWidgets: Array.from(this.widgetSubscriptions.keys())
    };
  }

  private setupEventRouting() {
    // Setup intelligent event routing for debugging
    this.on('nina:event', (event: NINAEvent) => {
      console.log(`📡 NINA Event: ${event.Type} → Routing to widgets`);
    });
  }
}

// Export singleton instance
export const unifiedWebSocket = UnifiedWebSocketManager.getInstance();
