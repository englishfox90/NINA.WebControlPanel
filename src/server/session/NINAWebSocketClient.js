// NINA WebSocket Client for Backend
// Maintains persistent connection to NINA with backoff retry

const WebSocket = require('ws');
const EventEmitter = require('events');
const wsLogger = require('../utils/WebSocketEventLogger');

class NINAWebSocketClient extends EventEmitter {
  constructor(ninaConfig) {
    super();
    this.config = ninaConfig;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimeout = null;
    this.isDestroyed = false;
    
    // Connection health
    this.heartbeatInterval = null;
    this.lastHeartbeat = Date.now();
    
    console.log(`🔌 Initializing NINA WebSocket client for ${this.getWebSocketUrl()}`);
  }

  // Get NINA WebSocket URL
  getWebSocketUrl() {
    // Remove protocol and any trailing slashes from baseUrl
    const cleanBaseUrl = this.config.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Remove any existing port from baseUrl to avoid duplication
    const baseUrlWithoutPort = cleanBaseUrl.split(':')[0];
    
    const wsUrl = `ws://${baseUrlWithoutPort}:${this.config.apiPort}/v2/socket`;
    console.log(`🔗 Constructed WebSocket URL: ${wsUrl}`);
    return wsUrl;
  }

  // Connect to NINA WebSocket
  async connect() {
    if (this.isDestroyed || this.isConnected) {
      return false;
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log(`🔌 Connecting to NINA WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
      
      // Wait for connection with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('❌ Error initializing WebSocket connection: WebSocket connection timeout');
          if (this.ws) {
            this.ws.terminate();
          }
          // Don't reject here, just resolve false to prevent unhandled rejection
          resolve(false);
        }, 10000);

        this.ws.once('open', () => {
          clearTimeout(timeout);
          this.onConnected();
          resolve(true);
        });

        this.ws.once('error', (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket connection error:', error.message);
          // Resolve false instead of reject to prevent unhandled rejection
          resolve(false);
        });
      });

    } catch (error) {
      console.error('❌ Error connecting to NINA WebSocket:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  // Setup WebSocket event handlers
  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.on('open', () => {
      console.log('✅ Connected to NINA WebSocket');
      this.onConnected();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`❌ NINA WebSocket closed: ${code} - ${reason}`);
      this.onDisconnected();
    });

    this.ws.on('error', (error) => {
      console.error('🚨 NINA WebSocket error:', error);
      this.emit('error', error);
    });

    // Handle ping/pong for health monitoring
    this.ws.on('ping', () => {
      this.lastHeartbeat = Date.now();
      if (this.ws) {
        this.ws.pong();
      }
    });

    this.ws.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
  }

  // Handle successful connection
  onConnected() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = Date.now();
    
    // Subscribe to all NINA events
    this.subscribeToEvents();
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    this.emit('connected');
  }

  // Subscribe to NINA event stream
  subscribeToEvents() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot subscribe - WebSocket not ready');
      return;
    }

    // NINA WebSocket subscription message - based on official API docs
    // NINA streams all events when subscribed, no event filtering supported
    const subscribeMessage = JSON.stringify({
      type: 'subscribe'
    });

    // Small delay to ensure connection is fully established
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('📡 Subscribing to NINA event stream:', subscribeMessage);
        this.ws.send(subscribeMessage);
      }
    }, 100);
  }

  // Handle incoming messages
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Log raw event reception
      wsLogger.logEventReceived('WS_CLIENT', message);
      
      // Update heartbeat on any message
      this.lastHeartbeat = Date.now();
      
      // Emit raw NINA event
      this.emit('ninaEvent', message);
      wsLogger.logEventForwarded('WS_CLIENT', message);
      
    } catch (error) {
      wsLogger.logError('WS_CLIENT', error, { rawMessage: data.toString() });
      console.error('❌ Error parsing NINA WebSocket message:', error);
      console.log('Raw message:', data.toString());
    }
  }

  // Handle disconnection
  onDisconnected() {
    this.isConnected = false;
    this.stopHeartbeat();
    
    if (!this.isDestroyed) {
      this.scheduleReconnect();
    }
    
    this.emit('disconnected');
  }

  // Start heartbeat monitoring
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isDestroyed) {
        this.stopHeartbeat();
        return;
      }

      const now = Date.now();
      const timeSinceHeartbeat = now - this.lastHeartbeat;
      
      // If no heartbeat for 60 seconds, consider connection dead
      if (timeSinceHeartbeat > 60000) {
        console.warn('💔 No heartbeat from NINA WebSocket - reconnecting');
        this.disconnect();
        this.scheduleReconnect();
      } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping to keep connection alive
        this.ws.ping();
      }
      
    }, 30000); // Check every 30 seconds
  }

  // Stop heartbeat monitoring
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnect() {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('💥 Max reconnect attempts reached for NINA WebSocket');
        this.emit('maxReconnectReached');
      }
      return;
    }

    this.clearReconnectTimeout();

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`🔄 Scheduling NINA WebSocket reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectAttempts++;
      await this.connect();
    }, delay);
  }

  // Clear reconnect timeout
  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Disconnect WebSocket
  disconnect() {
    this.isConnected = false;
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Destroy client
  destroy() {
    console.log('💥 Destroying NINA WebSocket client');
    this.isDestroyed = true;
    this.disconnect();
    this.removeAllListeners();
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      wsUrl: this.getWebSocketUrl()
    };
  }
}

module.exports = NINAWebSocketClient;
