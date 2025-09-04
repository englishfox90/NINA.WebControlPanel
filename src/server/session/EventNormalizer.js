// NINA Event Normalizer
// Handles timestamp normalization, deduplication, and event enrichment

class EventNormalizer {
  constructor() {
    this.recentEvents = new Map(); // For deduplication
    this.eventContext = {
      currentFilter: null,
      currentTarget: null,
      flatPanelState: null,
      lastImageStats: null
    };
  }

  // Normalize NINA event with UTC conversion and deduplication
  normalizeEvent(rawEvent) {
    if (!rawEvent || !rawEvent.Event || !rawEvent.Time) {
      return null;
    }

    // Parse and normalize timestamp to UTC
    const timestamp = this.normalizeTimestamp(rawEvent.Time);
    if (!timestamp) {
      console.warn('❌ Failed to parse timestamp for event:', rawEvent.Event);
      return null;
    }

    // Create event key for deduplication
    const eventKey = this.createEventKey(rawEvent, timestamp);
    
    // Check for recent duplicate (within 1 second)
    if (this.isDuplicateEvent(eventKey, timestamp)) {
      console.log(`🔄 Skipping duplicate event: ${rawEvent.Event}`);
      return null;
    }

    // Store in recent events for deduplication
    this.recentEvents.set(eventKey, timestamp);
    this.cleanupRecentEvents(timestamp);

    const normalizedEvent = {
      eventType: rawEvent.Event,
      timestamp: timestamp.toISOString(),
      originalData: rawEvent,
      enrichedData: this.enrichEvent(rawEvent),
      // Include key event fields for easy access
      TargetName: rawEvent.TargetName,
      ProjectName: rawEvent.ProjectName,
      Coordinates: rawEvent.Coordinates,
      Rotation: rawEvent.Rotation,
      TargetEndTime: rawEvent.TargetEndTime,
      IsSafe: rawEvent.IsSafe,
      // Include filter information for FILTERWHEEL-CHANGED events
      FilterName: rawEvent.New?.Name
    };

    // Update rolling context
    this.updateContext(rawEvent);

    return normalizedEvent;
  }

  // Normalize timestamp to UTC
  normalizeTimestamp(timeString) {
    try {
      // Check if timestamp already includes timezone offset
      const hasTimezone = timeString.match(/[+-]\d{2}:\d{2}$/);
      
      if (hasTimezone) {
        // NINA timestamps with timezone - use as-is
        const date = new Date(timeString);
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn('❌ Invalid timestamp with timezone:', timeString);
          return null;
        }
        
        return date;
      } else {
        // NINA timestamps WITHOUT timezone - assume NINA server local time (Chicago, UTC-5)
        // Add the timezone offset to convert to UTC properly
        const ninaTimezoneOffset = '-05:00'; // Chicago timezone
        const dateWithTimezone = new Date(timeString + ninaTimezoneOffset);
        
        // Validate the date
        if (isNaN(dateWithTimezone.getTime())) {
          console.warn('❌ Invalid timestamp (assumed NINA local):', timeString);
          return null;
        }
        
        return dateWithTimezone;
      }
    } catch (error) {
      console.error('❌ Error parsing timestamp:', timeString, error);
      return null;
    }
  }

  // Create unique key for event deduplication
  createEventKey(event, timestamp) {
    const timeKey = Math.floor(timestamp.getTime() / 1000); // Second precision
    return `${event.Event}_${timeKey}_${JSON.stringify(event.Data || {})}`;
  }

  // Check if event is a recent duplicate
  isDuplicateEvent(eventKey, timestamp) {
    const recentTime = this.recentEvents.get(eventKey);
    if (!recentTime) return false;

    // Consider duplicate if within 1 second
    const timeDiff = Math.abs(timestamp.getTime() - recentTime.getTime());
    return timeDiff < 1000;
  }

  // Clean up old events from deduplication map
  cleanupRecentEvents(currentTime) {
    const cutoffTime = currentTime.getTime() - (5 * 60 * 1000); // 5 minutes ago
    
    for (const [key, timestamp] of this.recentEvents.entries()) {
      if (timestamp.getTime() < cutoffTime) {
        this.recentEvents.delete(key);
      }
    }
  }

  // Enrich sparse events with rolling context
  enrichEvent(event) {
    const enriched = { ...event };

    // Enrich IMAGE-SAVE events with context
    if (event.Event === 'IMAGE-SAVE') {
      if (!enriched.ImageStatistics) {
        enriched.ImageStatistics = {
          Filter: this.eventContext.currentFilter,
          TargetName: this.eventContext.currentTarget?.name,
          ProjectName: this.eventContext.currentTarget?.project,
          FlatPanelActive: this.eventContext.flatPanelState?.active || false
        };
      }
    }

    // Add target context to generic events if available
    if (this.eventContext.currentTarget) {
      enriched.enrichedData = {
        target: this.eventContext.currentTarget,
        filter: this.eventContext.currentFilter
      };
    }

    return enriched;
  }

  // Update rolling context from events
  updateContext(event) {
    switch (event.Event) {
      case 'FILTERWHEEL-CHANGED':
        if (event.New) {
          this.eventContext.currentFilter = event.New.Name;
        }
        break;

      case 'TS-TARGETSTART':
      case 'TS-NEWTARGETSTART':
        this.eventContext.currentTarget = {
          name: event.TargetName,
          project: event.ProjectName,
          coordinates: event.Coordinates,
          rotation: event.Rotation,
          endTime: event.TargetEndTime ? this.normalizeTimestamp(event.TargetEndTime) : null
        };
        break;

      case 'FLAT-CONNECTED':
      case 'FLAT-DISCONNECTED':
        this.eventContext.flatPanelState = {
          active: event.Event === 'FLAT-CONNECTED',
          time: new Date().toISOString()
        };
        break;

      case 'IMAGE-SAVE':
        if (event.ImageStatistics) {
          this.eventContext.lastImageStats = event.ImageStatistics;
          // Update filter from image if available
          if (event.ImageStatistics.Filter) {
            this.eventContext.currentFilter = event.ImageStatistics.Filter;
          }
        }
        break;
    }
  }

  // Check if event should be filtered out (noisy/no-op events)
  shouldFilterEvent(event) {
    const noisyEvents = [
      'HEARTBEAT',
      'PING',
      'KEEPALIVE'
    ];

    // Filter noisy events
    if (noisyEvents.includes(event.Event)) {
      return true;
    }

    // Filter no-op filter wheel changes
    if (event.Event === 'FILTERWHEEL-CHANGED' && 
        event.Previous && event.New && 
        event.Previous.Name === event.New.Name) {
      return true;
    }

    return false;
  }

  // Process batch of events
  normalizeBatch(events) {
    if (!Array.isArray(events)) {
      console.warn('❌ Events must be an array');
      return [];
    }

    const normalized = [];
    
    for (const event of events) {
      // Skip filtered events
      if (this.shouldFilterEvent(event)) {
        continue;
      }

      const normalizedEvent = this.normalizeEvent(event);
      if (normalizedEvent) {
        normalized.push(normalizedEvent);
      }
    }

    console.log(`✅ Normalized ${normalized.length}/${events.length} events`);
    return normalized;
  }

  // Get current context
  getContext() {
    return { ...this.eventContext };
  }

  // Reset context (useful for testing)
  resetContext() {
    this.eventContext = {
      currentFilter: null,
      currentTarget: null,
      flatPanelState: null,
      lastImageStats: null
    };
    this.recentEvents.clear();
  }
}

module.exports = EventNormalizer;
