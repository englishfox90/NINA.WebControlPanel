// Event Normalizer - Standardizes events from different sources
const wsLogger = require('../utils/WebSocketEventLogger');
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
    wsLogger.logEventReceived('NORMALIZER', rawEvent);
    
    // Handle different NINA WebSocket event structures
    let eventType, eventData;
    
    if (rawEvent.Response?.Event) {
      // WebSocket live events: { Response: { Event: "IMAGE-SAVE", ... }, Type: "Socket", Success: true }
      eventType = rawEvent.Response.Event;
      eventData = rawEvent.Response;
    } else if (rawEvent.Event) {
      // Historical API events: { Event: "IMAGE-SAVE", Time: "...", ... }
      eventType = rawEvent.Event;
      eventData = rawEvent;
    } else {
      wsLogger.logEventIgnored('NORMALIZER', rawEvent, 'No Event field found in rawEvent or rawEvent.Response');
      return null;
    }

    // Generate timestamp (WebSocket events don't have Time field)
    let timestamp;
    if (eventData.Time) {
      timestamp = this.normalizeTimestamp(eventData.Time);
      if (!timestamp) {
        wsLogger.logEventIgnored('NORMALIZER', rawEvent, `Failed to parse timestamp: ${eventData.Time}`);
        console.warn('❌ Failed to parse timestamp for event:', eventType);
        return null;
      }
    } else {
      // Use current time for WebSocket events
      timestamp = new Date();
      wsLogger.log('NORMALIZER', 'TIMESTAMP_GENERATED', { eventType, timestamp: timestamp.toISOString() });
    }

    // Create event key for deduplication
    const eventKey = this.createEventKey({ Event: eventType, ...eventData }, timestamp);
    
    // Check for recent duplicate (within 1 second)
    if (this.isDuplicateEvent(eventKey, timestamp)) {
      wsLogger.logEventIgnored('NORMALIZER', rawEvent, 'Duplicate event within 1 second');
      console.log(`🔄 Skipping duplicate event: ${eventType}`);
      return null;
    }

    // Store in recent events for deduplication
    this.recentEvents.set(eventKey, timestamp);
    this.cleanupRecentEvents(timestamp);

    const normalizedEvent = {
      eventType: eventType,
      timestamp: timestamp.toISOString(),
      originalData: rawEvent,
      enrichedData: this.enrichEvent(eventData),
      // Include key event fields for easy access
      TargetName: eventData.TargetName,
      ProjectName: eventData.ProjectName,
      Coordinates: eventData.Coordinates,
      Rotation: eventData.Rotation,
      TargetEndTime: eventData.TargetEndTime,
      IsSafe: eventData.IsSafe,
      // Include filter information for FILTERWHEEL-CHANGED events
      FilterName: eventData.New?.Name,
      // Include ImageStatistics for IMAGE-SAVE events
      imageStatistics: eventData.ImageStatistics
    };

    // Update rolling context
    this.updateContext(eventData);

    wsLogger.log('NORMALIZER', 'NORMALIZED_SUCCESS', {
      eventType,
      hasImageStatistics: !!normalizedEvent.imageStatistics,
      timestampSource: eventData.Time ? 'original' : 'generated'
    });

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
  enrichEvent(eventData) {
    const enriched = { ...eventData };

    // Enrich IMAGE-SAVE events with context
    if (eventData.ImageStatistics || (eventData.Event === 'IMAGE-SAVE' && this.eventContext.currentFilter)) {
      if (!enriched.ImageStatistics) {
        enriched.ImageStatistics = {
          Filter: this.eventContext.currentFilter,
          TargetName: this.eventContext.currentTarget?.name,
          ProjectName: this.eventContext.currentTarget?.project,
          FlatPanelActive: this.eventContext.flatPanelState?.active || false
        };
      } else {
        // Enhance existing ImageStatistics with context
        enriched.ImageStatistics = {
          ...enriched.ImageStatistics,
          TargetName: enriched.ImageStatistics.TargetName || this.eventContext.currentTarget?.name,
          ProjectName: enriched.ImageStatistics.ProjectName || this.eventContext.currentTarget?.project,
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
  updateContext(eventData) {
    // Get the event type from the data
    const eventType = eventData.Event || (eventData.Response?.Event);
    
    switch (eventType) {
      case 'FILTERWHEEL-CHANGED':
        if (eventData.New) {
          this.eventContext.currentFilter = eventData.New.Name;
        }
        break;

      case 'TS-TARGETSTART':
      case 'TS-NEWTARGETSTART':
        this.eventContext.currentTarget = {
          name: eventData.TargetName,
          project: eventData.ProjectName,
          coordinates: eventData.Coordinates,
          rotation: eventData.Rotation,
          endTime: eventData.TargetEndTime ? this.normalizeTimestamp(eventData.TargetEndTime) : null
        };
        break;

      case 'FLAT-CONNECTED':
      case 'FLAT-DISCONNECTED':
        this.eventContext.flatPanelState = {
          active: eventType === 'FLAT-CONNECTED',
          time: new Date().toISOString()
        };
        break;

      case 'IMAGE-SAVE':
        // Store latest image stats for context
        if (eventData.ImageStatistics) {
          this.eventContext.lastImageStats = eventData.ImageStatistics;
          // Update filter from image if available
          if (eventData.ImageStatistics.Filter) {
            this.eventContext.currentFilter = eventData.ImageStatistics.Filter;
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
