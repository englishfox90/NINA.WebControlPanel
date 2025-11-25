// Event Normalizer
// Maps NINA WebSocket events to unified state updates
// Determines updateKind, updateReason, and which parts of state to modify

class EventNormalizer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    console.log('✅ EventNormalizer initialized');
  }

  /**
   * Process a NINA event and update state accordingly
   * @param {Object} event - Raw NINA event
   */
  processEvent(event) {
    if (!event) {
      console.warn('⚠️ Null event received');
      return;
    }

    // NINA events use "Event" field instead of "Type"
    const eventType = event.Event || event.Type;
    
    if (!eventType) {
      console.warn('⚠️ Event missing Event/Type field:', JSON.stringify(event).substring(0, 100));
      return;
    }

    console.log(`🔍 Processing event: ${eventType}`);

    try {
      // Route to appropriate handler based on event type
      if (this._isGuidingEvent(eventType)) {
        this._handleGuidingEvent(event);
      } else if (this._isSessionEvent(eventType)) {
        this._handleSessionEvent(event);
      } else if (this._isEquipmentEvent(eventType)) {
        this._handleEquipmentEvent(event);
      } else if (this._isImageEvent(eventType)) {
        this._handleImageEvent(event);
      } else if (this._isStackEvent(eventType)) {
        this._handleStackEvent(event);
      } else {
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`❌ Error processing event ${eventType}:`, error);
    }
  }

  /**
   * Check if event is guiding-related
   */
  _isGuidingEvent(type) {
    return /guiding|guider.*start|guider.*stop|guider.*disconnect|guider.*dither/i.test(type);
  }

  /**
   * Check if event is session-related
   */
  _isSessionEvent(type) {
    return /target|sequence|project/i.test(type);
  }

  /**
   * Check if event is equipment-related
   */
  _isEquipmentEvent(type) {
    return /mount|camera|filter|focuser|rotator|dome|weather|connected|disconnected|slew|track/i.test(type);
  }

  /**
   * Check if event is image-related
   */
  _isImageEvent(type) {
    return /image.*save|image.*saved|exposure/i.test(type);
  }

  /**
   * Check if event is stack-related
   */
  _isStackEvent(type) {
    return /stack/i.test(type);
  }

  /**
   * Handle guiding events
   */
  _handleGuidingEvent(event) {
    const type = event.Event || event.Type;
    let updateReason = 'guiding-update';
    let isGuiding = false;

    if (/start/i.test(type)) {
      updateReason = 'guiding-started';
      isGuiding = true;
    } else if (/stop|disconnect/i.test(type)) {
      updateReason = type.includes('DISCONNECT') ? 'guiding-disconnected' : 'guiding-stopped';
      isGuiding = false;
    } else if (/dither/i.test(type)) {
      updateReason = 'guiding-dithering';
      isGuiding = true;
    } else if (/stats|update/i.test(type)) {
      updateReason = 'guiding-update';
      isGuiding = true;
    }

    // Extract RMS values if available (check both Data and direct properties)
    const eventData = event.Data || event;
    const guidingData = {
      isGuiding,
      lastUpdate: new Date().toISOString()
    };

    if (eventData.RMSTotal !== undefined) guidingData.lastRmsTotal = eventData.RMSTotal;
    if (eventData.RMSRA !== undefined) guidingData.lastRmsRa = eventData.RMSRA;
    if (eventData.RMSDec !== undefined) guidingData.lastRmsDec = eventData.RMSDec;

    console.log(`🎯 Guiding: ${isGuiding ? 'Active' : 'Stopped'} (${updateReason})`);

    this.stateManager.updateSession({ guiding: guidingData });
    
    // Create specific summary based on event type
    let eventSummary = 'Guiding update';
    if (/start/i.test(type)) {
      eventSummary = 'Guiding started';
    } else if (/stop/i.test(type)) {
      eventSummary = 'Guiding stopped';
    } else if (/disconnect/i.test(type)) {
      eventSummary = 'Guiding disconnected';
    } else if (/dither/i.test(type)) {
      eventSummary = 'Dithering';
    } else if (guidingData.lastRmsTotal !== null) {
      eventSummary = `RMS: ${guidingData.lastRmsTotal.toFixed(2)}"`;
    }
    
    this.stateManager.addRecentEvent({
      time: event.Time || new Date().toISOString(),
      type: 'GUIDING',
      summary: eventSummary,
      meta: { rms: guidingData.lastRmsTotal }
    });

    this.stateManager.notifyListeners('session', updateReason, {
      path: 'currentSession.guiding',
      summary: `Guiding ${updateReason.replace('guiding-', '')}`,
      meta: guidingData
    });
  }

  /**
   * Handle session/target/sequence events
   */
  _handleSessionEvent(event) {
    const type = event.Event || event.Type;
    const eventData = event.Data || event;
    let updateReason = 'session-update';
    const sessionData = {};
    
    // Fix timezone issue for TS-TARGETSTART events (UTC timestamps need -6 hours)
    let eventTime = event.Time || new Date().toISOString();
    if (/ts-targetstart/i.test(type) && eventTime && !eventTime.includes('-06:00')) {
      // This is a UTC timestamp that needs timezone adjustment
      const utcDate = new Date(eventTime);
      utcDate.setHours(utcDate.getHours() - 6);
      eventTime = utcDate.toISOString();
      console.log(`🕐 Adjusted TS-TARGETSTART time from ${event.Time} to ${eventTime}`);
    }

    if (/target.*changed|targetstart/i.test(type)) {
      updateReason = 'target-changed';
      
      sessionData.target = {
        projectName: event.ProjectName || eventData.ProjectName || null,
        targetName: event.TargetName || eventData.TargetName || null,
        ra: event.Coordinates?.RA || eventData.RA || null,
        dec: event.Coordinates?.Dec || eventData.Dec || null,
        panelIndex: eventData.PanelIndex || null,
        rotation: event.Rotation || eventData.Rotation || null
      };
      
      // Check if target has ended based on TargetEndTime
      const targetEndTime = event.TargetEndTime || eventData.TargetEndTime;
      if (targetEndTime) {
        const endTime = new Date(targetEndTime);
        const now = new Date();
        
        // If we're past the target end time, session is not active
        if (now > endTime) {
          console.log(`⏰ Target ended at ${endTime.toISOString()}, current time ${now.toISOString()}`);
          sessionData.isActive = false;
        } else {
          // Target is still active
          sessionData.isActive = true;
          console.log(`✅ Target active until ${endTime.toISOString()}`);
        }
      }
    } else if (/sequence.*started/i.test(type)) {
      updateReason = 'sequence-started';
      sessionData.isActive = true;
      sessionData.startedAt = new Date().toISOString();
      
      sessionData.imaging = {
        sequenceName: eventData.SequenceName || null,
        currentFilter: eventData.Filter || null,
        exposureSeconds: eventData.ExposureTime || null,
        frameType: eventData.FrameType || 'LIGHT'
      };
    } else if (/sequence.*(completed|stopped|finished)/i.test(type)) {
      updateReason = 'sequence-completed';
      sessionData.isActive = false;
    }

    this.stateManager.updateSession(sessionData);
    
    // Create enriched session event summary
    let eventSummary = 'Session update';
    if (sessionData.target?.targetName) {
      eventSummary = `Target: ${sessionData.target.targetName}`;
      if (sessionData.target.projectName) {
        eventSummary += ` (${sessionData.target.projectName})`;
      }
    } else if (sessionData.imaging?.sequenceName) {
      eventSummary = `Sequence: ${sessionData.imaging.sequenceName}`;
    } else if (/completed|stopped|finished/i.test(updateReason)) {
      eventSummary = 'Sequence completed';
    } else if (/started/i.test(updateReason)) {
      eventSummary = 'Sequence started';
    }
    
    this.stateManager.addRecentEvent({
      time: eventTime,
      type: 'SESSION',
      summary: eventSummary,
      meta: { 
        TargetName: sessionData.target?.targetName,
        ProjectName: sessionData.target?.projectName,
        SequenceName: sessionData.imaging?.sequenceName
      }
    });

    this.stateManager.notifyListeners('session', updateReason, {
      path: 'currentSession',
      summary: updateReason.replace(/-/g, ' '),
      meta: sessionData
    });
  }

  /**
   * Handle equipment events
   */
  _handleEquipmentEvent(event) {
    const type = event.Event || event.Type;
    const eventData = event.Data || event;
    let equipmentId = this._extractEquipmentId(type);
    let updateReason = 'equipment-update';
    
    // Determine equipment status
    let status = 'unknown';
    let connected = true;

    if (/connected/i.test(type)) {
      connected = true;
      status = 'idle';
      updateReason = `${equipmentId}-connected`;
    } else if (/disconnected/i.test(type)) {
      connected = false;
      status = 'disconnected';
      updateReason = `${equipmentId}-disconnected`;
    } else if (/slewing/i.test(type)) {
      status = 'slewing';
      updateReason = 'mount-slewing';
    } else if (/tracking/i.test(type)) {
      status = 'tracking';
      updateReason = 'mount-tracking';
    } else if (/exposing/i.test(type)) {
      status = 'exposing';
      updateReason = 'camera-exposing';
    } else if (/cooling|warming/i.test(type)) {
      status = /cooling/i.test(type) ? 'cooling' : 'warming';
      updateReason = `camera-${status}`;
    } else if (/filter.*changed/i.test(type)) {
      status = 'idle';
      updateReason = 'filter-changed';
      
      // Update current filter in session imaging state
      const newFilterName = event.New?.Name || eventData.New?.Name;
      if (newFilterName) {
        this.stateManager.updateSession({
          imaging: {
            currentFilter: newFilterName
          }
        });
        console.log(`🎨 Filter changed to: ${newFilterName}`);
      }
    } else if (/focus.*moving|autofocus/i.test(type)) {
      status = 'moving';
      updateReason = 'focuser-moving';
    } else if (/flip/i.test(type)) {
      status = 'flipping';
      updateReason = 'mount-flipping';
    }

    const equipmentType = this._getEquipmentType(equipmentId);

    this.stateManager.upsertEquipment({
      id: equipmentId,
      type: equipmentType,
      name: eventData.Name || this._formatEquipmentName(equipmentId),
      connected,
      status,
      details: eventData
    });

    // Create enriched equipment event summary
    let equipmentSummary = `${this._formatEquipmentName(equipmentId)}`;
    if (!connected) {
      equipmentSummary += ': disconnected';
    } else if (status === 'idle') {
      equipmentSummary += ': connected';
    } else {
      equipmentSummary += `: ${status}`;
    }

    this.stateManager.addRecentEvent({
      time: event.Time || new Date().toISOString(),
      type: 'EQUIPMENT',
      summary: equipmentSummary,
      meta: { equipmentId, status, connected }
    });

    this.stateManager.notifyListeners('equipment', updateReason, {
      path: `equipment.${equipmentId}`,
      summary: `${this._formatEquipmentName(equipmentId)} ${updateReason.split('-')[1] || 'updated'}`,
      meta: { equipmentId, status, connected }
    });
  }

  /**
   * Handle image events
   */
  _handleImageEvent(event) {
    const type = event.Event || event.Type;
    const eventData = event.ImageStatistics || event.Data || event;
    
    if (/image.*save/i.test(type)) {
      const filter = eventData.Filter || event.Filter || null;
      const exposure = eventData.ExposureTime || eventData.Exposure || null;
      const frameType = eventData.ImageType || eventData.FrameType || 'LIGHT';
      
      // Update session with current imaging parameters
      this.stateManager.updateSession({
        isActive: true,
        imaging: {
          currentFilter: filter,
          exposureSeconds: exposure,
          frameType: frameType,
          lastImage: {
            at: event.Time || new Date().toISOString(),
            filePath: eventData.FilePath || eventData.Path || null,
            stars: eventData.Stars || null,
            hfr: eventData.HFR || null
          },
          progress: eventData.Progress ? {
            frameIndex: eventData.Progress.Current || null,
            totalFrames: eventData.Progress.Total || null
          } : null
        }
      });

      // Create concise image summary
      let imageSummary = 'Image saved';
      if (filter && exposure) {
        imageSummary = `${filter} ${exposure}s`;
      } else if (filter) {
        imageSummary = `${filter} image`;
      } else if (frameType && frameType !== 'LIGHT') {
        imageSummary = `${frameType} frame`;
      }
      
      this.stateManager.addRecentEvent({
        time: event.Time || new Date().toISOString(),
        type: 'IMAGE-SAVE',
        summary: imageSummary,
        meta: { Filter: filter, Exposure: exposure, FrameType: frameType }
      });

      this.stateManager.notifyListeners('image', 'image-saved', {
        path: 'currentSession.imaging.lastImage',
        summary: `Image saved: ${frameType} ${filter}`,
        meta: eventData
      });
    }
  }

  /**
   * Handle stack events
   */
  _handleStackEvent(event) {
    const type = event.Event || event.Type;
    const eventData = event.Data || event;
    
    console.log('ℹ️ Stack event received:', type);
    
    // Create concise stack summary
    const target = event.Target || eventData.Target || 'Unknown';
    const filter = event.Filter || eventData.Filter || '';
    const stackCount = event.StackCount || eventData.StackCount || 0;
    
    let stackSummary = `${target}`;
    if (filter) {
      stackSummary = `${filter}: ${stackCount} frames`;
    } else {
      stackSummary = `${target}: ${stackCount} frames`;
    }
    
    this.stateManager.addRecentEvent({
      time: event.Time || new Date().toISOString(),
      type: 'STACK',
      summary: stackSummary,
      meta: { Target: target, Filter: filter, StackCount: stackCount }
    });

    this.stateManager.notifyListeners('stack', 'stack-update', {
      path: 'stack',
      summary: type || 'Stack update',
      meta: eventData
    });
  }

  /**
   * Extract equipment ID from event type
   */
  _extractEquipmentId(type) {
    if (/camera/i.test(type)) return 'camera';
    if (/mount|telescope/i.test(type)) return 'mount';
    if (/filter/i.test(type)) return 'filterWheel';
    if (/focus/i.test(type)) return 'focuser';
    if (/rotat/i.test(type)) return 'rotator';
    if (/guid/i.test(type)) return 'guider';
    if (/dome/i.test(type)) return 'dome';
    if (/weather/i.test(type)) return 'weather';
    if (/flat/i.test(type)) return 'flatPanel';
    return 'other';
  }

  /**
   * Get equipment type from ID
   */
  _getEquipmentType(id) {
    const typeMap = {
      camera: 'camera',
      mount: 'mount',
      filterWheel: 'filterWheel',
      focuser: 'focuser',
      rotator: 'rotator',
      guider: 'guider',
      dome: 'other',
      weather: 'other',
      flatPanel: 'other'
    };
    return typeMap[id] || 'other';
  }

  /**
   * Format equipment name for display
   */
  _formatEquipmentName(id) {
    const nameMap = {
      camera: 'Camera',
      mount: 'Mount',
      filterWheel: 'Filter Wheel',
      focuser: 'Focuser',
      rotator: 'Rotator',
      guider: 'Guider',
      dome: 'Dome',
      weather: 'Weather Station',
      flatPanel: 'Flat Panel'
    };
    return nameMap[id] || id;
  }
}

module.exports = EventNormalizer;
