// Unified State System - Main Orchestrator
// Coordinates all unified state components: StateManager, NINA WebSocket, EventNormalizer, and StateSeeder

const UnifiedStateManager = require('./UnifiedStateManager');
const NINAWebSocketClient = require('./NINAWebSocketClient');
const EventNormalizer = require('./EventNormalizer');
const StateSeeder = require('./StateSeeder');

class UnifiedStateSystem {
  constructor(ninaService) {
    this.ninaService = ninaService;
    
    // Initialize core components
    this.stateManager = new UnifiedStateManager();
    this.eventNormalizer = new EventNormalizer(this.stateManager);
    this.stateSeeder = new StateSeeder(ninaService, this.stateManager, this.eventNormalizer);
    
    // NINA WebSocket client (will be initialized in start())
    this.ninaWebSocket = null;
    
    // Track initialization status
    this.initialized = false;
    this.seeded = false;
    
    console.log('✅ UnifiedStateSystem created');
  }

  /**
   * Initialize and start the unified state system
   * @returns {Promise<void>}
   */
  async start() {
    if (this.initialized) {
      console.warn('⚠️ UnifiedStateSystem already initialized');
      return;
    }

    console.log('🚀 Starting UnifiedStateSystem...');

    try {
      // Step 1: Seed state from event history
      console.log('📚 Step 1: Seeding state from NINA event history...');
      this.seeded = await this.stateSeeder.seedFromHistory();
      
      if (this.seeded) {
        console.log('✅ State seeded successfully from event history');
      } else {
        console.log('⚠️ Could not seed from event history, will populate from live events');
      }

      // Step 2: Connect to NINA WebSocket for live events
      console.log('📡 Step 2: Connecting to NINA WebSocket...');
      
      // Extract base URL and port from ninaService
      const baseUrl = this.ninaService.baseUrl || 'http://localhost';
      const port = this.ninaService.port || 1888;
      
      this.ninaWebSocket = new NINAWebSocketClient(
        baseUrl,
        port,
        (event) => this._handleNINAEvent(event)
      );
      
      this.ninaWebSocket.connect();

      this.initialized = true;
      console.log('✅ UnifiedStateSystem started successfully');

    } catch (error) {
      console.error('❌ Failed to start UnifiedStateSystem:', error);
      throw error;
    }
  }

  /**
   * Stop the unified state system
   */
  stop() {
    console.log('🛑 Stopping UnifiedStateSystem...');

    if (this.ninaWebSocket) {
      this.ninaWebSocket.disconnect();
      this.ninaWebSocket = null;
    }

    this.initialized = false;
    console.log('✅ UnifiedStateSystem stopped');
  }

  /**
   * Handle incoming NINA event
   * @private
   */
  _handleNINAEvent(event) {
    try {
      // Process event through normalizer
      // The normalizer will update state and trigger listeners
      this.eventNormalizer.processEvent(event);
    } catch (error) {
      console.error('❌ Error handling NINA event:', error);
    }
  }

  /**
   * Get current state
   * @returns {UnifiedState}
   */
  getState() {
    return this.stateManager.getState();
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Called with UnifiedWsMessage on each update
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    return this.stateManager.subscribe(listener);
  }

  /**
   * Get system status
   * @returns {Object}
   */
  getStatus() {
    return {
      initialized: this.initialized,
      seeded: this.seeded,
      ninaWebSocket: this.ninaWebSocket ? this.ninaWebSocket.getStatus() : 'not-created',
      equipmentCount: this.stateManager.state.equipment.length,
      sessionActive: this.stateManager.state.currentSession?.isActive || false,
      recentEventCount: this.stateManager.state.recentEvents.length
    };
  }

  /**
   * Manually trigger a state refresh from NINA
   * @returns {Promise<void>}
   */
  async refreshState() {
    console.log('🔄 Manually refreshing state from NINA...');
    await this.stateSeeder.seedFromHistory();
  }

  /**
   * Clear current session
   */
  clearSession() {
    this.stateManager.clearSession();
    this.stateManager.notifyListeners('session', 'session-cleared', {
      path: 'currentSession',
      summary: 'Session cleared',
      meta: {}
    });
  }

  /**
   * Reset entire state
   */
  reset() {
    this.stateManager.reset();
    this.stateManager.notifyListeners('fullSync', 'state-reset', null);
  }
}

module.exports = UnifiedStateSystem;
