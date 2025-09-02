// Event Processing Logic for NINA Session State
// Handles classification and processing of NINA events

const EventEmitter = require('events');

class EventProcessor extends EventEmitter {
  constructor() {
    super();
    this.isDestroyed = false;
  }

  processEvent(event) {
    if (this.isDestroyed || !event || !event.Event) return null;

    const eventType = event.Event;
    const eventTime = new Date(event.Time || new Date().toISOString());

    // Classify the event and emit appropriate events
    if (this.isEquipmentEvent(eventType)) {
      const equipmentData = this.processEquipmentEvent(event, eventTime);
      this.emit('equipmentEvent', equipmentData);
      return { type: 'equipment', data: equipmentData };
    }

    if (this.isSafetyEvent(eventType)) {
      const safetyData = this.processSafetyEvent(event, eventTime);
      this.emit('safetyEvent', safetyData);
      return { type: 'safety', data: safetyData };
    }

    if (this.isTargetEvent(eventType)) {
      const targetData = this.processTargetEvent(event, eventTime);
      this.emit('targetEvent', targetData);
      return { type: 'target', data: targetData };
    }

    if (this.isFilterEvent(eventType)) {
      const filterData = this.processFilterEvent(event, eventTime);
      this.emit('filterEvent', filterData);
      return { type: 'filter', data: filterData };
    }

    if (this.isImageEvent(eventType)) {
      const imageData = this.processImageEvent(event, eventTime);
      this.emit('imageEvent', imageData);
      
      // Check if this is a dark frame
      if (this.isDarkImage(event)) {
        const darkData = this.processDarkEvent(event, eventTime);
        this.emit('darkEvent', darkData);
        return { type: 'dark', data: darkData };
      }
      
      return { type: 'image', data: imageData };
    }

    if (this.isFlatEvent(eventType)) {
      const flatData = this.processFlatEvent(event, eventTime);
      this.emit('flatEvent', flatData);
      return { type: 'flat', data: flatData };
    }

    if (this.isActivityEvent(eventType)) {
      const activityData = this.processActivityEvent(event, eventTime);
      this.emit('activityEvent', activityData);
      return { type: 'activity', data: activityData };
    }

    if (this.isSessionEvent(eventType)) {
      const sessionData = this.processSessionEvent(event, eventTime);
      this.emit('sessionEvent', sessionData);
      return { type: 'session', data: sessionData };
    }

    // Generic event
    this.emit('genericEvent', { event, eventTime });
    return { type: 'generic', data: { event, eventTime } };
  }

  // Event type classifiers
  isEquipmentEvent(eventType) {
    return eventType.endsWith('-CONNECTED') || eventType.endsWith('-DISCONNECTED');
  }

  isSafetyEvent(eventType) {
    return eventType === 'FLAT-LIGHT-TOGGLED' || eventType === 'SAFETY-CHANGED';
  }

  isTargetEvent(eventType) {
    return eventType === 'TS-NEWTARGETSTART' || eventType === 'TS-TARGETSTART';
  }

  isFilterEvent(eventType) {
    return eventType === 'FILTERWHEEL-CHANGED';
  }

  isImageEvent(eventType) {
    return eventType === 'IMAGE-SAVE';
  }

  isFlatEvent(eventType) {
    return eventType.startsWith('FLAT-') || 
           ['FLAT-COVER-CLOSED', 'FLAT-COVER-OPENED', 'FLAT-LIGHT-TOGGLED', 'FLAT-BRIGHTNESS-CHANGED'].includes(eventType);
  }

  isActivityEvent(eventType) {
    const activityEvents = [
      'AUTOFOCUS-START', 'AUTOFOCUS-FINISHED',
      'GUIDER-START', 'GUIDER-STOP', 'GUIDER-DISCONNECTED',
      'MOUNT-SLEWING', 'MOUNT-HOMED',
      'ROTATOR-MOVING', 'ROTATOR-SYNCED'
    ];
    return activityEvents.includes(eventType);
  }

  isSessionEvent(eventType) {
    return eventType === 'SEQUENCE-STARTING' || eventType === 'SEQUENCE-FINISHED';
  }

  // Event processors
  processEquipmentEvent(event, eventTime) {
    const eventType = event.Event;
    const deviceMatch = eventType.match(/^(.+)-(CONNECTED|DISCONNECTED)$/);
    
    if (deviceMatch) {
      return {
        device: deviceMatch[1].toLowerCase(),
        event: deviceMatch[2].toLowerCase(),
        time: eventTime.toISOString(),
        originalEvent: event
      };
    }
    
    return null;
  }

  processSafetyEvent(event, eventTime) {
    if (event.Event === 'FLAT-LIGHT-TOGGLED' || event.Event === 'SAFETY-CHANGED') {
      return {
        isSafe: event.IsSafe || false,
        time: eventTime.toISOString(),
        originalEvent: event
      };
    }
    
    return null;
  }

  processTargetEvent(event, eventTime) {
    return {
      name: event.TargetName || null,
      project: event.ProjectName || null,
      ra: event.RA || event.Coordinates?.RA || null,
      dec: event.Dec || event.Coordinates?.Dec || null,
      raString: event.RAString || event.Coordinates?.RAString || null,
      decString: event.DecString || event.Coordinates?.DecString || null,
      rotation: event.Rotation || null,
      targetEndTime: event.TargetEndTime || null,
      // Store the full coordinates object for backward compatibility
      coordinates: event.Coordinates || null,
      time: eventTime.toISOString(),
      originalEvent: event
    };
  }

  processFilterEvent(event, eventTime) {
    return {
      name: event.New?.Name || event.FilterName || null,
      previous: event.Previous?.Name || null,
      time: eventTime.toISOString(),
      isChange: event.Previous?.Name !== event.New?.Name,
      originalEvent: event
    };
  }

  processImageEvent(event, eventTime) {
    return {
      time: eventTime.toISOString(),
      imageStatistics: event.ImageStatistics || null,
      originalEvent: event
    };
  }

  processFlatEvent(event, eventTime) {
    const eventType = event.Event;
    const data = {
      type: eventType,
      time: eventTime.toISOString(),
      originalEvent: event
    };

    switch (eventType) {
      case 'FLAT-COVER-CLOSED':
        return { ...data, action: 'session_start', isCoverClosed: true };
      
      case 'FLAT-COVER-OPENED':
        return { ...data, action: 'session_end', isCoverClosed: false };
      
      case 'FLAT-LIGHT-TOGGLED':
        return { ...data, action: 'light_toggle', isLightOn: event.IsLightOn || false };
      
      case 'FLAT-BRIGHTNESS-CHANGED':
        return { 
          ...data, 
          action: 'brightness_change', 
          brightness: event.New || null,
          previousBrightness: event.Previous || null 
        };
      
      default:
        return { ...data, action: 'unknown' };
    }
  }

  processActivityEvent(event, eventTime) {
    const eventType = event.Event;
    let subsystem = null;
    let state = null;
    let priority = 0;

    // Determine subsystem and state based on event type
    if (eventType.startsWith('AUTOFOCUS-')) {
      subsystem = 'camera';
      state = eventType === 'AUTOFOCUS-START' ? 'autofocus' : null;
      priority = 4; // Highest priority
    } else if (eventType.startsWith('GUIDER-')) {
      subsystem = 'guider';
      state = eventType === 'GUIDER-START' ? 'guiding' : null;
      priority = 3;
    } else if (eventType.startsWith('MOUNT-')) {
      subsystem = 'mount';
      state = eventType === 'MOUNT-SLEWING' ? 'slewing' : 
             eventType === 'MOUNT-HOMED' ? 'homed' : null;
      priority = 2;
    } else if (eventType.startsWith('ROTATOR-')) {
      subsystem = 'rotator';
      state = eventType === 'ROTATOR-MOVING' ? 'rotating' : null;
      priority = 1; // Lowest priority
    }

    return {
      subsystem,
      state,
      priority,
      time: eventTime.toISOString(),
      isStart: state !== null,
      isStop: state === null,
      originalEvent: event
    };
  }

  processSessionEvent(event, eventTime) {
    return {
      type: event.Event === 'SEQUENCE-STARTING' ? 'start' : 'finish',
      time: eventTime.toISOString(),
      originalEvent: event
    };
  }

  // Dark frame detection and processing
  isDarkImage(event) {
    return event.Event === 'IMAGE-SAVE' && 
           event.ImageStatistics && 
           event.ImageStatistics.ImageType === 'DARK';
  }

  processDarkEvent(event, eventTime) {
    const stats = event.ImageStatistics;
    return {
      type: 'dark_capture',
      time: eventTime.toISOString(),
      exposureTime: stats.ExposureTime || 0,
      temperature: stats.Temperature || null,
      filter: stats.Filter || null,
      gain: stats.Gain || null,
      offset: stats.Offset || null,
      cameraName: stats.CameraName || 'Unknown',
      action: 'image_captured',
      originalEvent: event
    };
  }

  // Utility methods
  getEventPriority(eventType) {
    if (eventType.startsWith('AUTOFOCUS-')) return 4;
    if (eventType.startsWith('GUIDER-')) return 3;
    if (eventType.startsWith('MOUNT-')) return 2;
    if (eventType.startsWith('ROTATOR-')) return 1;
    return 0;
  }

  isHighPriorityEvent(eventType) {
    return this.getEventPriority(eventType) >= 3;
  }

  destroy() {
    console.log('💥 Destroying EventProcessor...');
    this.isDestroyed = true;
    this.removeAllListeners();
  }
}

module.exports = EventProcessor;
