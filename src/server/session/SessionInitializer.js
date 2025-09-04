// Session Initializer - Handles startup, seeding, and WebSocket connection
const EventEmitter = require('events');
const SessionSchema = require('../database/sessionSchema');
const EventNormalizer = require('./EventNormalizer');
const SessionFSM = require('./SessionFSM');
const NINAWebSocketClient = require('./NINAWebSocketClient');

class SessionInitializer extends EventEmitter {
  constructor(configDatabase, ninaService) {
    super();
    
    this.configDatabase = configDatabase;
    this.ninaService = ninaService;
    
    // Components
    this.sessionSchema = new SessionSchema(configDatabase.db);
    this.eventNormalizer = new EventNormalizer();
    this.sessionFSM = new SessionFSM();
    this.wsClient = null;
    
    console.log('🔧 SessionInitializer created');
  }

  // 3-step initialization process
  async initialize() {
    try {
      console.log('📚 Step 1: Seeding from event history...');
      await this.seedFromEventHistory();
      
      console.log('🔌 Step 2: Initializing WebSocket connection...');
      await this.initializeWebSocketConnection();
      
      console.log('📖 Step 3: Loading current state...');
      await this.loadCurrentState();
      
      console.log('✅ SessionInitializer initialization complete');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ SessionInitializer initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Step 1: Seed from NINA event history
  async seedFromEventHistory() {
    try {
      console.log('📚 Seeding session data from NINA event history...');
      
      const eventHistory = await this.ninaService.getEventHistory();
      if (!eventHistory || !eventHistory.Response || !Array.isArray(eventHistory.Response)) {
        console.warn('⚠️ No event history available from NINA');
        return;
      }

      console.log(`📊 Processing ${eventHistory.Response.length} historical events for state reconstruction`);
      
      // IMPORTANT: NINA returns events in chronological order (oldest first)
      const normalizedEvents = this.eventNormalizer.normalizeBatch(eventHistory.Response);
      console.log(`📊 Normalized ${normalizedEvents.length} events for processing`);
      
      let processedCount = 0;
      let stateChanges = 0;
      const batchSize = 50;
      const totalEvents = normalizedEvents.length;
      
      // Process events in batches for better performance
      for (let i = 0; i < totalEvents; i += batchSize) {
        const batch = normalizedEvents.slice(i, Math.min(i + batchSize, totalEvents));
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalEvents / batchSize);
        
        // Process each event in the batch
        let batchStateChanges = 0;
        for (const event of batch) {
          const stateChanged = this.sessionFSM.processEvent(event);
          processedCount++;
          
          if (stateChanged) {
            stateChanges++;
            batchStateChanges++;
          }
        }

        console.log(`✅ Batch ${batchNum}/${totalBatches} complete: ${batch.length} events processed, ${batchStateChanges} state changes`);
      }

      // Persist only the final reconstructed state
      await this.persistSessionState();
      
      // Store only the most recent 20 events for reference
      // Since events are in chronological order, take the last 20
      const recentEventsForStorage = this.eventNormalizer.normalizeBatch(
        eventHistory.Response.slice(-20) // Take last 20 events (most recent)
      );
      for (const event of recentEventsForStorage) {
        await this.persistEvent(event);
      }
      
      console.log(`✅ Historical processing complete: ${processedCount} processed, ${stateChanges} state changes, ${recentEventsForStorage.length} recent events stored`);
      this.emit('seedingComplete', { processedCount, persistedCount: recentEventsForStorage.length });
      
    } catch (error) {
      console.error('❌ Error seeding from event history:', error);
      this.emit('seedingError', error);
      // Continue initialization even if seeding fails
    }
  }

  // Step 2: Initialize WebSocket connection
  async initializeWebSocketConnection() {
    try {
      const config = this.configDatabase.getConfig();
      this.wsClient = new NINAWebSocketClient(config.nina);
      
      // Setup event handlers
      this.wsClient.on('connected', () => {
        console.log('✅ NINA WebSocket connected');
        this.emit('websocketConnected');
      });

      this.wsClient.on('disconnected', () => {
        console.log('❌ NINA WebSocket disconnected');
        this.emit('websocketDisconnected');
      });

      this.wsClient.on('ninaEvent', (rawEvent) => {
        // Forward to whoever needs to handle live events
        this.emit('liveEvent', rawEvent);
      });

      this.wsClient.on('error', (error) => {
        console.error('🚨 NINA WebSocket error:', error);
        this.emit('websocketError', error);
      });

      // Start connection (non-blocking)
      console.log('🔌 Starting WebSocket connection attempt...');
      this.wsClient.connect().then((connected) => {
        if (connected) {
          console.log('✅ WebSocket connection established');
        } else {
          console.log('⚠️ WebSocket connection failed, will retry automatically');
        }
      }).catch((error) => {
        console.error('❌ WebSocket connection error:', error);
      });
      
      console.log('🔌 WebSocket client initialized (connecting in background)');
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket connection:', error);
      this.emit('websocketError', error);
      // Don't throw - allow initialization to continue
    }
  }

  // Step 3: Load current state from database
  async loadCurrentState() {
    try {
      const sessionState = this.sessionSchema.getCurrentState();
      if (sessionState) {
        // Note: FSM state is rebuilt from events during seeding, no need to restore
        console.log('📖 Current state loaded from database:', sessionState.session_state);
        this.emit('stateLoaded', sessionState);
      } else {
        console.log('📖 No previous state found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading current state:', error);
      this.emit('stateLoadError', error);
      // Continue with empty state
    }
  }

  // Helper methods for persistence
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
    try {
      const sessionData = this.sessionFSM.getSessionData();
      const dbFormat = this.convertToDbFormat(sessionData);
      this.sessionSchema.updateState(dbFormat);
    } catch (error) {
      console.error('❌ Error persisting session state:', error);
    }
  }

  getCurrentSessionUUID() {
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

  // Public accessors
  getWebSocketClient() {
    return this.wsClient;
  }

  getSessionFSM() {
    return this.sessionFSM;
  }

  getEventNormalizer() {
    return this.eventNormalizer;
  }

  // Cleanup
  destroy() {
    console.log('💥 Destroying SessionInitializer');
    
    if (this.wsClient) {
      this.wsClient.destroy();
    }
    
    this.removeAllListeners();
  }
}

module.exports = SessionInitializer;
