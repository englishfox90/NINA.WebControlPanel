// Guider Service - Handles guider data fetching using unified WebSocket system
// Updated to use unified session WebSocket instead of separate connection

import { GuiderGraphResponse } from '../interfaces/nina';
import { getApiUrl } from '../config/api';
import { unifiedWebSocket } from './unifiedWebSocket';

export interface GuiderState {
  data: GuiderGraphResponse | null;
  loading: boolean;
  error: string | null;
  isGuidingActive: boolean;
  guiderConnected: boolean;
  exposureDuration: number; // seconds
}

export type GuiderEventType = 'GUIDER-CONNECTED' | 'GUIDER-DISCONNECTED' | 'GUIDER-START' | 'GUIDER-STOP';

export interface GuiderEventData {
  type: GuiderEventType;
  timestamp: string;
  data?: any;
}

export class GuiderService {
  private eventCallbacks: ((event: GuiderEventData) => void)[] = [];
  private dataCallbacks: ((state: GuiderState) => void)[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private lastFetchTime: number = 0;
  private fetchThrottle: number = 2000; // Minimum 2 seconds between API calls
  private isInitialized: boolean = false; // Prevent duplicate events during initial load
  private sessionUpdateHandler: (sessionData: any) => void;
  
  private state: GuiderState = {
    data: null,
    loading: true,
    error: null,
    isGuidingActive: false,
    guiderConnected: false,
    exposureDuration: 2.0
  };

  constructor(exposureDuration: number = 2.0) {
    this.state.exposureDuration = exposureDuration;
    
    // Bind event handler for session updates
    this.sessionUpdateHandler = this.handleUnifiedSessionUpdate.bind(this);
    
    this.initializeUnifiedWebSocket();
  }

  // Subscribe to guider events
  onEvent(callback: (event: GuiderEventData) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to state changes
  onStateChange(callback: (state: GuiderState) => void): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter(cb => cb !== callback);
    };
  }

  // Update exposure duration and adjust polling accordingly
  setExposureDuration(duration: number): void {
    this.state.exposureDuration = duration;
    this.updatePolling();
    this.notifyStateChange();
  }

  // Get current state
  getState(): GuiderState {
    return { ...this.state };
  }

  // Manual method to force guiding state (for testing)
  public forceGuidingState(isGuiding: boolean): void {
    console.log(`🔧 GuiderService: Manually forcing guiding state to: ${isGuiding}`);
    const wasGuiding = this.state.isGuidingActive;
    this.state.isGuidingActive = isGuiding;
    this.state.guiderConnected = true;
    
    console.log(`🔄 GuiderService: Force update polling: ${wasGuiding} → ${this.state.isGuidingActive}`);
    this.updatePolling();
    this.notifyStateChange();
  }

  // Initialize unified WebSocket connection
  private initializeUnifiedWebSocket(): void {
    console.log('🔌 GuiderService: Connecting to unified WebSocket...');
    
    // Connect to unified WebSocket
    unifiedWebSocket.connect();
    
    // Subscribe to unified session updates - this is all we need for guiding status
    unifiedWebSocket.on('session:update', this.sessionUpdateHandler);

    // Add connection status logging
    unifiedWebSocket.on('connect', () => {
      console.log('✅ GuiderService: Unified WebSocket connected');
    });

    unifiedWebSocket.on('disconnect', () => {
      console.log('❌ GuiderService: Unified WebSocket disconnected');
    });

    console.log('✅ GuiderService: Connected to unified WebSocket, listening for session updates');
  }

  // Handle unified session updates - this provides all guiding state information
  private handleUnifiedSessionUpdate(sessionData: any): void {
    console.log('🎯 GuiderService received WebSocket session update:', {
      sessionData: sessionData,
      dataKeys: Object.keys(sessionData || {}),
      hasIsGuiding: sessionData?.isGuiding !== undefined,
      guidingValue: sessionData?.isGuiding,
      hasDataIsGuiding: sessionData?.data?.isGuiding !== undefined,
      dataGuidingValue: sessionData?.data?.isGuiding,
      currentGuidingState: this.state.isGuidingActive
    });

    if (!sessionData) {
      console.log('⚠️ GuiderService: No session data received in WebSocket update');
      return;
    }

    // Check multiple possible data structures
    const isGuiding = sessionData?.isGuiding || sessionData?.data?.isGuiding || false;
    
    // Update state from unified session data - this is the single source of truth
    const wasGuiding = this.state.isGuidingActive;
    this.state.isGuidingActive = Boolean(isGuiding);
    
    // Assume guider is connected if we have guiding data in the session
    this.state.guiderConnected = isGuiding !== undefined;

    console.log(`🎯 GuiderService: Guiding state updated via WebSocket: ${wasGuiding} → ${this.state.isGuidingActive}`);

    // Always update polling when we receive a WebSocket update
    console.log(`🔄 GuiderService: Updating polling due to WebSocket update...`);
    this.updatePolling();
    this.notifyStateChange();
  }



  // Fetch guider data from API with throttling to prevent duplicate calls
  async fetchGuiderData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.fetchThrottle) {
      console.log(`🚫 Guider API call throttled (${now - this.lastFetchTime}ms since last call)`);
      return;
    }
    
    this.lastFetchTime = now;
    
    try {
      this.state.loading = true;
      this.state.error = null;
      
      console.log('📡 Fetching guider data from API');
      const response = await fetch(getApiUrl('nina/guider-graph'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || data === null) {
        this.state.data = null;
        this.state.error = 'No guider data available from NINA';
      } else {
        this.state.data = data;
        this.state.error = null;
        
        // Log data fetch for debugging
        console.log(`📊 Guider data fetched: Steps=${data.Response?.GuideSteps?.length || 0}, RMS=${data.Response?.RMS?.Total || 0}`);
      }
      
      // Note: guiderConnected and isGuidingActive are now managed by unified session updates only
      
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Unknown error';
      this.state.data = null;
      
      // Note: guiderConnected and isGuidingActive are managed by unified session updates only
    } finally {
      this.state.loading = false;
      this.updatePolling();
      this.notifyStateChange();
    }
  }

  // Update polling based on guiding state
  private updatePolling(): void {
    // Clear existing polling
    if (this.pollInterval) {
      console.log('⏹️ Stopping guiding data polling');
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Start polling if guider is connected (more aggressive during active guiding)
    // Start polling if actively guiding to get latest guide steps data
    if (this.state.isGuidingActive) {
      // During active guiding: 1.5x exposure duration for fresh guide data
      const refreshInterval = Math.round(this.state.exposureDuration * 1.5 * 1000);
      console.log(`🔄 Starting active guiding data polling (${refreshInterval}ms interval, exposure: ${this.state.exposureDuration}s)`);
      
      this.pollInterval = setInterval(() => {
        this.fetchGuiderData();
      }, refreshInterval);
    } else {
      console.log('📡 Guiding inactive, polling stopped (session updates provide status)');
    }
  }

  // Notify state change listeners
  private notifyStateChange(): void {
    this.dataCallbacks.forEach(callback => callback(this.getState()));
  }

  // Initialize and fetch initial data
  async initialize(): Promise<void> {
    console.log('🚀 GuiderService: Initializing with single API call');
    
    // First, check current session state to get initial guiding status
    try {
      console.log('📡 GuiderService: Fetching initial session state...');
      const sessionResponse = await fetch(getApiUrl('nina/session-state'));
      if (!sessionResponse.ok) {
        throw new Error(`HTTP ${sessionResponse.status}: ${sessionResponse.statusText}`);
      }
      
      const sessionData = await sessionResponse.json();
      console.log('🎯 GuiderService: Raw session response:', sessionData);
      
      // Check for both possible session data structures
      const isGuiding = sessionData?.isGuiding || sessionData?.data?.isGuiding || false;
      
      console.log('🎯 GuiderService: Initial session state loaded:', {
        isGuiding: isGuiding,
        hasSessionData: !!sessionData,
        dataStructure: Object.keys(sessionData || {})
      });
      
      // Update initial state from session
      this.state.isGuidingActive = Boolean(isGuiding);
      this.state.guiderConnected = isGuiding !== undefined;
      console.log(`🎯 GuiderService: Initial guiding state set to: ${this.state.isGuidingActive}`);
      
    } catch (error) {
      console.error('❌ GuiderService: Could not load initial session state:', error);
      // Fallback - assume not guiding initially
      this.state.isGuidingActive = false;
      this.state.guiderConnected = false;
    }
    
    // Then fetch guider data
    await this.fetchGuiderData();
    this.isInitialized = true; // Mark as initialized
    
    console.log('✅ GuiderService: Initialization complete, WebSocket events enabled');
  }

  // Cleanup resources
  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Remove listener from unified WebSocket
    unifiedWebSocket.off('session:update', this.sessionUpdateHandler);

    this.eventCallbacks = [];
    this.dataCallbacks = [];
  }
}
