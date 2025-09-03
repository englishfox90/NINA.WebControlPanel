// WebSocket Manager for NINA Session State
// Handles WebSocket connections, reconnection, heartbeat monitoring

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor(ninaService, config = {}) {
    super();
    this.ninaService = ninaService;
    this.wsConnection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 2000;
    this.isDestroyed = false;
    
    // Connection health monitoring
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.connectionHealthCheck = null;
    
    // Event deduplication at WebSocket level
    this.recentEvents = new Map();
    this.eventDeduplicationWindow = 5000; // 5 seconds
  }

  async connect() {
    if (this.isDestroyed) return;
    
    // Clean up existing connection first
    this.cleanup(false);
    
    return new Promise((resolve, reject) => {
      try {
        // Get NINA configuration
        const config = this.ninaService.configDb.getConfig();
        const baseUrl = config.nina.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const wsUrl = `ws://${baseUrl}:${config.nina.apiPort}/v2/socket`;
        
        console.log(`🔌 Connecting to NINA WebSocket: ${wsUrl}`);
        
        this.wsConnection = new WebSocket(wsUrl, {
          handshakeTimeout: 10000,
          perMessageDeflate: false
        });
        
        // Connection timeout
        const timeout = setTimeout(() => {
          console.log('⏱️ WebSocket connection timeout');
          resolve(); // Don't reject - allow continuation with limited functionality
        }, 10000);
        
        // Set up connection event handlers with Promise resolution
        this.setupWebSocketHandlers(resolve, reject, timeout);
        
      } catch (error) {
        console.error('❌ Failed to create NINA WebSocket connection:', error);
        this.scheduleReconnect();
        resolve(); // Don't reject - allow continuation
      }
    });
  }

  setupWebSocketHandlers(resolve = null, reject = null, timeout = null) {
    if (!this.wsConnection || this.isDestroyed) return;

    this.wsConnection.on('open', () => {
      console.log('✅ Connected to NINA WebSocket');
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      // Clear timeout and resolve promise if provided
      if (timeout) clearTimeout(timeout);
      if (resolve) resolve();
      
      // Send SUBSCRIBE message as required by NINA WebSocket API
      // Add a small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        try {
          if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            // NINA WebSocket subscription - subscribe to all events
            const subscribeMessage = JSON.stringify({
              Type: 'SUBSCRIBE',
              Event: '*' // Subscribe to all events
            });
            this.wsConnection.send(subscribeMessage);
            console.log('📡 Subscribed to NINA event stream (all events)');
          } else {
            console.warn('⚠️ WebSocket not ready for SUBSCRIBE message');
          }
        } catch (error) {
          console.error('❌ Failed to send SUBSCRIBE message:', error);
        }
      }, 100); // 100ms delay
      
      // Clear any existing reconnect interval
      this.clearReconnectInterval();
      
      // Start heartbeat monitoring
      this.startHeartbeat();
      
      // Emit connected event
      this.emit('connected');
    });

    this.wsConnection.on('message', (data) => {
      this.handleWebSocketMessage(data);
    });

    this.wsConnection.on('close', (code, reason) => {
      console.log(`❌ NINA WebSocket connection closed (code: ${code}, reason: ${reason})`);
      this.stopHeartbeat();
      
      // Clear timeout and resolve promise if connection failed during initial connect
      if (timeout) {
        clearTimeout(timeout);
        if (resolve) resolve(); // Don't reject - allow continuation
      }
      
      this.emit('disconnected', { code, reason });
      this.scheduleReconnect();
    });

    this.wsConnection.on('error', (error) => {
      console.error('❌ NINA WebSocket error:', error.message);
      
      // Clear timeout and resolve promise if connection failed during initial connect
      if (timeout) {
        clearTimeout(timeout);
        if (resolve) resolve(); // Don't reject - allow continuation
      }
      
      this.emit('error', error);
    });

    // Handle ping/pong for connection health
    this.wsConnection.on('ping', () => {
      this.lastHeartbeat = Date.now();
      this.wsConnection.pong();
    });

    this.wsConnection.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
  }

  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        try {
          this.wsConnection.ping();
        } catch (error) {
          console.error('❌ Failed to send ping:', error);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  handleWebSocketMessage(data) {
    if (this.isDestroyed) return;
    
    try {
      this.lastHeartbeat = Date.now();
      
      const message = JSON.parse(data.toString());
      
      // Handle NINA's actual WebSocket message format
      if (message.Type === 'Socket' && message.Success && message.Response?.Event) {
        const eventType = message.Response.Event;
        const now = Date.now();
        
        // Check for duplicate events (WebSocket-level deduplication)
        const eventKey = `${eventType}-${JSON.stringify(message.Response.Data) || ''}`;
        const lastEventTime = this.recentEvents.get(eventKey);
        
        if (lastEventTime && (now - lastEventTime) < this.eventDeduplicationWindow) {
          console.log('🔕 Filtered duplicate WebSocket event:', eventType, `(${now - lastEventTime}ms ago)`);
          return;
        }
        
        // Store this event
        this.recentEvents.set(eventKey, now);
        
        // Cleanup old events (keep Map size reasonable)
        if (this.recentEvents.size > 100) {
          const cutoffTime = now - this.eventDeduplicationWindow;
          for (const [key, timestamp] of this.recentEvents.entries()) {
            if (timestamp < cutoffTime) {
              this.recentEvents.delete(key);
            }
          }
        }
        
        // This is a NINA event - format it for our system
        const ninaEvent = {
          Event: eventType,
          Time: new Date().toISOString(),
          Timestamp: new Date().toISOString(),
          // Flatten the response data to match expected structure
          ...message.Response,
          Data: message.Response // Keep original for reference
        };
        
        console.log('📡 NINA WebSocket Event:', ninaEvent.Event, 'received at', new Date().toISOString());
        
        // Emit NINA event to listeners
        this.emit('ninaEvent', ninaEvent);
        
      } else if (message.Type === 'HEARTBEAT') {
        // Handle heartbeat from NINA
        console.log('💓 Received NINA heartbeat');
      } else {
        console.log('📥 Received NINA message:', message.Type, message.Success ? '✅' : '❌');
      }
      
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  }

  scheduleReconnect() {
    if (this.isDestroyed) return;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnect attempts reached, giving up');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.clearReconnectInterval();

    // Implement equipment-aware reconnection delays
    // Shorter delays for first few attempts (equipment state changes settle quickly)
    const isEquipmentRelated = this.reconnectAttempts < 3;
    const baseDelay = isEquipmentRelated ? 2000 : 5000; // 2s for equipment, 5s for other issues
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), 60000); // Max 60s delay
    
    console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}) - ${isEquipmentRelated ? 'equipment-aware' : 'standard'} delay`);
    
    this.reconnectInterval = setTimeout(() => {
      this.reconnectAttempts++;
      console.log('🔄 Attempting WebSocket reconnection after equipment state change...');
      this.connect();
    }, delay);
  }

  reconnect() {
    console.log('🔄 Manual WebSocket reconnection triggered');
    this.cleanup(false);
    this.connect();
  }

  clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  checkConnectionHealth() {
    if (this.isDestroyed) return false;
    
    const now = Date.now();
    const timeSinceHeartbeat = now - this.lastHeartbeat;
    
    // If no activity for 5 minutes, consider connection stale
    if (timeSinceHeartbeat > 5 * 60 * 1000) {
      console.warn('⚠️ WebSocket connection appears stale, attempting reconnect');
      this.reconnect();
      return false;
    }
    
    return true;
  }

  cleanup(removeListeners = true) {
    console.log('🧹 Cleaning up WebSocketManager resources...');
    
    this.stopHeartbeat();
    this.clearReconnectInterval();
    
    // Close WebSocket connection
    if (this.wsConnection) {
      try {
        if (this.wsConnection.readyState === WebSocket.OPEN) {
          this.wsConnection.close();
        }
      } catch (error) {
        console.error('❌ Error closing WebSocket:', error);
      }
      this.wsConnection = null;
    }
    
    // Remove event listeners if requested
    if (removeListeners) {
      this.removeAllListeners();
    }
  }

  destroy() {
    console.log('💥 Destroying WebSocketManager...');
    this.isDestroyed = true;
    this.cleanup(true);
  }

  // Getter for connection status
  get isConnected() {
    return this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN;
  }
}

module.exports = WebSocketManager;
