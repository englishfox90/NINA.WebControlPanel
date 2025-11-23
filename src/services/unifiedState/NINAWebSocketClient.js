// NINA WebSocket Client
// Connects to NINA's /socket WebSocket endpoint for live event streaming
// Handles reconnection logic and event forwarding

const WebSocket = require('ws');

class NINAWebSocketClient {
  constructor(baseUrl, port, onEvent) {
    this.baseUrl = baseUrl;
    this.port = port;
    this.onEvent = onEvent; // Callback for each event received
    this.ws = null;
    this.reconnectTimeout = null;
    this.reconnectDelay = 5000; // 5 seconds
    this.isConnecting = false;
    this.shouldReconnect = true;
    
    console.log(`🔌 NINAWebSocketClient configured for ${baseUrl}:${port}/socket`);
  }

  /**
   * Connect to NINA WebSocket
   */
  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('⚠️ Already connected or connecting to NINA WebSocket');
      return;
    }

    this.isConnecting = true;
    // Remove http:// or https:// prefix and any trailing slashes
    const cleanHost = this.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `ws://${cleanHost}:${this.port}/v2/socket`;
    
    console.log(`📡 Connecting to NINA WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl, {
        handshakeTimeout: 10000
      });

      this.ws.on('open', () => {
        this.isConnecting = false;
        console.log('✅ Connected to NINA WebSocket');
        
        // Clear any pending reconnection
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // NINA wraps events in a Response object
          // Extract the actual event from Response.Response or use the message directly
          const event = message.Response || message;
          const eventType = event.Event || event.Type || 'unknown';
          
          console.log(`📨 NINA Event: ${eventType}`);
          
          // Forward event to callback
          if (this.onEvent) {
            this.onEvent(event);
          }
        } catch (error) {
          console.error('❌ Failed to parse NINA WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        this.isConnecting = false;
        console.error('❌ NINA WebSocket error:', error.message);
      });

      this.ws.on('close', (code, reason) => {
        this.isConnecting = false;
        console.log(`🔌 NINA WebSocket closed: ${code} - ${reason || 'No reason'}`);
        
        // Attempt reconnection if enabled
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Failed to create NINA WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    console.log(`⏱️ Will attempt to reconnect in ${this.reconnectDelay / 1000} seconds...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      console.log('🔄 Attempting to reconnect to NINA WebSocket...');
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from NINA WebSocket
   */
  disconnect() {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    console.log('🔌 Disconnected from NINA WebSocket');
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getStatus() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

module.exports = NINAWebSocketClient;
