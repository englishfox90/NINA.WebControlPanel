// Session State Manager for NINA Event Processing
// Handles event history seeding, WebSocket connections, and session state management

const WebSocket = require('ws');
const EventEmitter = require('events');

class SessionStateManager extends EventEmitter {
  constructor(ninaService) {
    super();
    this.ninaService = ninaService;
    this.events = [];
    this.sessionState = this.getEmptySessionState();
    this.wsConnection = null;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
    
    // Initialize the session state manager
    this.initialize();
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

  async initialize() {
    try {
      console.log('🔄 Initializing SessionStateManager...');
      
      // Seed with event history
      await this.seedEventHistory();
      
      // Process initial session state
      this.processSessionState();
      
      // Start WebSocket connection to NINA
      this.connectToNINA();
      
      this.isInitialized = true;
      console.log('[BACKEND] ✅ SessionStateManager initialized');
      
      // Emit initialized event for config-server.js
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize SessionStateManager:', error);
    }
  }

  async seedEventHistory() {
    try {
      console.log('📚 Seeding session state with NINA event history...');
      const eventHistoryResponse = await this.ninaService.getEventHistory();
      
      if (eventHistoryResponse.Success && Array.isArray(eventHistoryResponse.Response)) {
        this.events = eventHistoryResponse.Response;
        console.log(`✅ Seeded with ${this.events.length} historical events`);
      } else {
        console.warn('⚠️ No event history available, starting with empty state');
        this.events = [];
      }
      
    } catch (error) {
      console.error('❌ Failed to seed event history:', error);
      this.events = [];
    }
  }

  connectToNINA() {
    try {
      // Get NINA configuration
      const config = this.ninaService.configDb.getConfig();
      const wsUrl = `ws://${config.nina.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}:${config.nina.apiPort}/v2/socket`;
      
      console.log(`🔌 Connecting to NINA WebSocket: ${wsUrl}`);
      
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.on('open', () => {
        console.log('✅ Connected to NINA WebSocket');
        this.reconnectAttempts = 0;
        
        // Send SUBSCRIBE message as required by NINA WebSocket API
        console.log('📡 Sending SUBSCRIBE message to NINA WebSocket');
        this.wsConnection.send('SUBSCRIBE /v2/socket');
        
        // Clear any existing reconnect interval
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      });

      this.wsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.Success && message.Response && message.Response.Event) {
            const event = message.Response;
            console.log('📡 NINA WebSocket Event:', event.Event, 'at', event.Time);
            console.log('🔍 Full event object:', JSON.stringify(event, null, 2));
            
            // Check for equipment events and emit them immediately
            if (event.Event.endsWith('-CONNECTED') || event.Event.endsWith('-DISCONNECTED')) {
              const device = event.Event.split('-')[0];
              const eventType = event.Event.endsWith('-CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
              
              console.log('⚙️ Real-time equipment event detected:', event.Event);
              
              const equipmentEvent = {
                device,
                event: eventType,
                time: event.Time || new Date().toISOString(),
                originalEvent: event.Event
              };
              
              // Emit equipment event immediately for real-time updates
              this.emit('equipmentChange', equipmentEvent);
            }
            
            // Check for safety-related events for the safety banner
            if (event.Event === 'FLAT-LIGHT-TOGGLED' || event.Event === 'SAFETY-CHANGED') {
              console.log('🚨 Safety-related event detected:', event.Event);
              
              const safetyEvent = {
                eventType: event.Event,
                time: event.Time || new Date().toISOString(),
                data: event.Data || {},
                originalEvent: event
              };
              
              // Emit safety event immediately for real-time safety monitoring
              this.emit('safetyChange', safetyEvent);
            }
            
            // Add event to our events array
            this.events.unshift(event);
            console.log('📚 Event added to array. Total events:', this.events.length);
            
            // Keep only last 1000 events to prevent memory issues
            if (this.events.length > 1000) {
              this.events = this.events.slice(0, 1000);
            }
            
            console.log('🔄 Processing updated session state with new event...');
            // Reprocess session state
            this.processSessionState();
          } else {
            console.log('⚠️ Ignoring WebSocket message - no event data:', message);
          }
        } catch (error) {
          console.error('❌ Error processing NINA WebSocket message:', error);
        }
      });

      this.wsConnection.on('close', () => {
        console.log('❌ NINA WebSocket connection closed');
        this.scheduleReconnect();
      });

      this.wsConnection.on('error', (error) => {
        console.error('❌ NINA WebSocket error:', error.message);
        this.scheduleReconnect();
      });
      
    } catch (error) {
      console.error('❌ Failed to connect to NINA WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💀 Max WebSocket reconnection attempts reached');
      return;
    }

    if (this.reconnectInterval) return; // Already scheduled

    const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectInterval = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectInterval = null;
      this.connectToNINA();
    }, delay);
  }

  // Process session state from events array (your comprehensive algorithm)
  processSessionState() {
    const now = new Date();
    const processedState = this.processNINAEvents(this.events, now);
    
    console.log('🔍 Current session state:', JSON.stringify(this.sessionState, null, 2));
    console.log('🔍 New processed state:', JSON.stringify(processedState, null, 2));
    
    // Update session state if changed - ALWAYS update for real-time events
    const stateChanged = JSON.stringify(processedState) !== JSON.stringify(this.sessionState);
    console.log('📊 State changed?', stateChanged);
    
    // Check if equipment state has changed and emit equipment change event
    const equipmentChanged = processedState.lastEquipmentChange && 
      JSON.stringify(processedState.lastEquipmentChange) !== JSON.stringify(this.sessionState.lastEquipmentChange);
    
    if (equipmentChanged && this.isInitialized) {
      console.log('⚙️ Equipment state changed, emitting equipmentChange event:', processedState.lastEquipmentChange);
      this.emit('equipmentChange', processedState.lastEquipmentChange);
    }
    
    // Force update with new timestamp for real-time events
    this.sessionState = {
      ...processedState,
      lastUpdate: now.toISOString()
    };
    
    console.log('🔄 Session state updated:', this.sessionState.isActive ? 'Active' : 'Idle');
    
    // Always emit update to frontend clients when processing new events
    if (this.isInitialized) {
      console.log('📡 Emitting sessionUpdate event to frontend');
      this.emit('sessionUpdate', this.sessionState);
    }
  }

  // Your comprehensive NINA event processing algorithm
  processNINAEvents(events, now = new Date()) {
    if (!events || events.length === 0) {
      return this.getEmptySessionState();
    }

    console.log('🔄 Processing session data from', events.length, 'events');
    
    // Step 1: Parse times and sort
    const sortedEvents = events
      .map(event => ({
        ...event,
        parsedTime: new Date(event.Time)
      }))
      .sort((a, b) => a.parsedTime.getTime() - b.parsedTime.getTime());

    // Step 2: Find active sequence segment
    const nowTime = now.getTime();
    let sequenceStartIndex = -1;
    let sequenceEndIndex = -1;

    // Find last SEQUENCE-STARTING at or before now
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      if (sortedEvents[i].Event === 'SEQUENCE-STARTING' && sortedEvents[i].parsedTime.getTime() <= nowTime) {
        sequenceStartIndex = i;
        break;
      }
    }

    if (sequenceStartIndex === -1) {
      console.log('❌ No active session found');
      return this.getEmptySessionState();
    }

    // Find first SEQUENCE-FINISHED after that start
    for (let i = sequenceStartIndex + 1; i < sortedEvents.length; i++) {
      if (sortedEvents[i].Event === 'SEQUENCE-FINISHED') {
        sequenceEndIndex = i;
        break;
      }
    }

    // Step 3: Extract session slice
    const sessionSlice = sequenceEndIndex === -1 
      ? sortedEvents.slice(sequenceStartIndex)
      : sortedEvents.slice(sequenceStartIndex, sequenceEndIndex);

    console.log('📊 Session slice:', sessionSlice.length, 'events from', 
                sessionSlice[0]?.Time, 'to', sessionSlice[sessionSlice.length - 1]?.Time);

    // Step 4: Process session state
    let target = null;
    let filter = null;
    let lastImage = null;
    let safe = { isSafe: null, time: null };
    let activity = { subsystem: null, state: null, since: null };
    let lastEquipmentChange = null;

    // Track equipment states for activity determination
    let lastAutofocusStart = null;
    let lastGuiderEvent = null;
    let lastMountEvent = null;
    let lastRotatorEvent = null;

    // Process safety from entire feed (not just session slice)
    for (const event of sortedEvents) {
      if (event.Event === 'SAFETY-CHANGED' && 'IsSafe' in event) {
        safe = {
          isSafe: event.IsSafe,
          time: event.Time
        };
      }
    }

    // Process equipment changes from entire feed for real-time updates
    let mostRecentEquipmentTime = null;
    for (const event of sortedEvents) {
      if (event.Event.endsWith('-CONNECTED') || event.Event.endsWith('-DISCONNECTED')) {
        const device = event.Event.split('-')[0];
        const eventType = event.Event.endsWith('-CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
        console.log('🔧 Processing equipment event:', event.Event, 'Time:', event.Time, 'Device:', device, 'Type:', eventType);
        
        // Use current time for real-time events (Time = undefined) to ensure they take priority
        const eventTime = event.Time || new Date().toISOString();
        const eventDate = new Date(eventTime);
        
        // Only update if this is the most recent equipment event
        if (!mostRecentEquipmentTime || eventDate > mostRecentEquipmentTime) {
          mostRecentEquipmentTime = eventDate;
          lastEquipmentChange = {
            device,
            event: eventType,
            time: eventTime
          };
          console.log('🔧 Updated lastEquipmentChange (most recent):', lastEquipmentChange);
        } else {
          console.log('🔧 Skipping older equipment event:', event.Event, eventTime);
        }
      }
    }

    // Process session slice events
    for (const event of sessionSlice) {
      // Target state
      if (event.Event === 'TS-NEWTARGETSTART' || event.Event === 'TS-TARGETSTART') {
        if ('TargetName' in event && 'ProjectName' in event) {
          target = {
            name: event.TargetName,
            project: event.ProjectName,
            coordinates: event.Coordinates || {
              ra: 0, dec: 0, raString: 'N/A', decString: 'N/A', 
              epoch: 'J2000', raDegrees: 0
            },
            rotation: event.Rotation || null
          };
        }
      }

      // Filter state
      if (event.Event === 'FILTERWHEEL-CHANGED' && 'New' in event) {
        const newFilter = event.New;
        filter = {
          name: newFilter.Name || newFilter.Id?.toString() || 'Unknown'
        };
      }

      // Last image capture
      if (event.Event === 'IMAGE-SAVE') {
        lastImage = { time: event.Time };
      }

      // Equipment activity tracking
      if (event.Event === 'AUTOFOCUS-START') {
        lastAutofocusStart = event.Time;
      } else if (event.Event === 'AUTOFOCUS-FINISHED') {
        lastAutofocusStart = null;
      }

      if (event.Event === 'GUIDER-START' || event.Event === 'GUIDER-STOP' || event.Event === 'GUIDER-DISCONNECTED') {
        lastGuiderEvent = { event: event.Event, time: event.Time };
      }

      if (event.Event === 'MOUNT-HOMED' || event.Event.includes('MOUNT-')) {
        lastMountEvent = { event: event.Event, time: event.Time };
      }

      if (event.Event.includes('ROTATOR-')) {
        lastRotatorEvent = { event: event.Event, time: event.Time };
      }
    }

    // Step 5: Determine current activity (priority order)
    if (lastAutofocusStart) {
      activity = {
        subsystem: 'autofocus',
        state: 'running',
        since: lastAutofocusStart
      };
    } else if (lastGuiderEvent?.event === 'GUIDER-START') {
      activity = {
        subsystem: 'guiding',
        state: 'guiding',
        since: lastGuiderEvent.time
      };
    } else if (lastMountEvent) {
      if (lastMountEvent.event === 'MOUNT-HOMED') {
        activity = {
          subsystem: 'mount',
          state: 'homed',
          since: lastMountEvent.time
        };
      } else if (target && !lastImage) {
        // Infer slewing after target start until first image
        activity = {
          subsystem: 'mount',
          state: 'slewing',
          since: lastMountEvent.time
        };
      }
    }

    return {
      target,
      filter,
      lastImage,
      safe,
      activity,
      lastEquipmentChange,
      sessionStart: sortedEvents[sequenceStartIndex]?.Time || null,
      isActive: true
    };
  }

  // Get current session state
  getSessionState() {
    return this.sessionState;
  }

  // Refresh session state manually
  async refreshSessionState() {
    try {
      await this.seedEventHistory();
      this.processSessionState();
      return this.sessionState;
    } catch (error) {
      console.error('❌ Failed to refresh session state:', error);
      throw error;
    }
  }

  // Cleanup
  destroy() {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    this.removeAllListeners();
  }
}

module.exports = SessionStateManager;
