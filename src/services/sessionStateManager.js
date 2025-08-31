// Simplified Session State Manager - Main Orchestrator
// Uses modular components for better maintainability

const EventEmitter = require('events');
const WebSocketManager = require('./sessionState/WebSocketManager');
const MemoryManager = require('./sessionState/MemoryManager');
const EventProcessor = require('./sessionState/EventProcessor');
const SessionStateProcessor = require('./sessionState/SessionStateProcessor');

class SessionStateManager extends EventEmitter {
  constructor(ninaService, config = {}) {
    super();
    
    this.ninaService = ninaService;
    this.events = [];
    this.isInitialized = false;
    this.isDestroyed = false;
    
    // Initialize component managers
    this.webSocketManager = new WebSocketManager(ninaService, config);
    this.memoryManager = new MemoryManager(config);
    this.eventProcessor = new EventProcessor();
    this.sessionStateProcessor = new SessionStateProcessor();
    
    // Now we can get the empty session state
    this.sessionState = this.getEmptySessionState();
    
    // Event deduplication tracking
    this.recentEvents = new Map(); // eventKey -> timestamp
    this.recentEventTimeout = 1000; // 1 second deduplication window
    
    this.setupComponentEventHandlers();
    this.setupErrorHandling();
    
    // Enhanced connection health monitoring
    this.lastHeartbeat = Date.now();
    this.connectionHealthCheck = null;
    this.startConnectionHealthMonitoring();
    
    // Initialize
    this.initialize().catch(error => {
      console.error('❌ SessionStateManager initialization failed:', error);
    });
  }

  setupComponentEventHandlers() {
    // WebSocket events
    this.webSocketManager.on('connected', () => {
      console.log('✅ WebSocket connected');
      this.emit('wsConnected');
    });

    this.webSocketManager.on('disconnected', (info) => {
      console.log('❌ WebSocket disconnected:', info);
      this.emit('wsDisconnected', info);
    });

    this.webSocketManager.on('ninaEvent', (event) => {
      this.handleNINAEvent(event);
      this.lastHeartbeat = Date.now(); // Update heartbeat on any NINA event
    });

    // Memory management events
    this.memoryManager.on('eventsCleanedUp', (stats) => {
      console.log(`🧹 Memory cleanup: ${stats.removed} events removed`);
    });

    // Event processor events
    this.eventProcessor.on('sessionEvent', (data) => {
      console.log('🎯 Session event:', data.type, data.time);
      this.processSessionState();
    });

    this.eventProcessor.on('targetEvent', (data) => {
      console.log('🎯 Target change:', data.name);
      this.processSessionState();
    });

    this.eventProcessor.on('activityEvent', (data) => {
      if (data.isStart) {
        console.log('⚡ Activity started:', data.subsystem, data.state);
      }
      this.processSessionState();
    });
  }

  setupErrorHandling() {
    // Prevent crashes from unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Promise Rejection in SessionStateManager:', reason);
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
    
    // Clean up components
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
    return this.sessionStateProcessor.getEmptySessionState();
  }

  async initialize() {
    if (this.isDestroyed) return;
    
    try {
      console.log('🔄 Initializing SessionStateManager...');
      
      // Seed with event history
      await this.seedEventHistory();
      
      // Process initial session state
      this.processSessionState();
      
      // Connect to NINA WebSocket
      await this.webSocketManager.connect();
      
      this.isInitialized = true;
      console.log('[BACKEND] ✅ SessionStateManager initialized');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize SessionStateManager:', error);
      // Don't throw - try to continue with limited functionality
    }
  }

  async seedEventHistory() {
    try {
      console.log('📚 Seeding session state with NINA event history...');
      const eventHistoryResponse = await this.ninaService.getEventHistory();
      
      if (eventHistoryResponse?.Success && Array.isArray(eventHistoryResponse.Response)) {
        this.events = eventHistoryResponse.Response
          .filter(event => event && event.Time)
          .slice(0, 500); // Limit initial seed
        
        console.log(`📚 Seeded with ${this.events.length} historical events`);
      } else {
        console.log('📚 No event history available, starting fresh');
        this.events = [];
      }
      
    } catch (error) {
      console.error('❌ Failed to seed event history:', error);
      this.events = [];
    }
  }

  handleNINAEvent(event) {
    if (this.isDestroyed || !event) return;
    
    // Event deduplication - check if we've seen this event recently
    const eventKey = `${event.Event}_${event.Time}`;
    const now = Date.now();
    
    if (this.recentEvents.has(eventKey)) {
      const lastSeen = this.recentEvents.get(eventKey);
      if (now - lastSeen < this.recentEventTimeout) {
        console.log('🔄 Skipping duplicate NINA event:', event.Event);
        return;
      }
    }
    
    // Track this event
    this.recentEvents.set(eventKey, now);
    
    // Clean up old entries (keep map size reasonable)
    if (this.recentEvents.size > 100) {
      const cutoff = now - (this.recentEventTimeout * 5);
      for (const [key, timestamp] of this.recentEvents.entries()) {
        if (timestamp < cutoff) {
          this.recentEvents.delete(key);
        }
      }
    }
    
    try {
      console.log('📥 NINA Event received in SessionStateManager:', event.Event, 'at', new Date().toISOString());
      
      // Add to events array with memory management
      this.events = this.memoryManager.addEvent(this.events, event);
      
      // Process the event through event processor
      const processedEvent = this.eventProcessor.processEvent(event);
      
      // Emit the NINA event to listeners (for WebSocket broadcast)
      console.log('📡 Emitting ninaEvent for WebSocket broadcast:', event.Event);
      this.emit('ninaEvent', event.Event, event);
      
      // Update session state if needed
      if (processedEvent && this.shouldUpdateSessionState(processedEvent.type)) {
        this.processSessionState();
      }
      
    } catch (error) {
      console.error('❌ Error handling NINA event:', error);
    }
  }

  shouldUpdateSessionState(eventType) {
    // Update session state for important events
    const importantEvents = ['session', 'target', 'filter', 'image', 'activity', 'safety'];
    return importantEvents.includes(eventType);
  }

  processSessionState() {
    if (this.isDestroyed) return;
    
    try {
      const now = new Date();
      
      // Clean up memory if needed
      if (this.memoryManager.shouldCleanup()) {
        this.events = this.memoryManager.performMemoryCleanup(this.events);
      }
      
      // Process session state using the dedicated processor
      const processedState = this.sessionStateProcessor.processNINAEvents(this.events, now);
      
      // Update session state if changed
      const stateChanged = JSON.stringify(processedState) !== JSON.stringify(this.sessionState);
      
      this.sessionState = {
        ...processedState,
        lastUpdate: now.toISOString()
      };
      
      console.log('🔄 Session state updated:', this.sessionState.isActive ? 'Active' : 'Idle');
      
      // Emit update to frontend clients
      if (this.isInitialized) {
        this.emit('sessionUpdate', this.sessionState);
      }
      
    } catch (error) {
      console.error('❌ Error processing session state:', error);
      // Don't crash - continue with existing state
    }
  }

  // Public API methods
  getSessionState() {
    return this.sessionState;
  }

  // Enhanced backward compatibility methods
  getLegacySessionState() {
    return this.sessionState; // Currently same format
  }

  getEnhancedSessionState() {
    // For future enhanced state format
    return {
      ...this.sessionState,
      enhanced: true,
      timestamp: new Date().toISOString()
    };
  }

  async refreshSessionState() {
    if (this.isDestroyed) return;
    
    try {
      // Re-seed event history and process
      await this.seedEventHistory();
      this.processSessionState();
      return this.sessionState;
    } catch (error) {
      console.error('❌ Failed to refresh session state:', error);
      return this.sessionState;
    }
  }

  reconnectWebSocket() {
    if (this.webSocketManager) {
      this.webSocketManager.reconnect();
    }
  }

  getMemoryStats() {
    return this.memoryManager.getMemoryStats(this.events);
  }

  // Enhanced connection health monitoring
  startConnectionHealthMonitoring() {
    this.connectionHealthCheck = setInterval(() => {
      this.checkConnectionHealth();
    }, 60000); // Check every minute
  }

  checkConnectionHealth() {
    if (this.isDestroyed) return;
    
    const now = Date.now();
    const timeSinceHeartbeat = now - this.lastHeartbeat;
    
    // If no heartbeat for 5 minutes, attempt reconnection
    if (timeSinceHeartbeat > 5 * 60 * 1000) {
      console.warn('⚠️ No WebSocket activity for 5+ minutes, attempting reconnection...');
      this.reconnectWebSocket();
    }
  }

  // Current session window information (enhanced feature)
  getCurrentSessionWindow() {
    if (!this.sessionState.isActive || !this.sessionState.sessionStart) {
      return null;
    }
    
    return {
      start: new Date(this.sessionState.sessionStart),
      end: null, // Active session
      isActive: true
    };
  }

  // Calculate session duration (enhanced feature)
  calculateSessionDuration() {
    const currentWindow = this.getCurrentSessionWindow();
    if (!currentWindow) return null;
    
    const endTime = currentWindow.end || new Date();
    const duration = endTime.getTime() - currentWindow.start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Cleanup and destroy
  cleanup(removeListeners = true) {
    console.log('🧹 Cleaning up SessionStateManager resources...');
    
    // Cleanup all component managers
    if (this.webSocketManager) {
      this.webSocketManager.cleanup(false);
    }
    
    if (this.memoryManager) {
      this.memoryManager.cleanup();
    }
    
    if (this.eventProcessor) {
      this.eventProcessor.destroy();
    }
    
    if (this.sessionStateProcessor) {
      this.sessionStateProcessor.destroy();
    }
    
    // Clear events array to free memory
    this.events = [];
    
    // Stop connection health monitoring
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
    
    // Remove event listeners if requested
    if (removeListeners) {
      this.removeAllListeners();
    }
  }

  destroy() {
    console.log('💥 Destroying SessionStateManager...');
    this.isDestroyed = true;
    this.isInitialized = false;
    
    // Destroy all components
    if (this.webSocketManager) {
      this.webSocketManager.destroy();
    }
    
    if (this.memoryManager) {
      this.memoryManager.destroy();
    }
    
    if (this.eventProcessor) {
      this.eventProcessor.destroy();
    }
    
    if (this.sessionStateProcessor) {
      this.sessionStateProcessor.destroy();
    }
    
    this.cleanup(true);
  }
}

module.exports = SessionStateManager;
