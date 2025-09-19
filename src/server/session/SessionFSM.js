// Session Finite State Machine
// Processes normalized events and maintains session state

class SessionFSM {
  constructor() {
    this.currentState = 'idle';
    this.sessionData = this.getEmptySessionData();
    this.transitions = this.defineTransitions();
  }

  // Define FSM state transitions
  defineTransitions() {
    return {
      idle: {
        'TS-TARGETSTART': (event) => this.startTargetSession(event),
        'TS-NEWTARGETSTART': (event) => this.startTargetSession(event),
        'SEQUENCE-STARTING': () => this.startSequenceSession(),
        'IMAGE-SAVE': (event) => this.handleImageSave(event),
        'FLAT-CONNECTED': () => this.startFlats(),
        'GUIDER-START': () => this.updateActivity('guiding', 'guiding')
      },
      
      imaging: {
        'TS-TARGETSTART': (event) => this.switchTarget(event),
        'TS-NEWTARGETSTART': (event) => this.switchTarget(event),
        'TS-TARGETEND': () => this.endSession(),
        'TS-TARGETFINISHED': () => this.endSession(),
        'SEQUENCE-STOPPED': () => this.endSession(),
        'SEQUENCE-COMPLETED': () => this.endSession(),
        'IMAGE-SAVE': (event) => this.handleImageSave(event),
        'FILTERWHEEL-CHANGED': (event) => this.updateFilter(event),
        'GUIDER-START': () => this.updateActivity('guiding', 'guiding'),
        'GUIDER-STOP': () => this.updateActivity('guiding', 'stopped'),
        'GUIDER-DISCONNECTED': () => this.updateActivity('guiding', 'stopped'),
        'SAFETY-CHANGED': (event) => this.handleSafetyChanged(event),
        'SAFETY-CONNECTED': (event) => this.handleSafetyConnected(event),
        'SAFETY-DISCONNECTED': () => this.handleSafetyDisconnected(),
        'FLAT-CONNECTED': () => this.startFlats(),
        'EQUIPMENT-DISCONNECTED': (event) => this.handleEquipmentChange(event)
      },
      
      flats: {
        'IMAGE-SAVE': (event) => this.handleFlatImage(event),
        'FLAT-DISCONNECTED': () => this.endFlats(),
        'TS-TARGETSTART': () => this.switchToImaging(),
        'SEQUENCE-STARTING': () => this.switchToImaging()
      },
      
      darks: {
        'IMAGE-SAVE': (event) => this.handleDarkImage(event),
        'SEQUENCE-STOPPED': () => this.endDarks(),
        'TS-TARGETSTART': () => this.switchToImaging()
      },
      
      paused: {
        'GUIDER-START': () => this.resumeSession(),
        'TS-TARGETSTART': () => this.resumeSession(),
        'EQUIPMENT-CONNECTED': () => this.resumeSession(),
        'SAFETY-CHANGED': (event) => this.handleSafetyChanged(event),
        'SAFETY-CONNECTED': (event) => this.handleSafetyConnected(event),
        'SAFETY-DISCONNECTED': () => this.handleSafetyDisconnected()
      }
    };
  }

  // Process event through FSM
  processEvent(normalizedEvent) {
    const { eventType, timestamp, enrichedData } = normalizedEvent;
    
    // Get transitions for current state
    const stateTransitions = this.transitions[this.currentState] || {};
    const transition = stateTransitions[eventType];
    
    if (transition) {
      // Execute transition
      const result = transition(normalizedEvent);
      return result;
    } else {
      // Handle generic events that don't change state
      this.handleGenericEvent(normalizedEvent);
      return false; // No state change
    }
  }

  // Start target imaging session
  startTargetSession(normalizedEvent) {
    this.currentState = 'imaging';
    
    // Extract target information from the event (prioritize direct event data, then enriched context)
    const targetName = normalizedEvent?.TargetName || 
                      normalizedEvent?.enrichedData?.target?.name || 'Unknown Target';
    const projectName = normalizedEvent?.ProjectName || 
                       normalizedEvent?.enrichedData?.target?.project || 'Unknown Project';
    const targetEndTime = normalizedEvent?.TargetEndTime ? 
                         this.normalizeTimestamp(normalizedEvent.TargetEndTime) :
                         normalizedEvent?.enrichedData?.target?.endTime || null;
    const coordinates = normalizedEvent?.Coordinates || 
                       normalizedEvent?.enrichedData?.target?.coordinates || null;
    const rotation = normalizedEvent?.Rotation || 
                    normalizedEvent?.enrichedData?.target?.rotation || null;
    
    // Preserve existing session data when starting/updating target
    this.sessionData = {
      ...this.sessionData, // Keep existing data (filter, safety, etc.)
      target: {
        name: targetName,
        project: projectName,
        coordinates: coordinates,
        rotation: rotation,
        startedAt: this.sessionData.sessionStart || new Date().toISOString(), // Keep original session start
        targetEndTime: targetEndTime,
        isExpired: false,
        endTime: targetEndTime // Store the parsed end time for expiration checks
      },
      sessionStart: this.sessionData.sessionStart || new Date().toISOString(), // Keep original session start
      isActive: true
    };
    
    // Check initial expiration status
    this.checkSessionExpiration();
    
    return true;
  }

  // Start sequence session (non-target)
  startSequenceSession() {
    this.currentState = 'imaging';
    // Preserve existing session data when starting sequence
    this.sessionData = {
      ...this.sessionData, // Keep existing data (filter, safety, etc.)
      sessionStart: this.sessionData.sessionStart || new Date().toISOString(),
      isActive: true,
      activity: {
        subsystem: 'sequencer',
        state: 'running',
        since: new Date().toISOString()
      }
    };
    return true;
  }

  // Handle image save events
  handleImageSave(event) {
    const imageStats = event.enrichedData?.ImageStatistics || {};
    const imageType = imageStats.ImageType || 'UNKNOWN';
    
    // Update last image data with comprehensive metadata
    this.sessionData.lastImage = {
      type: imageType,
      filter: imageStats.Filter,
      exposureTime: imageStats.ExposureTime,
      temperature: imageStats.Temperature,
      hfr: imageStats.HFR,
      stars: imageStats.Stars,
      rms: imageStats.RmsText,
      timestamp: event.timestamp,
      // Additional metadata for better image handling
      filePath: imageStats.FileName || imageStats.FilePath || null,
      binning: imageStats.Binning || null,
      gain: imageStats.Gain || null,
      offset: imageStats.Offset || null,
      median: imageStats.Median || null,
      mad: imageStats.MAD || null,
      isRelevant: true, // Mark as relevant when first saved
      savedAt: new Date().toISOString() // Track when we saved this metadata
    };

    console.log('📸 IMAGE-SAVE: Updated lastImage metadata:', {
      type: imageType,
      filter: imageStats.Filter,
      timestamp: event.timestamp,
      hfr: imageStats.HFR,
      stars: imageStats.Stars
    });

    // Handle different image types
    switch (imageType) {
      case 'FLAT':
        return this.handleFlatImage(event);
      case 'DARK':
        return this.handleDarkImage(event);
      case 'LIGHT':
        // Update filter from light frame
        if (imageStats.Filter) {
          this.sessionData.filter = { name: imageStats.Filter };
        }
        break;
    }

    return false;
  }

  // Handle flat calibration
  startFlats() {
    this.currentState = 'flats';
    this.sessionData.flats = {
      isActive: true,
      filter: this.sessionData.filter?.name || null,
      brightness: null,
      imageCount: 0,
      startedAt: new Date().toISOString(),
      lastImageAt: null
    };
    return true;
  }

  handleFlatImage(event) {
    if (this.sessionData.flats.isActive) {
      this.sessionData.flats.imageCount++;
      this.sessionData.flats.lastImageAt = event.timestamp;
      
      // Extract brightness from image stats or flat panel
      const imageStats = event.enrichedData?.ImageStatistics || {};
      if (imageStats.FlatBrightness) {
        this.sessionData.flats.brightness = imageStats.FlatBrightness;
      }
    }
    return false;
  }

  endFlats() {
    this.sessionData.flats.isActive = false;
    this.currentState = this.sessionData.isActive ? 'imaging' : 'idle';
    return true;
  }

  // Handle dark calibration
  handleDarkImage(event) {
    const imageStats = event.enrichedData?.ImageStatistics || {};
    const exposureTime = imageStats.ExposureTime;
    
    if (!this.sessionData.darks.isActive) {
      this.currentState = 'darks';
      this.sessionData.darks = {
        isActive: true,
        currentExposureTime: exposureTime,
        exposureGroups: {},
        totalImages: 0,
        startedAt: event.timestamp,
        lastImageAt: event.timestamp
      };
    }

    // Track exposure groups
    if (exposureTime) {
      const key = exposureTime.toString();
      this.sessionData.darks.exposureGroups[key] = 
        (this.sessionData.darks.exposureGroups[key] || 0) + 1;
    }
    
    this.sessionData.darks.totalImages++;
    this.sessionData.darks.lastImageAt = event.timestamp;
    
    return false;
  }

  endDarks() {
    this.sessionData.darks.isActive = false;
    this.currentState = this.sessionData.isActive ? 'imaging' : 'idle';
    return true;
  }

  // Update activity state
  updateActivity(subsystem, state) {
    this.sessionData.activity = {
      subsystem,
      state,
      since: new Date().toISOString()
    };
    
    // Update guiding status based on activity
    if (subsystem === 'guiding') {
      this.sessionData.isGuiding = (state === 'guiding');
    }
    
    return false;
  }

  // Update filter
  updateFilter(event) {
    const filterName = event.FilterName || 
                      event.originalData?.New?.Name || 
                      event.enrichedData?.New?.Name;
    
    if (filterName) {
      this.sessionData.filter = { name: filterName };
    }
    return false;
  }

  // Handle safety events - ONLY called by SAFETY-CHANGED events
  handleSafety(isSafe, timestamp = null) {
    this.sessionData.safe = {
      isSafe,
      time: timestamp || new Date().toISOString()
    };
    
    if (!isSafe && this.currentState === 'imaging') {
      this.currentState = 'paused';
      return true;
    }
    
    return false;
  }

  // Handle safety events with IsSafe property - THE ONLY METHOD THAT UPDATES SAFETY STATE
  handleSafetyChanged(event) {
    const isSafe = event.IsSafe === 'True' || event.IsSafe === true;
    return this.handleSafety(isSafe, event.timestamp);
  }

  // Handle safety monitor connection
  handleSafetyConnected(event) {
    // Only SAFETY-CHANGED events should update the safety state
    return false;
  }

  // Handle safety monitor disconnection
  handleSafetyDisconnected() {
    // Only SAFETY-CHANGED events should update the safety state
    return false;
  }

  // Handle equipment changes
  handleEquipmentChange(event) {
    this.sessionData.lastEquipmentChange = {
      device: this.extractDeviceName(event.eventType),
      event: event.eventType.includes('CONNECTED') ? 'CONNECTED' : 'DISCONNECTED',
      time: event.timestamp
    };
    return false;
  }

  // End session
  endSession() {
    this.currentState = 'idle';
    this.sessionData.isActive = false;
    if (this.sessionData.target) {
      this.sessionData.target.endedAt = new Date().toISOString();
    }
    return true;
  }

  // Switch to new target
  switchTarget(normalizedEvent) {
    // End current target and start new one
    this.endSession();
    return this.startTargetSession(normalizedEvent);
  }

  switchToImaging() {
    this.endFlats();
    this.endDarks();
    this.currentState = 'imaging';
    return true;
  }

  resumeSession() {
    this.currentState = this.sessionData.isActive ? 'imaging' : 'idle';
    return true;
  }

  // Handle events that don't change state
  handleGenericEvent(event) {
    // Update last update timestamp
    this.sessionData.lastUpdate = event.timestamp;
    
    // Handle guiding events
    if (event.eventType.startsWith('GUIDER-')) {
      const isGuiding = event.eventType === 'GUIDER-START';
      this.updateActivity('guiding', isGuiding ? 'guiding' : 'stopped');
    }
  }

  // Get current session data
  getSessionData() {
    return {
      ...this.sessionData,
      lastUpdate: new Date().toISOString()
    };
  }

  // Helper methods for data extraction
  extractTargetName() {
    // Implementation depends on current event context
    return 'Unknown Target';
  }

  extractProjectName() {
    return 'Unknown Project';
  }

  extractCoordinates() {
    return null;
  }

  extractRotation() {
    return null;
  }

  extractTargetEndTime() {
    // Extract target end time from current session target
    if (this.sessionData.target && this.sessionData.target.endTime) {
      return this.sessionData.target.endTime;
    }
    return null;
  }

  // Check if current session is expired based on target end time
  checkSessionExpiration() {
    if (!this.sessionData.target || !this.sessionData.target.endTime) {
      return false; // No end time means no expiration
    }

    const now = new Date();
    const targetEndTime = new Date(this.sessionData.target.endTime);
    
    const isExpired = now > targetEndTime;
    
    if (isExpired !== this.sessionData.target.isExpired) {
      this.sessionData.target.isExpired = isExpired;
      // Note: Don't automatically end session - allow recent imaging activity to keep it alive
    }
    
    return isExpired;
  }

  extractDeviceName(eventType) {
    return eventType.split('-')[0];
  }

  // Get empty session data structure
  getEmptySessionData() {
    return {
      target: null,
      filter: null,
      lastImage: null,
      safe: { isSafe: null, time: null },
      activity: { subsystem: null, state: null, since: null },
      lastEquipmentChange: null,
      isGuiding: false,
      flats: {
        isActive: false,
        filter: null,
        brightness: null,
        imageCount: 0,
        startedAt: null,
        lastImageAt: null
      },
      darks: {
        isActive: false,
        currentExposureTime: null,
        exposureGroups: {},
        totalImages: 0,
        startedAt: null,
        lastImageAt: null
      },
      sessionStart: null,
      isActive: false,
      lastUpdate: null
    };
  }

  // Simple timestamp normalization - assumes NINA local time if no timezone
  normalizeTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // If already has timezone offset, return as is
    if (timestamp.includes('+') || timestamp.includes('Z')) {
      return timestamp;
    }
    
    // Assume NINA local time (Chicago UTC-5) for timestamps without timezone
    return `${timestamp}-05:00`;
  }
}

module.exports = SessionFSM;
