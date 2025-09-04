// Guider Service - Handles guider data fetching and WebSocket management
// Modularized from GuiderGraphWidget to keep component files under 500 LOC

import { GuiderGraphResponse } from '../interfaces/nina';
import { getApiUrl } from '../config/api';

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
  private ws: WebSocket | null = null;
  private eventCallbacks: ((event: GuiderEventData) => void)[] = [];
  private dataCallbacks: ((state: GuiderState) => void)[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastFetchTime: number = 0;
  private fetchThrottle: number = 2000; // Minimum 2 seconds between API calls
  private isInitialized: boolean = false; // Prevent WebSocket events during initial load
  
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
    this.initializeWebSocket();
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

  // Initialize WebSocket connection
  private initializeWebSocket(): void {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:3001/ws/unified`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 Guider WebSocket connected');
        this.clearReconnectTimeout();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = () => {
        console.log('❌ Guider WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🚨 Guider WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'nina-event' && data.data?.Type?.startsWith('GUIDER-')) {
        const eventType = data.data.Type as GuiderEventType;
        const eventData: GuiderEventData = {
          type: eventType,
          timestamp: data.data.Timestamp || new Date().toISOString(),
          data: data.data.Data
        };

        console.log('🎯 Guider event received:', eventType);
        
        // Update internal state
        this.updateStateFromEvent(eventType);
        
        // Notify event listeners
        this.eventCallbacks.forEach(callback => callback(eventData));
        
        // Only refresh data for connection events, not for every guide step
        // Also prevent fetches during initial load to avoid duplicate calls
        if ((eventType.includes('CONNECTED') || eventType.includes('DISCONNECTED')) && this.isInitialized) {
          const delay = eventType.includes('CONNECTED') ? 2000 : 500;
          setTimeout(() => {
            this.fetchGuiderData();
          }, delay);
        }
        // For START/STOP events, just update polling without immediate fetch
        else {
          this.updatePolling();
          this.notifyStateChange();
        }
      }
    } catch (err) {
      console.warn('Error parsing WebSocket message:', err);
    }
  }

  // Update state based on guider events
  private updateStateFromEvent(eventType: GuiderEventType): void {
    switch (eventType) {
      case 'GUIDER-CONNECTED':
        this.state.guiderConnected = true;
        break;
      case 'GUIDER-DISCONNECTED':
        this.state.guiderConnected = false;
        this.state.isGuidingActive = false;
        break;
      case 'GUIDER-START':
        this.state.isGuidingActive = true;
        break;
      case 'GUIDER-STOP':
        this.state.isGuidingActive = false;
        break;
    }
    
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
        this.state.guiderConnected = false;
        this.state.isGuidingActive = false;
        this.state.error = 'No guider data available from NINA';
      } else {
        this.state.data = data;
        this.state.guiderConnected = data.connected || false;
        
        // Detect active guiding from data presence and RMS values
        const hasRecentData = data.Response?.GuideSteps?.length > 0;
        const hasValidRMS = data.Response?.RMS?.Total > 0;
        this.state.isGuidingActive = data.isGuiding || (hasRecentData && hasValidRMS);
        
        this.state.error = null;
        
        // Log guiding state for debugging (reduced frequency)
        console.log(`✅ Guider Status: Connected=${this.state.guiderConnected}, Active=${this.state.isGuidingActive}, Steps=${data.Response?.GuideSteps?.length || 0}, RMS=${data.Response?.RMS?.Total || 0}`);
      }
      
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Unknown error';
      this.state.guiderConnected = false;
      this.state.isGuidingActive = false;
      this.state.data = null;
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
    if (this.state.guiderConnected) {
      let refreshInterval: number;
      
      if (this.state.isGuidingActive) {
        // During active guiding: 1.5x exposure duration
        refreshInterval = Math.round(this.state.exposureDuration * 1.5 * 1000);
        console.log(`🔄 Starting active guiding data polling (${refreshInterval}ms interval, exposure: ${this.state.exposureDuration}s)`);
      } else {
        // When connected but not actively guiding: check every 10 seconds for status changes
        refreshInterval = 10000;
        console.log(`🔄 Starting guider connection monitoring (${refreshInterval}ms interval)`);
      }
      
      this.pollInterval = setInterval(() => {
        this.fetchGuiderData();
      }, refreshInterval);
    } else {
      console.log('📡 Guider disconnected, polling stopped');
    }
  }

  // Notify state change listeners
  private notifyStateChange(): void {
    this.dataCallbacks.forEach(callback => callback(this.getState()));
  }

  // Schedule WebSocket reconnection
  private scheduleReconnect(): void {
    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Attempting WebSocket reconnection...');
      this.initializeWebSocket();
    }, 5000);
  }

  // Clear reconnect timeout
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Initialize and fetch initial data
  async initialize(): Promise<void> {
    console.log('🚀 Initializing GuiderService with single API call');
    await this.fetchGuiderData();
    this.isInitialized = true; // Mark as initialized to allow WebSocket events
    console.log('✅ GuiderService initialized, WebSocket events now enabled');
  }

  // Cleanup resources
  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.eventCallbacks = [];
    this.dataCallbacks = [];
  }
}
