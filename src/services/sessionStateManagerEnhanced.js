// Enhanced Session State Manager with Reducer Pattern Integration
// Maintains backward compatibility while adding sophisticated session state management

const { SessionStateReducer, EMPTY_SESSION_STATE } = require('./sessionStateReducer');
const WebSocket = require('ws');
const EventEmitter = require('events');

class SessionStateManagerEnhanced extends EventEmitter {
  constructor(ninaService, config = {}) {
    super();
    this.ninaService = ninaService;
    this.events = [];
    this.wsConnection = null;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
    this.isDestroyed = false;
    
    // Memory management settings
    this.maxEvents = 500;
    this.eventCleanupInterval = 30000;
    this.lastCleanup = Date.now();
    
    // Connection health monitoring
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.connectionHealthCheck = null;
    
    // Enhanced Reducer Pattern Integration
    this.reducer = new SessionStateReducer(config);
    this.sessionState = EMPTY_SESSION_STATE;
    this.legacySessionState = this.getEmptyLegacySessionState(); // For backward compatibility
    
    // Session window computation cache
    this.sessionWindowCache = new Map();
    
    // Error handling
    this.setupErrorHandling();
    
    // Initialize
    this.initialize().catch(error => {
      console.error('❌ Enhanced SessionStateManager initialization failed:', error);
    });
  }

  // Legacy format for backward compatibility with existing widgets
  getEmptyLegacySessionState() {
    return {
      target: null,
      filter: null,
      lastImage: null,
      safe: { isSafe: null, time: null },
      activity: { subsystem: null, state: null, since: null },
      lastEquipmentChange: null,
      sessionStart: null,
      isActive: false,
      lastUpdate: null
    };
  }

  setupErrorHandling() {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Promise Rejection in Enhanced SessionStateManager:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception in Enhanced SessionStateManager:', error);
      this.handleCriticalError(error);
    });
  }

  handleCriticalError(error) {
    console.error('💥 Critical error encountered, attempting recovery:', error.message);
    this.cleanup(false);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        console.log('🔄 Attempting recovery after critical error...');
        this.initialize().catch(err => {
          console.error('❌ Recovery failed:', err);
        });
      }
    }, 5000);
  }

  async initialize() {
    if (this.isDestroyed) return;
    
    try {
      console.log('🔄 Initializing Enhanced SessionStateManager with reducer pattern...');
      
      // Seed with event history
      await this.seedEventHistory();
      
      // Process session state with both systems
      this.processEnhancedSessionState();
      
      // Start memory management
      this.startMemoryManagement();
      
      // Connect to NINA WebSocket
      this.connectToNINA();
      
      this.isInitialized = true;
      console.log('[BACKEND] ✅ Enhanced SessionStateManager initialized');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced SessionStateManager:', error);
    }
  }

  startMemoryManagement() {
    // Periodic cleanup
    this.eventCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, this.eventCleanupInterval);

    // Connection health monitoring
    this.connectionHealthCheck = setInterval(() => {
      this.checkConnectionHealth();
    }, 60000);
  }

  performMemoryCleanup() {
    if (this.isDestroyed) return;
    
    const beforeCount = this.events.length;
    const now = Date.now();
    
    // Keep events from last 4 hours
    const fourHoursAgo = now - (4 * 60 * 60 * 1000);
    this.events = this.events
      .filter(event => {
        const eventTime = new Date(event.Time).getTime();
        return eventTime > fourHoursAgo;
      })
      .slice(0, this.maxEvents);

    const afterCount = this.events.length;
    
    if (beforeCount !== afterCount) {
      console.log(`🧹 Memory cleanup: Removed ${beforeCount - afterCount} old events (${afterCount} remaining)`);
    }

    // Clear session window cache
    this.sessionWindowCache.clear();

    if (global.gc) {
      global.gc();
    }

    this.lastCleanup = now;
  }

  checkConnectionHealth() {
    if (this.isDestroyed) return;
    
    const now = Date.now();
    const timeSinceHeartbeat = now - this.lastHeartbeat;
    
    if (timeSinceHeartbeat > 5 * 60 * 1000) {
      console.warn('⚠️ WebSocket connection appears stale, attempting reconnect');
      this.reconnectWebSocket();
    }
  }

  async seedEventHistory() {
    try {
      console.log('📚 Seeding enhanced session state with NINA event history...');
      const eventHistoryResponse = await this.ninaService.getEventHistory();
      
      if (eventHistoryResponse?.Success && Array.isArray(eventHistoryResponse.Response)) {
        this.events = eventHistoryResponse.Response.slice(0, this.maxEvents);
        console.log(`✅ Seeded with ${this.events.length} historical events`);
      } else {
        console.warn('⚠️ No event history available');
        this.events = [];
      }
      
    } catch (error) {
      console.error('❌ Failed to seed event history:', error);
      this.events = [];
    }
  }

  connectToNINA() {
    if (this.isDestroyed) return;
    
    this.cleanup(false);
    
    try {
      const config = this.ninaService.configDb.getConfig();
      const baseUrl = config.nina.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const wsUrl = `ws://${baseUrl}:${config.nina.apiPort}/v2/socket`;
      
      console.log(`🔌 Enhanced manager connecting to NINA WebSocket: ${wsUrl}`);
      
      this.wsConnection = new WebSocket(wsUrl, {
        handshakeTimeout: 10000,
        perMessageDeflate: false
      });
      
      this.setupWebSocketHandlers();
      
    } catch (error) {
      console.error('❌ Failed to create NINA WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  setupWebSocketHandlers() {
    if (!this.wsConnection || this.isDestroyed) return;

    this.wsConnection.on('open', () => {
      console.log('✅ Enhanced manager connected to NINA WebSocket');
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      if (this.wsConnection.readyState === WebSocket.OPEN) {
        console.log('📡 Enhanced manager sending SUBSCRIBE message');
        this.wsConnection.send('SUBSCRIBE /v2/socket');
      }
      
      this.clearReconnectInterval();
      this.startHeartbeat();
    });

    this.wsConnection.on('message', (data) => {
      this.handleWebSocketMessage(data);
    });

    this.wsConnection.on('close', (code, reason) => {
      console.log(`❌ Enhanced manager WebSocket closed (code: ${code}, reason: ${reason})`);
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.wsConnection.on('error', (error) => {
      console.error('❌ Enhanced manager WebSocket error:', error.message);
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.wsConnection.on('ping', () => {
      this.lastHeartbeat = Date.now();
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.pong();
      }
    });

    this.wsConnection.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        try {
          this.wsConnection.ping();
        } catch (error) {
          console.error('❌ Failed to send heartbeat ping:', error);
          this.reconnectWebSocket();
        }
      }
    }, 30000);
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
      
      if (message.Success && message.Response && message.Response.Event) {
        const event = message.Response;
        
        if (!event.Event) {
          console.warn('⚠️ Invalid event received, skipping:', event);
          return;
        }

        const eventTime = event.Time || 
                         (event.ImageStatistics && event.ImageStatistics.Date) || 
                         new Date().toISOString();
        
        console.log('📡 Enhanced NINA Event:', event.Event, 'at', eventTime);
        
        // Add event with proper timestamp
        const eventWithTime = { ...event, Time: eventTime };
        this.addEvent(eventWithTime);
        
        // Process with enhanced reducer pattern
        this.processEnhancedSessionState();
        
        // Emit for backward compatibility
        this.emit('ninaEvent', event.Event, event);
        
        // Handle special events for legacy compatibility
        this.handleEquipmentEvent(event);
        this.handleSafetyEvent(event);
        
      }
    } catch (error) {
      console.error('❌ Error processing enhanced WebSocket message:', error);
    }
  }

  /**
   * Enhanced Session State Processing with Reducer Pattern
   */
  processEnhancedSessionState() {
    if (this.isDestroyed) return;
    
    try {
      console.log('🧠 Processing session state with enhanced reducer pattern...');
      
      // Step 1: Compute session window for all events
      this.computeSessionWindows();
      
      // Step 2: Apply reducer pattern to all events
      let newState = EMPTY_SESSION_STATE;
      
      // Sort events by timestamp
      const sortedEvents = this.events
        .filter(event => event && event.Time)
        .sort((a, b) => new Date(a.Time) - new Date(b.Time));
      
      // Apply reducer to each event sequentially
      for (const event of sortedEvents) {
        newState = this.reducer.reduce(newState, event);
      }
      
      // Update session state
      const stateChanged = JSON.stringify(newState) !== JSON.stringify(this.sessionState);
      this.sessionState = newState;
      
      // Generate legacy format for backward compatibility
      this.legacySessionState = this.convertToLegacyFormat(newState);
      
      console.log('✅ Enhanced session state processed:', {
        hasTarget: !!newState.target.name,
        currentFilter: newState.filter.name,
        isSafe: newState.safety.isSafe,
        activity: newState.activity.state,
        lastImage: newState.image.lastSavedAt
      });
      
      // Emit updates
      if (this.isInitialized) {
        // Enhanced format for new consumers
        setImmediate(() => {
          if (!this.isDestroyed) {
            this.emit('sessionUpdate', this.legacySessionState); // Legacy compatibility
            this.emit('enhancedSessionUpdate', this.sessionState); // New format
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error in enhanced session state processing:', error);
    }
  }

  /**
   * Compute session windows for all events
   */
  computeSessionWindows() {
    // Find all SEQUENCE-STARTING and SEQUENCE-FINISHED events
    const sequenceEvents = this.events.filter(event => 
      event.Event === 'SEQUENCE-STARTING' || 
      event.Event === 'SEQUENCE-FINISHED'
    );
    
    // Sort by time
    sequenceEvents.sort((a, b) => new Date(a.Time) - new Date(b.Time));
    
    // Build session windows [start, end) pairs
    this.sessionWindows = [];
    let currentStart = null;
    
    for (const event of sequenceEvents) {
      if (event.Event === 'SEQUENCE-STARTING') {
        currentStart = new Date(event.Time);
      } else if (event.Event === 'SEQUENCE-FINISHED' && currentStart) {
        this.sessionWindows.push({
          start: currentStart,
          end: new Date(event.Time)
        });
        currentStart = null;
      }
    }
    
    // If we have an active session (SEQUENCE-STARTING without SEQUENCE-FINISHED)
    if (currentStart) {
      this.sessionWindows.push({
        start: currentStart,
        end: null // Active session
      });
    }
    
    console.log(`📊 Computed ${this.sessionWindows.length} session windows`);
  }

  /**
   * Convert enhanced state to legacy format for backward compatibility
   */
  convertToLegacyFormat(enhancedState) {
    return {
      target: enhancedState.target.name ? {
        name: enhancedState.target.name,
        project: enhancedState.target.project,
        ra: enhancedState.target.raString,
        dec: enhancedState.target.decString,
        rotation: enhancedState.target.rotation,
        since: enhancedState.target.since
      } : null,
      
      filter: enhancedState.filter.name ? {
        name: enhancedState.filter.name,
        since: enhancedState.filter.since
      } : null,
      
      lastImage: enhancedState.image.lastSavedAt ? {
        time: enhancedState.image.lastSavedAt
      } : null,
      
      safe: {
        isSafe: enhancedState.safety.isSafe,
        time: enhancedState.safety.changedAt
      },
      
      activity: {
        subsystem: enhancedState.activity.subsystem,
        state: enhancedState.activity.state,
        since: enhancedState.activity.since
      },
      
      lastEquipmentChange: enhancedState.equipmentLastChange.device ? {
        device: enhancedState.equipmentLastChange.device,
        event: enhancedState.equipmentLastChange.event,
        time: enhancedState.equipmentLastChange.at
      } : null,
      
      sessionStart: this.sessionWindows.length > 0 ? 
        this.sessionWindows[this.sessionWindows.length - 1].start?.toISOString() : null,
      
      isActive: this.sessionWindows.some(window => !window.end),
      
      lastUpdate: new Date().toISOString()
    };
  }

  // Legacy methods for backward compatibility
  handleEquipmentEvent(event) {
    if (event.Event.endsWith('-CONNECTED') || event.Event.endsWith('-DISCONNECTED')) {
      const device = event.Event.split('-')[0];
      const eventType = event.Event.endsWith('-CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
      
      const equipmentEvent = {
        device,
        event: eventType,
        time: event.Time,
        originalEvent: event.Event
      };
      
      setImmediate(() => {
        if (!this.isDestroyed) {
          this.emit('equipmentChange', equipmentEvent);
        }
      });
    }
  }

  handleSafetyEvent(event) {
    if (event.Event === 'FLAT-LIGHT-TOGGLED' || event.Event === 'SAFETY-CHANGED') {
      const safetyEvent = {
        eventType: event.Event,
        time: event.Time,
        data: event.Data || {},
        originalEvent: event
      };
      
      setImmediate(() => {
        if (!this.isDestroyed) {
          this.emit('safetyChange', safetyEvent);
        }
      });
    }
  }

  addEvent(event) {
    this.events.unshift(event);
    
    if (this.events.length > this.maxEvents) {
      const excess = this.events.length - this.maxEvents;
      this.events = this.events.slice(0, this.maxEvents);
      console.log(`🧹 Immediate cleanup: Removed ${excess} excess events`);
    }
  }

  scheduleReconnect() {
    if (this.isDestroyed) return;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💀 Max WebSocket reconnection attempts reached');
      return;
    }

    this.clearReconnectInterval();

    const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 60000);
    console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms`);
    
    this.reconnectInterval = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectInterval = null;
      this.connectToNINA();
    }, delay);
  }

  reconnectWebSocket() {
    console.log('🔄 Manual WebSocket reconnection triggered');
    this.cleanup(false);
    this.connectToNINA();
  }

  clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  // Getters for enhanced state access
  getEnhancedSessionState() {
    return this.sessionState;
  }

  getLegacySessionState() {
    return this.legacySessionState;
  }

  // Backward compatibility method for existing API endpoints
  getSessionState() {
    return this.getLegacySessionState();
  }

  getCurrentSessionWindow() {
    return this.sessionWindows.find(window => !window.end) || null;
  }

  // Utility methods for timezone handling
  formatTimeForUser(utcTimestamp, format) {
    return this.reducer.formatForDisplay(utcTimestamp, format);
  }

  calculateSessionDuration() {
    const currentWindow = this.getCurrentSessionWindow();
    if (!currentWindow) return null;
    
    const endTime = currentWindow.end || new Date();
    return this.reducer.calculateDuration(
      currentWindow.start.toISOString(),
      endTime.toISOString()
    );
  }

  cleanup(destroy = true) {
    console.log('🧹 Cleaning up Enhanced SessionStateManager...');
    
    if (this.wsConnection) {
      try {
        this.wsConnection.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.wsConnection = null;
    }

    this.stopHeartbeat();
    this.clearReconnectInterval();

    if (this.eventCleanupInterval) {
      clearInterval(this.eventCleanupInterval);
      this.eventCleanupInterval = null;
    }

    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }

    this.sessionWindowCache.clear();

    if (destroy) {
      this.isDestroyed = true;
      this.removeAllListeners();
    }
  }

  destroy() {
    this.cleanup(true);
  }
}

module.exports = SessionStateManagerEnhanced;
