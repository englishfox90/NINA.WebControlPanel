// Unified State Manager
// Maintains a single in-memory state object for the entire observatory
// Provides helper functions to update state and notify listeners

class UnifiedStateManager {
  constructor() {
    // Initialize with empty state
    this.state = {
      currentSession: null,
      equipment: [],
      recentEvents: []
    };
    
    // Event listeners for state changes
    this.listeners = [];
    
    console.log('✅ UnifiedStateManager initialized');
  }

  /**
   * Get the current complete state
   * @returns {UnifiedState}
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state)); // Return deep copy
  }

  /**
   * Replace the entire state
   * @param {UnifiedState} newState
   */
  setState(newState) {
    this.state = JSON.parse(JSON.stringify(newState)); // Deep copy
    console.log('🔄 State fully replaced');
  }

  /**
   * Update session information
   * @param {Partial<CurrentSession>} partial
   */
  updateSession(partial) {
    if (!this.state.currentSession) {
      // Create new session with defaults
      this.state.currentSession = {
        isActive: null,
        startedAt: null,
        target: {
          projectName: null,
          targetName: null,
          ra: null,
          dec: null,
          panelIndex: null,
          rotationDeg: null
        },
        imaging: {
          currentFilter: null,
          exposureSeconds: null,
          frameType: null,
          sequenceName: null,
          progress: null,
          lastImage: null
        },
        guiding: {
          isGuiding: false,
          lastRmsTotal: null,
          lastRmsRa: null,
          lastRmsDec: null,
          lastUpdate: null
        }
      };
    }

    // Deep merge partial into current session
    this.state.currentSession = this._deepMerge(this.state.currentSession, partial);
    console.log('📝 Session updated');
  }

  /**
   * Upsert equipment entry
   * @param {Object} device
   */
  upsertEquipment(device) {
    const { id, type, name, connected, status, details } = device;
    
    const index = this.state.equipment.findIndex(eq => eq.id === id);
    const now = new Date().toISOString();
    
    if (index !== -1) {
      // Update existing equipment
      this.state.equipment[index] = {
        ...this.state.equipment[index],
        name,
        connected,
        status,
        lastChange: now,
        details: { ...this.state.equipment[index].details, ...details }
      };
      console.log(`🔧 Equipment updated: ${id}`);
    } else {
      // Add new equipment
      this.state.equipment.push({
        id,
        type,
        name,
        connected,
        status,
        lastChange: now,
        details: details || {}
      });
      console.log(`➕ Equipment added: ${id}`);
    }
  }

  /**
   * Add a recent event (maintains max 5 events)
   * @param {Object} event
   */
  addRecentEvent(event) {
    const { time, type, summary, meta } = event;
    
    this.state.recentEvents.unshift({
      time: time || new Date().toISOString(),
      type,
      summary,
      meta: meta || {}
    });
    
    // Keep only the 5 most recent events
    if (this.state.recentEvents.length > 5) {
      this.state.recentEvents = this.state.recentEvents.slice(0, 5);
    }
    
    console.log(`📋 Event added: ${type} - ${summary}`);
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Called with (updateKind, updateReason, changed, state)
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of a state change
   * @param {string} updateKind
   * @param {string} updateReason
   * @param {Object|null} changed
   */
  notifyListeners(updateKind, updateReason, changed = null) {
    const message = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      updateKind,
      updateReason,
      changed,
      state: this.getState()
    };

    console.log(`📢 Broadcasting: ${updateKind} - ${updateReason}`);
    
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('❌ Error in state listener:', error);
      }
    });
  }

  /**
   * Deep merge utility
   * @private
   */
  _deepMerge(target, source) {
    const output = { ...target };
    
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   * @private
   */
  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Clear session data
   */
  clearSession() {
    this.state.currentSession = null;
    console.log('🧹 Session cleared');
  }

  /**
   * Clear all state
   */
  reset() {
    this.state = {
      currentSession: null,
      equipment: [],
      recentEvents: []
    };
    console.log('🔄 State reset to initial values');
  }
}

module.exports = UnifiedStateManager;
