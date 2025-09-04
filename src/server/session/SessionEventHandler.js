// Session Event Handler - Handles live WebSocket events
const EventEmitter = require('events');
const SessionSchema = require('../database/sessionSchema');

class SessionEventHandler extends EventEmitter {
  constructor(configDatabase) {
    super();
    
    this.configDatabase = configDatabase;
    this.sessionSchema = new SessionSchema(configDatabase.db);
    
    // Components will be injected
    this.wsClient = null;
    this.eventNormalizer = null;
    this.sessionFSM = null;
    
    // Recent events cache
    this.recentEvents = [];
    this.maxRecentEvents = 5;
    
    console.log('🎭 SessionEventHandler created');
  }

  // Inject dependencies (called by main manager)
  setWebSocketClient(wsClient) {
    this.wsClient = wsClient;
    
    if (wsClient) {
      wsClient.on('ninaEvent', (rawEvent) => {
        this.handleLiveEvent(rawEvent);
      });
      console.log('🔗 WebSocket client connected to event handler');
    }
  }

  setEventNormalizer(eventNormalizer) {
    this.eventNormalizer = eventNormalizer;
  }

  setSessionFSM(sessionFSM) {
    this.sessionFSM = sessionFSM;
  }

  // Main live event handler
  async handleLiveEvent(rawEvent) {
    try {
      if (!this.eventNormalizer || !this.sessionFSM) {
        console.warn('⚠️ Event handler not fully initialized, skipping event');
        return;
      }

      // Normalize event
      const normalizedEvent = this.eventNormalizer.normalizeEvent(rawEvent);
      if (!normalizedEvent) {
        return;
      }

      console.log(`🎭 Processing live event: ${normalizedEvent.eventType}`);

      // Process through FSM
      const stateChanged = this.sessionFSM.processEvent(normalizedEvent);
      
      // Persist event
      await this.persistEvent(normalizedEvent);
      
      // Update recent events
      this.updateRecentEvents(normalizedEvent);
      
      // Emit for coordination
      this.emit('eventProcessed', normalizedEvent, stateChanged);
      this.emit('ninaEvent', normalizedEvent.eventType, normalizedEvent);
      
      if (stateChanged) {
        console.log(`🎭 State changed due to ${normalizedEvent.eventType}`);
        await this.persistSessionState();
        this.emit('stateChanged', normalizedEvent);
      }
      
    } catch (error) {
      console.error('❌ Error handling live event:', error);
      this.emit('eventError', error, rawEvent);
    }
  }

  // Update recent events cache
  updateRecentEvents(event) {
    this.recentEvents.unshift({
      ...event,
      processedAt: new Date().toISOString()
    });
    
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(0, this.maxRecentEvents);
    }
    
    this.emit('recentEventsUpdated', this.recentEvents);
  }

  // Get recent events for API
  getRecentEvents() {
    return this.recentEvents.slice(0, this.maxRecentEvents);
  }

  // Get event statistics
  getEventStats() {
    return {
      recentEventCount: this.recentEvents.length,
      connectionStatus: this.wsClient?.isConnected || false,
      lastEventTime: this.recentEvents.length > 0 ? this.recentEvents[0].timestamp : null,
      wsStatus: {
        isConnected: this.wsClient?.isConnected || false,
        reconnectAttempts: this.wsClient?.reconnectAttempts || 0,
        lastHeartbeat: this.wsClient?.lastHeartbeat || null
      }
    };
  }

  // Persistence helpers
  async persistEvent(normalizedEvent) {
    try {
      const sessionUuid = this.getCurrentSessionUUID();
      
      this.sessionSchema.addEvent(
        sessionUuid,
        normalizedEvent.eventType,
        normalizedEvent.timestamp,
        {
          ...normalizedEvent.data,
          nina_raw_data: normalizedEvent.originalEvent
        }
      );
      
    } catch (error) {
      console.error('❌ Error persisting event:', error);
    }
  }

  async persistSessionState() {
    if (!this.sessionFSM) return;
    
    try {
      const sessionData = this.sessionFSM.getSessionData();
      const dbFormat = this.convertToDbFormat(sessionData);
      this.sessionSchema.updateState(dbFormat);
    } catch (error) {
      console.error('❌ Error persisting session state:', error);
    }
  }

  getCurrentSessionUUID() {
    if (!this.sessionFSM) return 'session_current';
    
    const sessionData = this.sessionFSM.getSessionData();
    return sessionData.sessionStart ? 
      `session_${new Date(sessionData.sessionStart).getTime()}` : 
      'session_current';
  }

  convertToDbFormat(sessionData) {
    // Helper function to convert dates to strings safely
    const safeDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      return null;
    };

    // Helper function to ensure boolean values are converted to SQLite integers
    const safeBool = (value) => {
      if (value === null || value === undefined) return null;
      return Boolean(value) ? 1 : 0;
    };

    // Helper function to ensure numeric values
    const safeNumber = (value) => {
      if (value === null || value === undefined) return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    return {
      current_session_uuid: this.getCurrentSessionUUID(),
      target_name: sessionData.target?.name || null,
      project_name: sessionData.target?.project || null,
      coordinates: sessionData.target?.coordinates ? JSON.stringify(sessionData.target.coordinates) : null,
      rotation: safeNumber(sessionData.target?.rotation),
      current_filter: sessionData.filter?.name || null,
      last_image_data: sessionData.lastImage ? JSON.stringify(sessionData.lastImage) : null,
      is_safe: sessionData.safe?.isSafe !== undefined ? safeBool(sessionData.safe.isSafe) : null,
      safety_time: safeDate(sessionData.safe?.time),
      activity_subsystem: sessionData.activity?.subsystem || null,
      activity_state: sessionData.activity?.state || null,
      activity_since: safeDate(sessionData.activity?.since),
      last_equipment_change: sessionData.lastEquipmentChange ? JSON.stringify(sessionData.lastEquipmentChange) : null,
      flats_active: safeBool(sessionData.flats?.isActive),
      flats_filter: sessionData.flats?.filter || null,
      flats_brightness: safeNumber(sessionData.flats?.brightness),
      flats_count: safeNumber(sessionData.flats?.imageCount) || 0,
      flats_started_at: safeDate(sessionData.flats?.startedAt),
      flats_last_image_at: safeDate(sessionData.flats?.lastImageAt),
      darks_active: safeBool(sessionData.darks?.isActive),
      darks_exposure_time: safeNumber(sessionData.darks?.currentExposureTime),
      darks_exposure_groups: sessionData.darks?.exposureGroups ? JSON.stringify(sessionData.darks.exposureGroups) : null,
      darks_total_images: safeNumber(sessionData.darks?.totalImages) || 0,
      darks_started_at: safeDate(sessionData.darks?.startedAt),
      darks_last_image_at: safeDate(sessionData.darks?.lastImageAt),
      session_start: safeDate(sessionData.sessionStart),
      is_session_active: safeBool(sessionData.isActive),
      is_guiding: safeBool(sessionData.isGuiding),
      last_update: new Date().toISOString()
    };
  }

  // Clear recent events (for testing/reset)
  clearRecentEvents() {
    this.recentEvents = [];
    this.emit('recentEventsCleared');
  }

  // Cleanup
  destroy() {
    console.log('💥 Destroying SessionEventHandler');
    this.removeAllListeners();
  }
}

module.exports = SessionEventHandler;
