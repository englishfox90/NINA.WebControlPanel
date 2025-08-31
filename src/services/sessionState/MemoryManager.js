// Memory Management for Session State Events
// Handles cleanup of old events and memory optimization

const EventEmitter = require('events');

class MemoryManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.maxEvents = config.maxEvents || 500;
    this.eventCleanupInterval = config.eventCleanupInterval || 30000; // 30 seconds
    this.maxEventAge = config.maxEventAge || (4 * 60 * 60 * 1000); // 4 hours
    this.lastCleanup = Date.now();
    this.isDestroyed = false;
    
    // Auto cleanup interval
    this.cleanupInterval = null;
    this.connectionHealthCheck = null;
    
    this.startMemoryManagement();
  }

  startMemoryManagement() {
    // Periodic cleanup of old events and memory optimization
    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, this.eventCleanupInterval);

    console.log(`🧹 Memory management started: max ${this.maxEvents} events, cleanup every ${this.eventCleanupInterval}ms`);
  }

  performMemoryCleanup(events = []) {
    if (this.isDestroyed) return events;
    
    const beforeCount = events.length;
    const now = Date.now();
    const maxAge = now - this.maxEventAge;
    
    // Keep only recent events (last 4 hours or max events)
    const cleanedEvents = events
      .filter(event => {
        const eventTime = new Date(event.Time).getTime();
        return eventTime > maxAge;
      })
      .slice(0, this.maxEvents);

    const afterCount = cleanedEvents.length;
    
    if (beforeCount !== afterCount) {
      console.log(`🧹 Memory cleanup: Removed ${beforeCount - afterCount} old events (${afterCount} remaining)`);
      this.emit('eventsCleanedUp', { before: beforeCount, after: afterCount, removed: beforeCount - afterCount });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.lastCleanup = now;
    return cleanedEvents;
  }

  addEvent(events, newEvent) {
    // Add event to the beginning of the array
    events.unshift(newEvent);
    
    // Immediate cleanup if we exceed memory limits significantly
    if (events.length > this.maxEvents * 1.2) {
      console.log(`⚠️ Event array too large (${events.length}), performing immediate cleanup`);
      return this.performMemoryCleanup(events);
    }
    
    return events;
  }

  shouldCleanup() {
    const now = Date.now();
    return (now - this.lastCleanup) > this.eventCleanupInterval;
  }

  getMemoryStats(events = []) {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const fourHoursAgo = now - this.maxEventAge;
    
    const stats = {
      totalEvents: events.length,
      lastHour: events.filter(e => new Date(e.Time).getTime() > oneHourAgo).length,
      lastFourHours: events.filter(e => new Date(e.Time).getTime() > fourHoursAgo).length,
      oldestEvent: events.length > 0 ? new Date(events[events.length - 1].Time) : null,
      newestEvent: events.length > 0 ? new Date(events[0].Time) : null,
      memoryUsage: process.memoryUsage(),
      lastCleanup: new Date(this.lastCleanup)
    };
    
    return stats;
  }

  cleanup() {
    console.log('🧹 Cleaning up MemoryManager resources...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
  }

  destroy() {
    console.log('💥 Destroying MemoryManager...');
    this.isDestroyed = true;
    this.cleanup();
    this.removeAllListeners();
  }
}

module.exports = MemoryManager;
