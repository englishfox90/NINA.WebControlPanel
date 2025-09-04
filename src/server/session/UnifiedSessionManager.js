// Core Session Manager - Main orchestrator
const EventEmitter = require('events');
const SessionInitializer = require('./SessionInitializer');
const SessionEventHandler = require('./SessionEventHandler');
const SessionStateManager = require('./SessionStateManager');
const SessionStatsManager = require('./SessionStatsManager');

class UnifiedSessionManager extends EventEmitter {
  constructor(configDatabase, ninaService) {
    super();
    
    if (!configDatabase || !configDatabase.db) {
      throw new Error('Valid configDatabase with db property is required');
    }
    
    this.configDatabase = configDatabase;
    this.ninaService = ninaService;
    
    // Initialize modular components
    this.initializer = new SessionInitializer(configDatabase, ninaService);
    this.eventHandler = new SessionEventHandler(configDatabase);
    this.stateManager = new SessionStateManager(configDatabase);
    this.statsManager = new SessionStatsManager(configDatabase);
    
    // State
    this.isInitialized = false;
    this.isDestroyed = false;
    
    // Forward events from components
    this.setupEventForwarding();
    
    console.log('🎯 UnifiedSessionManager created with modular architecture');
  }

  // Setup event forwarding from all components
  setupEventForwarding() {
    const components = [this.initializer, this.eventHandler, this.stateManager];
    
    components.forEach(component => {
      if (component instanceof EventEmitter) {
        // Forward all events with component prefix
        component.onAny?.((eventName, ...args) => {
          this.emit(`${component.constructor.name.toLowerCase()}:${eventName}`, ...args);
        });
        
        // Forward specific important events without prefix
        ['sessionUpdate', 'ninaEvent', 'error'].forEach(event => {
          component.on(event, (...args) => this.emit(event, ...args));
        });
      }
    });
  }

  // Main initialization - delegates to initializer
  async initialize() {
    if (this.isInitialized || this.isDestroyed) {
      return;
    }

    try {
      console.log('🚀 Starting modular session manager initialization...');
      
      // Let the initializer handle all startup logic
      await this.initializer.initialize();
      
      // Connect components together
      this.connectComponents();
      
      this.isInitialized = true;
      console.log('✅ Unified session manager initialized (modular)');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize unified session manager:', error);
      this.emit('error', error);
    }
  }

  // Connect components to work together
  connectComponents() {
    // Get shared components from initializer
    const wsClient = this.initializer.getWebSocketClient();
    const sessionFSM = this.initializer.getSessionFSM();
    const eventNormalizer = this.initializer.getEventNormalizer();
    
    // Connect event handler to all its dependencies
    this.eventHandler.setWebSocketClient(wsClient);
    this.eventHandler.setEventNormalizer(eventNormalizer);
    this.eventHandler.setSessionFSM(sessionFSM);
    
    // Connect state manager to its dependencies
    this.stateManager.setSessionFSM(sessionFSM);
    this.stateManager.setEventHandler(this.eventHandler);
    
    // Connect stats manager to all its dependencies
    this.statsManager.setSessionFSM(sessionFSM);
    this.statsManager.setWebSocketClient(wsClient);
    this.statsManager.setEventHandler(this.eventHandler);
    
    // Setup cross-component event handling
    this.eventHandler.on('eventProcessed', (normalizedEvent, stateChanged) => {
      if (stateChanged) {
        this.stateManager.broadcastUpdate();
      }
    });
    
    // Forward live events from initializer to event handler
    this.initializer.on('liveEvent', (rawEvent) => {
      this.eventHandler.handleLiveEvent(rawEvent);
    });
    
    console.log('🔗 All components connected successfully');
  }

  // Delegate methods to appropriate components
  getCurrentSessionData() {
    return this.stateManager.getCurrentSessionData();
  }

  getStats() {
    return this.statsManager.getStats();
  }

  async refresh() {
    console.log('🔄 Manual session refresh requested');
    await this.initializer.seedFromEventHistory();
    return this.getCurrentSessionData();
  }

  // Cleanup - coordinate all components
  destroy() {
    console.log('💥 Destroying unified session manager');
    this.isDestroyed = true;
    
    // Destroy all components in reverse order
    [this.statsManager, this.stateManager, this.eventHandler, this.initializer].forEach(component => {
      if (component && typeof component.destroy === 'function') {
        try {
          component.destroy();
        } catch (error) {
          console.error(`Error destroying ${component.constructor.name}:`, error);
        }
      }
    });
    
    this.removeAllListeners();
  }
}

module.exports = UnifiedSessionManager;
