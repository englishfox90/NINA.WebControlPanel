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
      lastUpdate: null,
      flats: { 
        isActive: false, 
        filter: null, 
        brightness: null, 
        imageCount: 0, 
        startedAt: null, 
        lastImageAt: null 
      }
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
    let sessionType = null; // 'sequence', 'target', 'flats', or 'darks'

    // Find the most recent session start - prioritize target sessions over sequences
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      const event = sortedEvents[i];
      if (event.parsedTime.getTime() <= nowTime) {
        // Target sessions (highest priority - can run for days)
        if (event.Event === 'TS-TARGETSTART' || event.Event === 'TS-NEWTARGETSTART') {
          startIndex = i;
          sessionType = 'target';
          break;
        } else if (event.Event === 'SEQUENCE-STARTING') {
          startIndex = i;
          sessionType = 'sequence';
          break;
        } else if (event.Event === 'FLAT-COVER-CLOSED') {
          startIndex = i;
          sessionType = 'flats';
          break;
        }
      }
    }

    // Check for dark capture session if no other session found
    if (startIndex === -1) {
      const darkSession = this.findDarkCaptureSession(sortedEvents, now);
      if (darkSession.hasActiveSession) {
        return { ...darkSession, sessionType: 'darks' };
      }
    }

    // Fallback: Check for recent imaging activity (IMAGE-SAVE events within last 30 minutes)
    if (startIndex === -1) {
      const recentImagingSession = this.findRecentImagingActivity(sortedEvents, now);
      if (recentImagingSession.hasActiveSession) {
        console.log('🔄 Detected active session from recent imaging activity');
        return { ...recentImagingSession, sessionType: 'imaging' };
      }
    }

    if (startIndex === -1) {
      return { hasActiveSession: false, startIndex: -1, endIndex: -1 };
    }

    // Find corresponding end event after that start
    for (let i = startIndex + 1; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      if ((sessionType === 'target' && this.isTargetEndEvent(event, sortedEvents[startIndex])) ||
          (sessionType === 'sequence' && event.Event === 'SEQUENCE-FINISHED') ||
          (sessionType === 'flats' && event.Event === 'FLAT-COVER-OPENED')) {
        endIndex = i;
        break;
      }
    }

    // For target sessions, also check if the target has expired based on TargetEndTime
    if (sessionType === 'target' && endIndex === -1) {
      const targetStartEvent = sortedEvents[startIndex];
      if (targetStartEvent.TargetEndTime) {
        const targetEndTime = new Date(targetStartEvent.TargetEndTime);
        if (now > targetEndTime) {
          console.log(`🎯 Target session expired: scheduled until ${targetStartEvent.TargetEndTime}`);
          // Mark as ended even though no explicit end event was found
          return { hasActiveSession: false, startIndex, endIndex: -1, sessionType };
        }
      }
    }

    return {
      hasActiveSession: true,
      startIndex,
      endIndex,
      sessionType
    };
  }

  // Helper method to determine if an event marks the end of a target session
  isTargetEndEvent(event, targetStartEvent) {
    // Explicit target end events
    if (event.Event === 'TS-TARGETEND' || event.Event === 'TS-TARGETFINISHED') {
      return true;
    }
    
    // New target start effectively ends the previous target
    if (event.Event === 'TS-TARGETSTART' || event.Event === 'TS-NEWTARGETSTART') {
      return event.TargetName !== targetStartEvent.TargetName;
    }
    
    return false;
  }

  findDarkCaptureSession(sortedEvents, now) {
    const nowTime = now.getTime();
    let firstDarkIndex = -1;
    let lastDarkIndex = -1;
    
    // Find all dark frame events within a reasonable time window (30 minutes)
    const darkEvents = [];
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      if (event.Event === 'IMAGE-SAVE' && 
          event.ImageStatistics && 
          event.ImageStatistics.ImageType === 'DARK') {
        darkEvents.push({ index: i, event, time: event.parsedTime.getTime() });
      }
    }

    if (darkEvents.length === 0) {
      return { hasActiveSession: false, startIndex: -1, endIndex: -1 };
    }

    // Find the most recent dark session (group of darks within 30 minutes)
    const sessionGapMinutes = 30;
    const sessionGapMs = sessionGapMinutes * 60 * 1000;
    
    let currentSessionStart = -1;
    let currentSessionEnd = -1;
    
    for (let i = darkEvents.length - 1; i >= 0; i--) {
      const darkEvent = darkEvents[i];
      
      // If this dark is before current time, it could be part of an active session
      if (darkEvent.time <= nowTime) {
        currentSessionEnd = darkEvent.index;
        
        // Find the start of this dark session (working backwards)
        for (let j = i; j >= 0; j--) {
          const prevDark = darkEvents[j];
          const timeDiff = (j < darkEvents.length - 1) ? 
            darkEvents[j + 1].time - prevDark.time : 0;
          
          if (j === 0 || timeDiff > sessionGapMs) {
            currentSessionStart = prevDark.index;
            break;
          }
        }
        
        // Check if this session is recent enough to be considered active (within last 30 minutes)
        const lastDarkTime = sortedEvents[currentSessionEnd].parsedTime.getTime();
        if (nowTime - lastDarkTime < sessionGapMs) {
          return {
            hasActiveSession: true,
            startIndex: currentSessionStart,
            endIndex: currentSessionEnd
          };
        }
        break;
      }
    }

    return { hasActiveSession: false, startIndex: -1, endIndex: -1 };
  }

  // Find recent imaging activity to detect active sessions even without explicit start events
  findRecentImagingActivity(sortedEvents, now) {
    const nowTime = now.getTime();
    const activityWindow = 30 * 60 * 1000; // 30 minutes
    
    let recentImageEvents = [];
    
    // Find recent IMAGE-SAVE events for LIGHT frames
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      const event = sortedEvents[i];
      const timeDiff = nowTime - event.parsedTime.getTime();
      
      // Only look at events within the activity window
      if (timeDiff > activityWindow) break;
      
      if (event.Event === 'IMAGE-SAVE' && 
          event.ImageStatistics && 
          event.ImageStatistics.ImageType === 'LIGHT') {
        recentImageEvents.push({ index: i, event, timeDiff });
      }
    }
    
    // If we have recent light frame captures, consider this an active session
    if (recentImageEvents.length > 0) {
      // Find the earliest recent image as session start
      const startIndex = recentImageEvents[recentImageEvents.length - 1].index;
      console.log(`🔄 Found ${recentImageEvents.length} recent light frames, considering session active since ${sortedEvents[startIndex].Time}`);
      
      return {
        hasActiveSession: true,
        startIndex: startIndex,
        endIndex: -1 // No end event found, session is ongoing
      };
    }
    
    return { hasActiveSession: false, startIndex: -1, endIndex: -1 };
  }

  extractSessionSlice(sortedEvents, boundaries) {
    if (boundaries.endIndex === -1) {
      return sortedEvents.slice(boundaries.startIndex);
    } else if (boundaries.sessionType === 'darks') {
      // For dark sessions, include the endIndex since it points to the last dark image
      return sortedEvents.slice(boundaries.startIndex, boundaries.endIndex + 1);
    } else {
      // For sequence and flat sessions, endIndex points to the closing event (excluded)
      return sortedEvents.slice(boundaries.startIndex, boundaries.endIndex);
    }
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
      lastEquipmentChange,
      flats: sessionData.flats || { 
        isActive: false, 
        filter: null, 
        brightness: null, 
        imageCount: 0, 
        startedAt: null, 
        lastImageAt: null 
      },
      darks: sessionData.darks || {
        isActive: false,
        currentExposureTime: null,
        exposureGroups: {},
        totalImages: 0,
        startedAt: null,
        lastImageAt: null
      }
    };
  }

  processSafetyState(events) {
    let safe = { isSafe: null, time: null };
    
    // Process events in reverse order to get the LATEST safety state
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.Event === 'SAFETY-CHANGED' && 'IsSafe' in event) {
        safe = {
          isSafe: event.IsSafe,
          time: event.Time
        };
        break; // Take the first (most recent) safety event and stop
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
    let flatState = { 
      isActive: false, 
      filter: null, 
      brightness: null, 
      imageCount: 0, 
      startedAt: null, 
      lastImageAt: null 
    };
    let darkState = {
      isActive: false,
      currentExposureTime: null,
      exposureGroups: {},
      totalImages: 0,
      startedAt: null,
      lastImageAt: null
    };

    // Track equipment states for activity determination
    let lastAutofocusStart = null;
    let lastGuiderEvent = null;
    let lastMountEvent = null;
    let lastRotatorEvent = null;
    
    // Track flat capture sequence
    let flatSessionActive = false;
    let flatImageCount = 0;
    let flatSessionStart = null;
    let currentFilter = null;
    let currentBrightness = null;

    // Track dark capture sequence
    let darkSessionActive = false;
    let darkImageCount = 0;
    let darkSessionStart = null;
    let darkExposureGroups = {};
    let currentDarkExposure = null;

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
        
        // Check if this is a dark frame
        const isDarkFrame = event.ImageStatistics && event.ImageStatistics.ImageType === 'DARK';
        
        if (isDarkFrame) {
          const exposureTime = event.ImageStatistics.ExposureTime || 0;
          
          // Initialize dark session if not active
          if (!darkSessionActive) {
            darkSessionActive = true;
            darkSessionStart = event.Time;
            darkImageCount = 0;
            darkExposureGroups = {};
            console.log('⚫ Dark capture session started');
          }
          
          // Track by exposure time
          if (!darkExposureGroups[exposureTime]) {
            darkExposureGroups[exposureTime] = {
              count: 0,
              firstImageAt: event.Time,
              lastImageAt: event.Time,
              temperature: event.ImageStatistics.Temperature || null,
              filter: event.ImageStatistics.Filter || null
            };
          }
          
          darkExposureGroups[exposureTime].count++;
          darkExposureGroups[exposureTime].lastImageAt = event.Time;
          darkImageCount++;
          currentDarkExposure = exposureTime;
          
          console.log(`⚫ Dark frame captured: ${exposureTime}s (${darkExposureGroups[exposureTime].count} total for this exposure)`);
          console.log(`🔍 Current dark exposure updated to: ${currentDarkExposure}s, total exposure groups:`, Object.keys(darkExposureGroups));
        } else if (flatSessionActive) {
          // If we're in a flat session, count the image
          flatImageCount++;
          flatState.lastImageAt = event.Time;
        }
      }

      // Flat panel event processing
      if (event.Event === 'FLAT-COVER-CLOSED') {
        flatSessionActive = true;
        flatSessionStart = event.Time;
        flatImageCount = 0;
        console.log('🟡 Flat capture session started');
      } else if (event.Event === 'FLAT-COVER-OPENED') {
        flatSessionActive = false;
        console.log(`🟡 Flat capture session ended (${flatImageCount} flats captured)`);
      } else if (event.Event === 'FLAT-BRIGHTNESS-CHANGED') {
        currentBrightness = event.New || null;
      } else if (event.Event === 'FILTERWHEEL-CHANGED' && flatSessionActive) {
        // Track filter during flat session
        currentFilter = event.New?.Name || null;
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

    // Update flat state
    flatState = {
      isActive: flatSessionActive,
      filter: currentFilter,
      brightness: currentBrightness,
      imageCount: flatImageCount,
      startedAt: flatSessionStart,
      lastImageAt: flatState.lastImageAt
    };

    // Update dark state
    darkState = {
      isActive: darkSessionActive,
      currentExposureTime: currentDarkExposure,
      exposureGroups: darkExposureGroups,
      totalImages: darkImageCount,
      startedAt: darkSessionStart,
      lastImageAt: darkImageCount > 0 ? Object.values(darkExposureGroups).reduce((latest, group) => 
        !latest || new Date(group.lastImageAt) > new Date(latest) ? group.lastImageAt : latest, null) : null
    };

    // Debug: Log final dark state
    if (darkSessionActive) {
      console.log(`🔍 Final dark state - Current exposure: ${currentDarkExposure}s, Total images: ${darkImageCount}, Groups:`, 
        Object.entries(darkExposureGroups).map(([exp, data]) => `${exp}s: ${data.count} images`).join(', '));
    }

    // Determine current activity (priority order)
    // If darks are active, override activity (highest priority for calibration frames)
    if (darkSessionActive) {
      const exposureCount = currentDarkExposure ? (darkExposureGroups[currentDarkExposure]?.count || 0) : 0;
      activity = {
        subsystem: 'darks',
        state: 'capturing_darks',
        since: darkSessionStart,
        details: {
          exposureTime: currentDarkExposure,
          exposureCount: exposureCount,
          totalExposures: Object.keys(darkExposureGroups).length,
          totalImages: darkImageCount
        }
      };
      
      console.log(`🔍 Activity set for darks - Exposure: ${currentDarkExposure}s, Count: ${exposureCount}, Total groups: ${Object.keys(darkExposureGroups).length}`);
    } else if (flatSessionActive) {
      const isCalibratingFlats = flatImageCount === 0 && currentBrightness !== null;
      activity = {
        subsystem: 'flats',
        state: isCalibratingFlats ? 'calibrating_flats' : 'capturing_flats',
        since: flatSessionStart
      };
    } else {
      activity = this.determineCurrentActivity({
        lastAutofocusStart,
        lastGuiderEvent,
        lastMountEvent,
        lastRotatorEvent
      });
    }

    // Apply target expiration check
    if (target) {
      target.isExpired = this.isTargetExpired(target, lastImage?.time);
      if (target.isExpired) {
        console.log(`🎯 Target "${target.name}" has expired after 8 hours of inactivity`);
      }
    }

    return { target, filter, lastImage, activity, flats: flatState, darks: darkState };
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
        rotation: event.Rotation || null,
        startedAt: event.Time || null,
        targetEndTime: event.TargetEndTime || null,  // Store the actual scheduled end time
        isExpired: false  // Will be calculated later
      };
    }
    return null;
  }

  // Check if target has expired using actual TargetEndTime from Target Scheduler
  isTargetExpired(target, lastImageTime) {
    if (!target) return false;
    
    const now = new Date();
    
    // Use TargetEndTime if available (most accurate)
    if (target.targetEndTime) {
      const targetEndTime = new Date(target.targetEndTime);
      const isExpired = now > targetEndTime;
      
      if (isExpired) {
        const hoursOverdue = Math.round((now.getTime() - targetEndTime.getTime()) / (60 * 60 * 1000));
        console.log(`🎯 Target "${target.name}" expired: scheduled until ${target.targetEndTime}, now ${hoursOverdue}h overdue`);
      }
      
      return isExpired;
    }
    
    // Fallback to 8-hour timeout if no TargetEndTime (legacy support)
    if (target.startedAt) {
      const targetStartTime = new Date(target.startedAt);
      const eightHours = 8 * 60 * 60 * 1000;
      const isExpired = (now.getTime() - targetStartTime.getTime()) > eightHours;
      
      if (isExpired) {
        console.log(`🎯 Target "${target.name}" expired (fallback): started ${target.startedAt}, elapsed ${Math.round((now.getTime() - targetStartTime.getTime()) / (60 * 60 * 1000))}h`);
      }
      
      return isExpired;
    }
    
    return false;
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
