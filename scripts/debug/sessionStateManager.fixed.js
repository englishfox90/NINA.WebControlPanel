// Enhanced Session State Manager with Memory Leak Prevention and Stability Fixes
// Fixes for backend process crashing after ~20 minutes

const WebSocket = require('ws');
const EventEmitter = require('events');

class SessionStateManager extends EventEmitter {
  constructor(ninaService) {
    super();
    this.ninaService = ninaService;
    this.events = [];
    this.sessionState = this.getEmptySessionState();
    this.wsConnection = null;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
    
    // Memory management settings
    this.maxEvents = 500;  // Reduced from 1000 to prevent memory buildup
    this.eventCleanupInterval = 30000; // Clean up every 30 seconds
    this.lastCleanup = Date.now();
    this.isDestroyed = false;
    
    // Connection health monitoring
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.connectionHealthCheck = null;
    
    // Error handling and crash prevention
    this.setupErrorHandling();
    
    // Initialize the session state manager
    this.initialize().catch(error => {
      console.error('❌ SessionStateManager initialization failed:', error);
    });
  }

  setupErrorHandling() {
    // Prevent crashes from unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Promise Rejection in SessionStateManager:', reason);
      console.error('   Promise:', promise);
      // Don't crash the process - log and continue
    });

    // Handle uncaught exceptions gracefully
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception in SessionStateManager:', error);
      // Try to cleanup and restart connection
      this.handleCriticalError(error);
    });
  }

  handleCriticalError(error) {
    console.error('💥 Critical error encountered, attempting recovery:', error.message);
    
    // Clean up current connection
    this.cleanup(false);
    
    // Attempt to reinitialize after a delay
    setTimeout(() => {
      if (!this.isDestroyed) {
        console.log('🔄 Attempting recovery after critical error...');
        this.initialize().catch(err => {
          console.error('❌ Recovery failed:', err);
        });
      }
    }, 5000);
  }

  getEmptySessionState() {
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

  async initialize() {
    if (this.isDestroyed) return;
    
    try {
      console.log('🔄 Initializing SessionStateManager with enhanced stability...');
      
      // Seed with event history
      await this.seedEventHistory();
      
      // Process initial session state
      this.processSessionState();
      
      // Start periodic memory cleanup
      this.startMemoryManagement();
      
      // Start WebSocket connection to NINA
      this.connectToNINA();
      
      this.isInitialized = true;
      console.log('[BACKEND] ✅ SessionStateManager initialized with stability enhancements');
      
      // Emit initialized event for config-server.js
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize SessionStateManager:', error);
      // Don't throw - try to continue with limited functionality
    }
  }

  startMemoryManagement() {
    // Periodic cleanup of old events and memory optimization
    this.eventCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, this.eventCleanupInterval);

    // Connection health monitoring
    this.connectionHealthCheck = setInterval(() => {
      this.checkConnectionHealth();
    }, 60000); // Every minute
  }

  performMemoryCleanup() {
    if (this.isDestroyed) return;
    
    const beforeCount = this.events.length;
    const now = Date.now();
    
    // Keep only recent events (last 4 hours or max 500 events)
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

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.lastCleanup = now;
  }

  checkConnectionHealth() {
    if (this.isDestroyed) return;
    
    const now = Date.now();
    const timeSinceHeartbeat = now - this.lastHeartbeat;
    
    // If no activity for 5 minutes, consider connection stale
    if (timeSinceHeartbeat > 5 * 60 * 1000) {
      console.warn('⚠️ WebSocket connection appears stale, attempting reconnect');
      this.reconnectWebSocket();
    }
  }

  async seedEventHistory() {
    try {
      console.log('📚 Seeding session state with NINA event history...');
      const eventHistoryResponse = await this.ninaService.getEventHistory();
      
      if (eventHistoryResponse?.Success && Array.isArray(eventHistoryResponse.Response)) {
        // Limit initial event history to prevent memory issues
        this.events = eventHistoryResponse.Response.slice(0, this.maxEvents);
        console.log(`✅ Seeded with ${this.events.length} historical events (limited for memory efficiency)`);
      } else {
        console.warn('⚠️ No event history available, starting with empty state');
        this.events = [];
      }
      
    } catch (error) {
      console.error('❌ Failed to seed event history:', error);
      this.events = [];
      // Don't throw - continue with empty events
    }
  }

  connectToNINA() {
    if (this.isDestroyed) return;
    
    // Clean up existing connection first
    this.cleanup(false);
    
    try {
      // Get NINA configuration
      const config = this.ninaService.configDb.getConfig();
      const baseUrl = config.nina.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const wsUrl = `ws://${baseUrl}:${config.nina.apiPort}/v2/socket`;
      
      console.log(`🔌 Connecting to NINA WebSocket: ${wsUrl}`);
      
      this.wsConnection = new WebSocket(wsUrl, {
        handshakeTimeout: 10000, // 10 second timeout
        perMessageDeflate: false  // Disable compression to reduce memory
      });
      
      // Set up connection event handlers
      this.setupWebSocketHandlers();
      
    } catch (error) {
      console.error('❌ Failed to create NINA WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  setupWebSocketHandlers() {
    if (!this.wsConnection || this.isDestroyed) return;

    this.wsConnection.on('open', () => {
      console.log('✅ Connected to NINA WebSocket');
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      // Send SUBSCRIBE message as required by NINA WebSocket API
      // Add small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        try {
          console.log('📡 Sending SUBSCRIBE message to NINA WebSocket');
          this.wsConnection.send('SUBSCRIBE /v2/socket');
        } catch (error) {
          console.error('❌ Failed to send SUBSCRIBE message:', error);
        }
      }, 100); // 100ms delay
      
      // Clear any existing reconnect interval
      this.clearReconnectInterval();
      
      // Start heartbeat monitoring
      this.startHeartbeat();
    });

    this.wsConnection.on('message', (data) => {
      this.handleWebSocketMessage(data);
    });

    this.wsConnection.on('close', (code, reason) => {
      console.log(`❌ NINA WebSocket connection closed (code: ${code}, reason: ${reason})`);
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.wsConnection.on('error', (error) => {
      console.error('❌ NINA WebSocket error:', error.message);
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    // Handle ping/pong for connection health
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
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        try {
          this.wsConnection.ping();
        } catch (error) {
          console.error('❌ Failed to send heartbeat ping:', error);
          this.reconnectWebSocket();
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
      
      if (message.Success && message.Response && message.Response.Event) {
        const event = message.Response;
        
        // Validate event before processing
        if (!event.Event || !event.Time) {
          console.warn('⚠️ Invalid event received, skipping:', event);
          return;
        }

        console.log('📡 NINA WebSocket Event:', event.Event, 'at', event.Time);
        
        // Handle equipment events
        this.handleEquipmentEvent(event);
        
        // Handle safety events
        this.handleSafetyEvent(event);
        
        // Add event to our events array with memory management
        this.addEvent(event);
        
        // Reprocess session state
        this.processSessionState();
        
      } else {
        // Don't log every non-event message to reduce noise
        if (message.Success === false) {
          console.warn('⚠️ NINA WebSocket error response:', message);
        }
      }
    } catch (error) {
      console.error('❌ Error processing NINA WebSocket message:', error);
      console.error('   Raw message data:', data.toString().substring(0, 200) + '...');
      // Don't crash - just log and continue
    }
  }

  handleEquipmentEvent(event) {
    if (event.Event.endsWith('-CONNECTED') || event.Event.endsWith('-DISCONNECTED')) {
      const device = event.Event.split('-')[0];
      const eventType = event.Event.endsWith('-CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
      
      console.log('⚙️ Real-time equipment event detected:', event.Event);
      
      const equipmentEvent = {
        device,
        event: eventType,
        time: event.Time,
        originalEvent: event.Event
      };
      
      // Emit equipment event immediately for real-time updates
      setImmediate(() => {
        if (!this.isDestroyed) {
          this.emit('equipmentChange', equipmentEvent);
        }
      });
    }
  }

  handleSafetyEvent(event) {
    if (event.Event === 'FLAT-LIGHT-TOGGLED' || event.Event === 'SAFETY-CHANGED') {
      console.log('🚨 Safety-related event detected:', event.Event);
      
      const safetyEvent = {
        eventType: event.Event,
        time: event.Time,
        data: event.Data || {},
        originalEvent: event
      };
      
      // Emit safety event immediately
      setImmediate(() => {
        if (!this.isDestroyed) {
          this.emit('safetyChange', safetyEvent);
        }
      });
    }
  }

  addEvent(event) {
    // Add event to the beginning of the array
    this.events.unshift(event);
    
    // Immediate cleanup if we exceed memory limits
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

    const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 60000); // Max 60s delay
    console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
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

  // Process session state from events array (your comprehensive algorithm) - UNCHANGED
  processSessionState() {
    if (this.isDestroyed) return;
    
    const now = new Date();
    const processedState = this.processNINAEvents(this.events, now);
    
    // Only log if debug mode is enabled to reduce log noise
    if (process.env.DEBUG_SESSION) {
      console.log('🔍 Current session state:', JSON.stringify(this.sessionState, null, 2));
      console.log('🔍 New processed state:', JSON.stringify(processedState, null, 2));
    }
    
    // Update session state if changed
    const stateChanged = JSON.stringify(processedState) !== JSON.stringify(this.sessionState);
    
    // Force update with new timestamp for real-time events
    this.sessionState = {
      ...processedState,
      lastUpdate: now.toISOString()
    };
    
    console.log('🔄 Session state updated:', this.sessionState.isActive ? 'Active' : 'Idle');
    
    // Always emit update to frontend clients when processing new events
    if (this.isInitialized) {
      console.log('📡 Emitting sessionUpdate event to frontend');
      setImmediate(() => {
        if (!this.isDestroyed) {
          this.emit('sessionUpdate', this.sessionState);
        }
      });
    }
  }

  // Your comprehensive NINA event processing algorithm - UNCHANGED but with error protection
  processNINAEvents(events, now = new Date()) {
    try {
      if (!events || events.length === 0) {
        return this.getEmptySessionState();
      }

      console.log('🔄 Processing session data from', events.length, 'events');
      
      // Step 1: Parse times and sort with error handling
      const sortedEvents = events
        .filter(event => event && event.Time) // Filter out invalid events
        .map(event => {
          try {
            return {
              ...event,
              parsedTime: new Date(event.Time)
            };
          } catch (error) {
            console.warn('⚠️ Invalid event time format:', event.Time);
            return null;
          }
        })
        .filter(event => event !== null) // Remove invalid events
        .sort((a, b) => a.parsedTime.getTime() - b.parsedTime.getTime());

      // Continue with rest of your existing algorithm...
      // [REST OF THE ALGORITHM REMAINS THE SAME - copying from original]
      
      const nowTime = now.getTime();
      let sequenceStartIndex = -1;
      let sequenceEndIndex = -1;

      // Find last SEQUENCE-STARTING at or before now
      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        if (sortedEvents[i].Event === 'SEQUENCE-STARTING' && sortedEvents[i].parsedTime.getTime() <= nowTime) {
          sequenceStartIndex = i;
          break;
        }
      }

      if (sequenceStartIndex === -1) {
        console.log('❌ No active session found');
        return this.getEmptySessionState();
      }

      // Find first SEQUENCE-FINISHED after that start
      for (let i = sequenceStartIndex + 1; i < sortedEvents.length; i++) {
        if (sortedEvents[i].Event === 'SEQUENCE-FINISHED') {
          sequenceEndIndex = i;
          break;
        }
      }

      // Step 3: Extract session slice
      const sessionSlice = sequenceEndIndex === -1 
        ? sortedEvents.slice(sequenceStartIndex)
        : sortedEvents.slice(sequenceStartIndex, sequenceEndIndex);

      console.log('📊 Session slice:', sessionSlice.length, 'events from', 
                  sessionSlice[0]?.Time, 'to', sessionSlice[sessionSlice.length - 1]?.Time);

      // Step 4: Process session state
      let target = null;
      let filter = null;
      let lastImage = null;
      let safe = { isSafe: null, time: null };
      let activity = { subsystem: null, state: null, since: null };
      let lastEquipmentChange = null;

      // Track equipment states for activity determination
      let lastAutofocusStart = null;
      let lastGuiderEvent = null;
      let lastMountEvent = null;
      let lastRotatorEvent = null;

      // Process safety from entire feed (not just session slice)
      for (const event of sortedEvents) {
        if (event.Event === 'SAFETY-CHANGED' && 'IsSafe' in event) {
          safe = {
            isSafe: event.IsSafe,
            time: event.Time
          };
        }
      }

      // Process equipment changes from entire feed for real-time updates
      let mostRecentEquipmentTime = null;
      for (const event of sortedEvents) {
        if (event.Event.endsWith('-CONNECTED') || event.Event.endsWith('-DISCONNECTED')) {
          const device = event.Event.split('-')[0];
          const eventType = event.Event.endsWith('-CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
          
          const eventTime = event.Time;
          const eventDate = new Date(eventTime);
          
          // Only update if this is the most recent equipment event
          if (!mostRecentEquipmentTime || eventDate > mostRecentEquipmentTime) {
            mostRecentEquipmentTime = eventDate;
            lastEquipmentChange = {
              device,
              event: eventType,
              time: eventTime
            };
            // console.log('🔧 Updated lastEquipmentChange (most recent):', lastEquipmentChange);
          }
        }
      }

      // Process session slice events
      for (const event of sessionSlice) {
        // Target state
        if (event.Event === 'TS-NEWTARGETSTART' || event.Event === 'TS-TARGETSTART') {
          if ('TargetName' in event && 'ProjectName' in event) {
            target = {
              name: event.TargetName,
              project: event.ProjectName,
              coordinates: event.Coordinates || {
                ra: 0, dec: 0, raString: 'N/A', decString: 'N/A', 
                epoch: 'J2000', raDegrees: 0
              },
              rotation: event.Rotation || null
            };
          }
        }

        // Filter state
        if (event.Event === 'FILTERWHEEL-CHANGED' && 'New' in event) {
          const newFilter = event.New;
          filter = {
            name: newFilter.Name || newFilter.Id?.toString() || 'Unknown'
          };
        }

        // Last image capture
        if (event.Event === 'IMAGE-SAVE') {
          lastImage = { time: event.Time };
        }

        // Equipment activity tracking
        if (event.Event === 'AUTOFOCUS-START') {
          lastAutofocusStart = event.Time;
        } else if (event.Event === 'AUTOFOCUS-FINISHED') {
          lastAutofocusStart = null;
        }

        if (event.Event === 'GUIDER-START' || event.Event === 'GUIDER-STOP' || event.Event === 'GUIDER-DISCONNECTED') {
          lastGuiderEvent = { event: event.Event, time: event.Time };
        }

        if (event.Event === 'MOUNT-HOMED' || event.Event.includes('MOUNT-')) {
          lastMountEvent = { event: event.Event, time: event.Time };
        }

        if (event.Event.includes('ROTATOR-')) {
          lastRotatorEvent = { event: event.Event, time: event.Time };
        }
      }

      // Step 5: Determine current activity (priority order)
      if (lastAutofocusStart) {
        activity = {
          subsystem: 'autofocus',
          state: 'running',
          since: lastAutofocusStart
        };
      } else if (lastGuiderEvent?.event === 'GUIDER-START') {
        activity = {
          subsystem: 'guiding',
          state: 'guiding',
          since: lastGuiderEvent.time
        };
      } else if (lastMountEvent) {
        if (lastMountEvent.event === 'MOUNT-HOMED') {
          activity = {
            subsystem: 'mount',
            state: 'homed',
            since: lastMountEvent.time
          };
        } else if (target && !lastImage) {
          // Infer slewing after target start until first image
          activity = {
            subsystem: 'mount',
            state: 'slewing',
            since: lastMountEvent.time
          };
        }
      }

      return {
        target,
        filter,
        lastImage,
        safe,
        activity,
        lastEquipmentChange,
        sessionStart: sortedEvents[sequenceStartIndex]?.Time || null,
        isActive: true
      };
      
    } catch (error) {
      console.error('❌ Error processing NINA events:', error);
      return this.getEmptySessionState();
    }
  }

  // Get current session state
  getSessionState() {
    return this.sessionState;
  }

  // Refresh session state manually
  async refreshSessionState() {
    if (this.isDestroyed) return this.sessionState;
    
    try {
      await this.seedEventHistory();
      this.processSessionState();
      return this.sessionState;
    } catch (error) {
      console.error('❌ Failed to refresh session state:', error);
      return this.sessionState; // Return current state instead of throwing
    }
  }

  // Enhanced cleanup with memory leak prevention
  cleanup(removeListeners = true) {
    console.log('🧹 Cleaning up SessionStateManager resources...');
    
    // Clear intervals
    if (this.eventCleanupInterval) {
      clearInterval(this.eventCleanupInterval);
      this.eventCleanupInterval = null;
    }
    
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
    
    this.stopHeartbeat();
    this.clearReconnectInterval();
    
    // Close WebSocket connection
    if (this.wsConnection) {
      try {
        if (this.wsConnection.readyState === WebSocket.OPEN) {
          this.wsConnection.close(1000, 'Cleanup');
        }
      } catch (error) {
        console.warn('⚠️ Error closing WebSocket:', error.message);
      }
      this.wsConnection = null;
    }
    
    // Clear events array to free memory
    this.events = [];
    
    // Remove event listeners if requested
    if (removeListeners) {
      this.removeAllListeners();
    }
  }

  // Complete cleanup and destroy
  destroy() {
    console.log('💥 Destroying SessionStateManager...');
    this.isDestroyed = true;
    this.isInitialized = false;
    this.cleanup(true);
  }
}

module.exports = SessionStateManager;
