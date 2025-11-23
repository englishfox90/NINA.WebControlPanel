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

      // NINA API returns events oldest -> newest
      // Take the last 100 events (most recent) and process in chronological order
      // This ensures the most recent state changes (filter, target, etc.) are applied last
      const startIndex = Math.max(0, events.length - 100);
      const recentEvents = events.slice(startIndex);
      
      console.log(`📚 Processing ${recentEvents.length} most recent events (of ${events.length} total)...`);

      // Process each event through the normalizer (oldest to newest)
      let processedCount = 0;
      for (const event of recentEvents) {
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
