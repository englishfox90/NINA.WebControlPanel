// Session State Processing Logic
// Handles the complex NINA event processing algorithm

const EventEmitter = require('events');

class SessionStateProcessor extends EventEmitter {
  constructor() {
    super();
    this.isDestroyed = false;
  }

  getEmptySessionState() {
    return {
      target: null,
      filter: null,
      lastImage: null,
      safe: { isSafe: null, time: null },
      activity: { subsystem: null, state: null, since: null },
      lastEquipmentChange: null,
      sessionStart: null,
      isActive: false,
      lastUpdate: null
    };
  }

  processNINAEvents(events, now = new Date()) {
    try {
      if (!events || events.length === 0) {
        return this.getEmptySessionState();
      }

      console.log('🔄 Processing session data from', events.length, 'events');
      
      // Step 1: Parse times and sort with error handling
      const sortedEvents = this.parseAndSortEvents(events);
      if (sortedEvents.length === 0) {
        return this.getEmptySessionState();
      }

      // Step 2: Find session boundaries
      const sessionBoundaries = this.findSessionBoundaries(sortedEvents, now);
      if (!sessionBoundaries.hasActiveSession) {
        console.log('❌ No active session found');
        return this.getEmptySessionState();
      }

      // Step 3: Extract session slice
      const sessionSlice = this.extractSessionSlice(sortedEvents, sessionBoundaries);
      console.log('📊 Session slice:', sessionSlice.length, 'events from', 
                  sessionSlice[0]?.Time, 'to', sessionSlice[sessionSlice.length - 1]?.Time);

      // Step 4: Process session state
      const sessionState = this.buildSessionState(sortedEvents, sessionSlice, sessionBoundaries);
      
      return {
        ...sessionState,
        sessionStart: sortedEvents[sessionBoundaries.startIndex]?.Time || null,
        isActive: sessionBoundaries.endIndex === -1,
        lastUpdate: now.toISOString()
      };

    } catch (error) {
      console.error('❌ Error in processNINAEvents:', error);
      return this.getEmptySessionState();
    }
  }

  parseAndSortEvents(events) {
    return events
      .filter(event => event && event.Time) // Filter out invalid events
      .map(event => {
        try {
          return {
            ...event,
            parsedTime: new Date(event.Time)
          };
        } catch (error) {
          console.warn('⚠️ Invalid event time format:', event.Time);
          return null;
        }
      })
      .filter(event => event !== null) // Remove invalid events
      .sort((a, b) => a.parsedTime.getTime() - b.parsedTime.getTime());
  }

  findSessionBoundaries(sortedEvents, now) {
    const nowTime = now.getTime();
    let startIndex = -1;
    let endIndex = -1;

    // Find last SEQUENCE-STARTING at or before now
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      if (sortedEvents[i].Event === 'SEQUENCE-STARTING' && 
          sortedEvents[i].parsedTime.getTime() <= nowTime) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      return { hasActiveSession: false, startIndex: -1, endIndex: -1 };
    }

    // Find first SEQUENCE-FINISHED after that start
    for (let i = startIndex + 1; i < sortedEvents.length; i++) {
      if (sortedEvents[i].Event === 'SEQUENCE-FINISHED') {
        endIndex = i;
        break;
      }
    }

    return {
      hasActiveSession: true,
      startIndex,
      endIndex
    };
  }

  extractSessionSlice(sortedEvents, boundaries) {
    return boundaries.endIndex === -1 
      ? sortedEvents.slice(boundaries.startIndex)
      : sortedEvents.slice(boundaries.startIndex, boundaries.endIndex);
  }

  buildSessionState(allEvents, sessionSlice, boundaries) {
    // Initialize state
    let target = null;
    let filter = null;
    let lastImage = null;
    let safe = { isSafe: null, time: null };
    let activity = { subsystem: null, state: null, since: null };
    let lastEquipmentChange = null;

    // Process safety from entire feed (not just session slice)
    safe = this.processSafetyState(allEvents);

    // Process equipment changes from entire feed
    lastEquipmentChange = this.processEquipmentChanges(allEvents);

    // Process session slice for session-specific state
    const sessionData = this.processSessionSlice(sessionSlice);
    
    return {
      target: sessionData.target,
      filter: sessionData.filter,
      lastImage: sessionData.lastImage,
      safe,
      activity: sessionData.activity,
      lastEquipmentChange
    };
  }

  processSafetyState(events) {
    let safe = { isSafe: null, time: null };
    
    for (const event of events) {
      if (event.Event === 'SAFETY-CHANGED' && 'IsSafe' in event) {
        safe = {
          isSafe: event.IsSafe,
          time: event.Time
        };
      }
    }
    
    return safe;
  }

  processEquipmentChanges(events) {
    let lastEquipmentChange = null;
    let mostRecentTime = null;

    for (const event of events) {
      if (event.Event.endsWith('-CONNECTED') || event.Event.endsWith('-DISCONNECTED')) {
        const device = event.Event.split('-')[0];
        const eventType = event.Event.endsWith('-CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
        const eventDate = new Date(event.Time);
        
        // Only update if this is the most recent equipment event
        if (!mostRecentTime || eventDate > mostRecentTime) {
          mostRecentTime = eventDate;
          lastEquipmentChange = {
            device,
            event: eventType,
            time: event.Time
          };
        }
      }
    }

    return lastEquipmentChange;
  }

  processSessionSlice(sessionSlice) {
    let target = null;
    let filter = null;
    let lastImage = null;
    let activity = { subsystem: null, state: null, since: null };

    // Track equipment states for activity determination
    let lastAutofocusStart = null;
    let lastGuiderEvent = null;
    let lastMountEvent = null;
    let lastRotatorEvent = null;

    // Process each event in session
    for (const event of sessionSlice) {
      // Target state
      if (event.Event === 'TS-NEWTARGETSTART' || event.Event === 'TS-TARGETSTART') {
        target = this.processTargetEvent(event);
      }

      // Filter state
      if (event.Event === 'FILTERWHEEL-CHANGED') {
        filter = this.processFilterEvent(event);
      }

      // Last image capture
      if (event.Event === 'IMAGE-SAVE') {
        lastImage = { time: event.Time };
      }

      // Activity tracking
      if (event.Event === 'AUTOFOCUS-START') {
        lastAutofocusStart = event.Time;
      } else if (event.Event === 'AUTOFOCUS-FINISHED') {
        lastAutofocusStart = null;
      }

      if (event.Event.startsWith('GUIDER-')) {
        lastGuiderEvent = { event: event.Event, time: event.Time };
      }

      if (event.Event.startsWith('MOUNT-')) {
        lastMountEvent = { event: event.Event, time: event.Time };
      }

      if (event.Event.startsWith('ROTATOR-')) {
        lastRotatorEvent = { event: event.Event, time: event.Time };
      }
    }

    // Determine current activity (priority order)
    activity = this.determineCurrentActivity({
      lastAutofocusStart,
      lastGuiderEvent,
      lastMountEvent,
      lastRotatorEvent
    });

    return { target, filter, lastImage, activity };
  }

  processTargetEvent(event) {
    if ('TargetName' in event && 'ProjectName' in event) {
      return {
        name: event.TargetName,
        project: event.ProjectName,
        coordinates: event.Coordinates || {
          ra: 0, dec: 0, raString: 'N/A', decString: 'N/A', 
          epoch: 'J2000', raDegrees: 0
        },
        rotation: event.Rotation || null
      };
    }
    return null;
  }

  processFilterEvent(event) {
    if ('New' in event) {
      const newFilter = event.New;
      return {
        name: newFilter.Name || newFilter.Id?.toString() || 'Unknown'
      };
    }
    return null;
  }

  determineCurrentActivity({ lastAutofocusStart, lastGuiderEvent, lastMountEvent, lastRotatorEvent }) {
    // Priority order: Autofocus > Guiding > Mount > Rotator
    if (lastAutofocusStart) {
      return {
        subsystem: 'autofocus',
        state: 'running',
        since: lastAutofocusStart
      };
    }

    if (lastGuiderEvent?.event === 'GUIDER-START') {
      return {
        subsystem: 'guiding',
        state: 'guiding',
        since: lastGuiderEvent.time
      };
    }

    if (lastMountEvent?.event === 'MOUNT-SLEWING') {
      return {
        subsystem: 'mount',
        state: 'slewing',
        since: lastMountEvent.time
      };
    }

    if (lastMountEvent?.event === 'MOUNT-HOMED') {
      return {
        subsystem: 'mount',
        state: 'homed',
        since: lastMountEvent.time
      };
    }

    if (lastRotatorEvent?.event === 'ROTATOR-MOVING') {
      return {
        subsystem: 'rotator',
        state: 'rotating',
        since: lastRotatorEvent.time
      };
    }

    return { subsystem: null, state: null, since: null };
  }

  destroy() {
    console.log('💥 Destroying SessionStateProcessor...');
    this.isDestroyed = true;
    this.removeAllListeners();
  }
}

module.exports = SessionStateProcessor;
