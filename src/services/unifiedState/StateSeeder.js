// State Seeder
// Seeds the unified state from NINA's /event-history endpoint on startup
// Processes historical events to build initial state

class StateSeeder {
  constructor(ninaService, stateManager, eventNormalizer) {
    this.ninaService = ninaService;
    this.stateManager = stateManager;
    this.eventNormalizer = eventNormalizer;
    
    console.log('✅ StateSeeder initialized');
  }

  /**
   * Seed state from NINA event history
   * @returns {Promise<boolean>} Success status
   */
  async seedFromHistory() {
    console.log('🌱 Seeding state from NINA event history...');

    try {
      // Fetch event history from NINA
      const historyResponse = await this.ninaService.getEventHistory();
      
      if (!historyResponse || !historyResponse.Success) {
        console.warn('⚠️ Failed to fetch event history, starting with empty state');
        return false;
      }

      const events = historyResponse.Response || [];
      console.log(`📚 Processing ${events.length} historical events...`);

      if (events.length === 0) {
        console.log('ℹ️ No historical events available');
        return true;
      }

      // Sort events by timestamp (oldest first)
      const sortedEvents = this._sortEventsByTime(events);

      // Process each event through the normalizer
      let processedCount = 0;
      for (const event of sortedEvents) {
        try {
          this.eventNormalizer.processEvent(event);
          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing historical event:`, error);
        }
      }

      console.log(`✅ Seeded state from ${processedCount} events`);
      
      // Log summary of seeded state
      this._logStateSummary();

      return true;

    } catch (error) {
      console.error('❌ Failed to seed state from history:', error);
      console.log('ℹ️ Continuing with empty state, will populate from live events');
      return false;
    }
  }

  /**
   * Sort events by timestamp (oldest first)
   * @private
   */
  _sortEventsByTime(events) {
    return events.sort((a, b) => {
      const timeA = this._getEventTime(a);
      const timeB = this._getEventTime(b);
      return timeA - timeB;
    });
  }

  /**
   * Extract timestamp from event
   * @private
   */
  _getEventTime(event) {
    // Try multiple common timestamp fields
    const timestamp = event.Timestamp || event.Time || event.timestamp || event.time;
    
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    
    // Fallback to current time if no valid timestamp
    return Date.now();
  }

  /**
   * Log summary of seeded state
   * @private
   */
  _logStateSummary() {
    const state = this.stateManager.getState();
    
    console.log('📊 State Summary:');
    console.log(`  - Session Active: ${state.currentSession?.isActive || false}`);
    console.log(`  - Equipment Count: ${state.equipment.length}`);
    console.log(`  - Recent Events: ${state.recentEvents.length}`);
    
    if (state.currentSession?.target?.targetName) {
      console.log(`  - Current Target: ${state.currentSession.target.targetName}`);
    }
    
    if (state.currentSession?.guiding?.isGuiding) {
      console.log(`  - Guiding: Active (RMS: ${state.currentSession.guiding.lastRmsTotal || 'N/A'})`);
    }
    
    if (state.equipment.length > 0) {
      const connectedEquipment = state.equipment.filter(eq => eq.connected);
      console.log(`  - Connected Equipment: ${connectedEquipment.length}/${state.equipment.length}`);
      connectedEquipment.forEach(eq => {
        console.log(`    • ${eq.name}: ${eq.status}`);
      });
    }
  }
}

module.exports = StateSeeder;
