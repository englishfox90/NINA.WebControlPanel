// Session State Components Index
// Provides easy access to all session state related components

const SessionStateManager = require('./sessionStateManager');
const WebSocketManager = require('./sessionState/WebSocketManager');
const MemoryManager = require('./sessionState/MemoryManager');
const EventProcessor = require('./sessionState/EventProcessor');
const SessionStateProcessor = require('./sessionState/SessionStateProcessor');

// Enhanced components (if available)
let SessionStateManagerEnhanced, SessionStateReducer;

try {
  SessionStateManagerEnhanced = require('./sessionStateManagerEnhanced');
} catch (error) {
  console.log('ℹ️ Enhanced SessionStateManager not available');
}

try {
  SessionStateReducer = require('./sessionStateReducer');
} catch (error) {
  console.log('ℹ️ SessionStateReducer not available');
}

module.exports = {
  // Main components
  SessionStateManager,
  
  // Modular components
  WebSocketManager,
  MemoryManager, 
  EventProcessor,
  SessionStateProcessor,
  
  // Enhanced components (optional)
  SessionStateManagerEnhanced,
  SessionStateReducer,
  
  // Factory function
  createSessionStateManager: (ninaService, config = {}) => {
    if (config.enhanced && SessionStateManagerEnhanced) {
      return new SessionStateManagerEnhanced(ninaService, config);
    }
    return new SessionStateManager(ninaService, config);
  }
};
