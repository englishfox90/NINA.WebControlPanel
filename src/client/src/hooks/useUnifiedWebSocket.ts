// React Hook for Unified WebSocket - Widget-specific subscriptions
import { useEffect, useState, useCallback, useRef } from 'react';
import { unifiedWebSocket, NINAEvent } from '../services/unifiedWebSocket';

export interface UseUnifiedWebSocketOptions {
  widgetType?: string;
  eventTypes?: string[];
  autoConnect?: boolean;
}

export interface WebSocketState {
  connected: boolean;
  reconnectAttempts: number;
  lastHeartbeat: number;
  error: string | null;
}

export function useUnifiedWebSocket(options: UseUnifiedWebSocketOptions = {}) {
  const {
    widgetType = 'general',
    eventTypes = [],
    autoConnect = true
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    reconnectAttempts: 0,
    lastHeartbeat: 0,
    error: null
  });

  const [lastEvent, setLastEvent] = useState<NINAEvent | null>(null);
  const eventHandlersRef = useRef<Map<string, (event: NINAEvent) => void>>(new Map());

  // Update connection state
  const updateState = useCallback(() => {
    const status = unifiedWebSocket.getConnectionStatus();
    setState({
      connected: status.connected,
      reconnectAttempts: status.reconnectAttempts,
      lastHeartbeat: status.lastHeartbeat,
      error: null
    });
  }, []);

  // Subscribe to specific event types for this widget
  const subscribeToEvents = useCallback((eventTypes: string[], handler: (event: NINAEvent) => void) => {
    eventTypes.forEach(eventType => {
      const eventName = `widget:${eventType.toLowerCase()}`;
      unifiedWebSocket.on(eventName, handler);
      eventHandlersRef.current.set(eventName, handler);
    });
  }, []);

  // Unsubscribe from events
  const unsubscribeFromEvents = useCallback(() => {
    eventHandlersRef.current.forEach((handler, eventName) => {
      unifiedWebSocket.off(eventName, handler);
    });
    eventHandlersRef.current.clear();
  }, []);

  // Generic event listener
  const onNINAEvent = useCallback((handler: (event: NINAEvent) => void) => {
    unifiedWebSocket.on('nina:event', handler);
    return () => unifiedWebSocket.off('nina:event', handler);
  }, []);

  // Widget-specific event listeners
  const onWidgetEvent = useCallback((handler: (event: NINAEvent) => void) => {
    const eventName = `widget:${widgetType.toLowerCase()}`;
    unifiedWebSocket.on(eventName, handler);
    return () => unifiedWebSocket.off(eventName, handler);
  }, [widgetType]);

  // Session updates
  const onSessionUpdate = useCallback((handler: (data: any) => void) => {
    unifiedWebSocket.on('session:update', handler);
    return () => unifiedWebSocket.off('session:update', handler);
  }, []);

  // Connection status changes
  const onConnectionChange = useCallback((handler: (connected: boolean) => void) => {
    const connectedHandler = () => handler(true);
    const disconnectedHandler = () => handler(false);
    
    unifiedWebSocket.on('connected', connectedHandler);
    unifiedWebSocket.on('disconnected', disconnectedHandler);
    
    return () => {
      unifiedWebSocket.off('connected', connectedHandler);
      unifiedWebSocket.off('disconnected', disconnectedHandler);
    };
  }, []);

  // Connect manually
  const connect = useCallback(async () => {
    try {
      await unifiedWebSocket.connect();
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [updateState]);

  // Disconnect manually
  const disconnect = useCallback(() => {
    unifiedWebSocket.disconnect();
    updateState();
  }, [updateState]);

  // Setup widget subscription and connection
  useEffect(() => {
    // Subscribe widget to specific event types
    if (eventTypes.length > 0) {
      unifiedWebSocket.subscribeWidget(widgetType, eventTypes);
    }

    // Auto-connect if requested
    if (autoConnect) {
      connect();
    }

    // Update initial state
    updateState();

    return () => {
      unsubscribeFromEvents();
      unifiedWebSocket.unsubscribeWidget(widgetType);
    };
  }, [widgetType, eventTypes.join(','), autoConnect]); // Use string join to avoid array reference issues

  // Monitor connection state changes
  useEffect(() => {
    const handleConnectionChange = () => updateState();
    
    unifiedWebSocket.on('connected', handleConnectionChange);
    unifiedWebSocket.on('disconnected', handleConnectionChange);
    unifiedWebSocket.on('error', handleConnectionChange);
    
    return () => {
      unifiedWebSocket.off('connected', handleConnectionChange);
      unifiedWebSocket.off('disconnected', handleConnectionChange);
      unifiedWebSocket.off('error', handleConnectionChange);
    };
  }, []);

  // Listen for any NINA events to update lastEvent
  useEffect(() => {
    const handler = (event: NINAEvent) => {
      setLastEvent(event);
    };
    
    unifiedWebSocket.on('nina:event', handler);
    
    return () => {
      unifiedWebSocket.off('nina:event', handler);
    };
  }, []);

  return {
    // Connection state
    ...state,
    
    // Event data
    lastEvent,
    
    // Connection controls
    connect,
    disconnect,
    
    // Event listeners
    onNINAEvent,
    onWidgetEvent,
    onSessionUpdate,
    onConnectionChange,
    subscribeToEvents,
    
    // Utility
    isConnected: state.connected
  };
}

// Specialized hooks for different widget types
export function useNINAStatusWebSocket() {
  return useUnifiedWebSocket({
    widgetType: 'nina_status',
    eventTypes: [
      'CAMERA-CONNECTED', 'CAMERA-DISCONNECTED',
      'MOUNT-CONNECTED', 'MOUNT-DISCONNECTED',
      'FOCUSER-CONNECTED', 'FOCUSER-DISCONNECTED',
      'FILTERWHEEL-CONNECTED', 'FILTERWHEEL-DISCONNECTED',
      'GUIDER-CONNECTED', 'GUIDER-DISCONNECTED',
      'ROTATOR-CONNECTED', 'ROTATOR-DISCONNECTED',
      'SWITCH-CONNECTED', 'SWITCH-DISCONNECTED',
      'FLATDEVICE-CONNECTED', 'FLATDEVICE-DISCONNECTED',
      'WEATHER-CONNECTED', 'WEATHER-DISCONNECTED',
      'DOME-CONNECTED', 'DOME-DISCONNECTED',
      'SAFETYMONITOR-CONNECTED', 'SAFETYMONITOR-DISCONNECTED'
    ]
  });
}



export function useSessionWebSocket() {
  return useUnifiedWebSocket({
    widgetType: 'current_session',
    eventTypes: [
      'SEQUENCE-STARTING', 'SEQUENCE-FINISHED',
      'IMAGE-SAVE', 'AUTOFOCUS-RUNNING', 'AUTOFOCUS-FINISHED',
      'GUIDING-STARTED', 'GUIDING-STOPPED',
      'MOUNT-SLEWING', 'MOUNT-TRACKING',
      'FILTERWHEEL-CHANGED'
    ]
  });
}

export function useSchedulerWebSocket() {
  return useUnifiedWebSocket({
    widgetType: 'target_scheduler',
    eventTypes: ['IMAGE-SAVE', 'SEQUENCE-FINISHED']
  });
}

export function useSafetyWebSocket() {
  return useUnifiedWebSocket({
    widgetType: 'safety_banner',
    eventTypes: ['FLAT-LIGHT-TOGGLED', 'SAFETY-CHANGED']
  });
}
