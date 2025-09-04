// Session State Manager - Manages current session state and API responses
const EventEmitter = require('events');

class SessionStateManager extends EventEmitter {
  constructor(configDatabase) {
    super();
    
    this.configDatabase = configDatabase;
    
    // Components will be injected
    this.sessionFSM = null;
    this.eventHandler = null;
    
    console.log('📊 SessionStateManager created');
  }

  // Inject dependencies
  setSessionFSM(sessionFSM) {
    this.sessionFSM = sessionFSM;
  }

  setEventHandler(eventHandler) {
    this.eventHandler = eventHandler;
  }

  // Get current session data for API responses
  getCurrentSessionData() {
    if (!this.sessionFSM) {
      return this.getEmptySessionData();
    }

    const fsmData = this.sessionFSM.getSessionData();
    
    if (!fsmData.isActive) {
      return this.getEmptySessionData();
    }

    console.log('🎯 Returning active session for target:', fsmData.target?.name);
    
    const recentEvents = this.eventHandler ? this.eventHandler.getRecentEvents() : [];
    const eventStats = this.eventHandler ? this.eventHandler.getEventStats() : {};
    
    return {
      // Core session data from FSM
      ...fsmData,
      
      // Event information
      events: recentEvents.slice(0, 5),
      eventCount: recentEvents.length,
      
      // Connection status
      connectionStatus: eventStats.connectionStatus || false,
      
      // Enhanced metadata
      lastUpdate: new Date().toISOString(),
      dataSource: 'unified',
      
      // WebSocket status
      wsStatus: eventStats.wsStatus || {
        isConnected: false,
        reconnectAttempts: 0,
        lastHeartbeat: null
      }
    };
  }

  // Get empty session data (fallback)
  getEmptySessionData() {
    return {
      sessionStart: null,
      isActive: false,
      target: null,
      filter: null,
      lastImage: null,
      safe: { isSafe: true, time: null },
      activity: { subsystem: 'Unknown', state: 'Idle', since: null },
      lastEquipmentChange: null,
      flats: { isActive: false, filter: null, brightness: null, imageCount: 0 },
      darks: { isActive: false, currentExposureTime: null, exposureGroups: [], totalImages: 0 },
      events: [],
      eventCount: 0,
      connectionStatus: false,
      lastUpdate: new Date().toISOString(),
      dataSource: 'unified-empty',
      wsStatus: { isConnected: false, reconnectAttempts: 0, lastHeartbeat: null }
    };
  }

  // Get session summary (lightweight version)
  getSessionSummary() {
    const sessionData = this.getCurrentSessionData();
    
    return {
      isActive: sessionData.isActive,
      sessionStart: sessionData.sessionStart,
      target: sessionData.target?.name || 'None',
      project: sessionData.target?.project || 'None',
      currentFilter: sessionData.filter?.name || 'None',
      safetyStatus: sessionData.safe?.isSafe ? 'Safe' : 'Unsafe',
      activityState: `${sessionData.activity?.subsystem || 'Unknown'}: ${sessionData.activity?.state || 'Idle'}`,
      connectionStatus: sessionData.connectionStatus,
      lastUpdate: sessionData.lastUpdate,
      recentEventCount: sessionData.eventCount
    };
  }

  // Get detailed session state for debugging
  getDetailedState() {
    if (!this.sessionFSM) {
      return { error: 'SessionFSM not available' };
    }

    return {
      fsmState: this.sessionFSM.currentState,
      sessionData: this.sessionFSM.getSessionData(),
      recentEvents: this.eventHandler ? this.eventHandler.getRecentEvents() : [],
      eventStats: this.eventHandler ? this.eventHandler.getEventStats() : {},
      lastUpdate: new Date().toISOString()
    };
  }

  // Broadcast session update to WebSocket clients
  broadcastUpdate() {
    const sessionData = this.getCurrentSessionData();
    this.emit('sessionUpdate', sessionData);
    console.log('📊 Session state broadcasted to clients');
  }

  // Force refresh session data
  async refreshSessionData() {
    if (this.sessionFSM) {
      // Trigger FSM to recalculate state if needed
      const currentData = this.sessionFSM.getSessionData();
      this.emit('sessionRefreshed', currentData);
    }
    
    return this.getCurrentSessionData();
  }

  // Get session metrics for monitoring
  getSessionMetrics() {
    const sessionData = this.getCurrentSessionData();
    const now = new Date();
    
    let sessionDuration = null;
    if (sessionData.sessionStart) {
      sessionDuration = Math.floor((now - new Date(sessionData.sessionStart)) / 1000 / 60); // minutes
    }
    
    return {
      sessionActive: sessionData.isActive,
      sessionDurationMinutes: sessionDuration,
      hasTarget: !!sessionData.target?.name,
      hasRecentActivity: sessionData.eventCount > 0,
      safetyStatus: sessionData.safe?.isSafe ? 'safe' : 'unsafe',
      connectionHealth: sessionData.connectionStatus ? 'connected' : 'disconnected',
      flatsInProgress: sessionData.flats?.isActive || false,
      darksInProgress: sessionData.darks?.isActive || false,
      lastEventAge: sessionData.events.length > 0 ? 
        Math.floor((now - new Date(sessionData.events[0].timestamp)) / 1000 / 60) : null // minutes
    };
  }

  // Update session state manually (for testing)
  updateSessionState(stateUpdates) {
    if (this.sessionFSM) {
      // Apply updates to FSM if possible
      console.log('📊 Manual session state update requested');
      this.emit('manualUpdate', stateUpdates);
    }
  }

  // Session validation
  validateSessionData() {
    const sessionData = this.getCurrentSessionData();
    const issues = [];
    
    // Check for data consistency
    if (sessionData.isActive && !sessionData.sessionStart) {
      issues.push('Active session without start time');
    }
    
    if (sessionData.flats?.isActive && !sessionData.flats.startedAt) {
      issues.push('Active flats without start time');
    }
    
    if (sessionData.darks?.isActive && !sessionData.darks.startedAt) {
      issues.push('Active darks without start time');
    }
    
    if (sessionData.eventCount > 0 && sessionData.events.length === 0) {
      issues.push('Event count mismatch');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      checkedAt: new Date().toISOString()
    };
  }

  // Cleanup
  destroy() {
    console.log('💥 Destroying SessionStateManager');
    this.removeAllListeners();
  }
}

module.exports = SessionStateManager;
