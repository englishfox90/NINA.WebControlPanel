import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionWebSocketOptions {
  enableLegacyMode?: boolean;
  enableTimezoneFormatting?: boolean;
  autoReconnect?: boolean;
  heartbeatInterval?: number;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  lastHeartbeat: string | null;
  reconnectAttempts: number;
}

/**
 * Enhanced Session WebSocket Hook with Reducer Pattern Support
 * Provides access to both legacy and enhanced session state formats
 * Maintains backward compatibility while adding sophisticated session management
 */
export const useEnhancedSessionWebSocket = (options: SessionWebSocketOptions = {}) => {
  const {
    enableLegacyMode = false, // Use legacy format
    enableTimezoneFormatting = true,
    autoReconnect = true,
    heartbeatInterval = 30000
  } = options;

  // State management
  const [enhancedSessionState, setEnhancedSessionState] = useState<any>(null);
  const [legacySessionState, setLegacySessionState] = useState<any>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    lastHeartbeat: null,
    reconnectAttempts: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup and connection management
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Connection management
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;
      
      console.log('🔗 Enhanced Session WebSocket connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('✅ Enhanced Session WebSocket connected');
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          reconnectAttempts: 0
        }));
        setError(null);
        
        // Subscribe to session events
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'subscribe',
            events: ['enhancedSessionUpdate', 'sessionUpdate'] // Both formats
          }));
        }
        
        startHeartbeat();
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // Update heartbeat
          setConnectionState(prev => ({
            ...prev,
            lastHeartbeat: new Date().toISOString()
          }));
          
          // Handle different message types
          switch (data.type) {
            case 'enhancedSessionUpdate':
              console.log('📡 Enhanced session state update received');
              setEnhancedSessionState(data.sessionState);
              break;
              
            case 'sessionUpdate':
              console.log('📡 Legacy session state update received');
              setLegacySessionState(data.sessionState);
              break;
              
            case 'pong':
              // Heartbeat response
              break;
              
            default:
              console.log('📡 Unknown enhanced session message:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing enhanced session WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error: Event) => {
        console.error('❌ Enhanced Session WebSocket error:', error);
        setError('WebSocket connection error');
      };

      wsRef.current.onclose = (event: CloseEvent) => {
        console.log('❌ Enhanced Session WebSocket closed:', event.code, event.reason);
        
        if (!mountedRef.current) return;
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false
        }));
        
        stopHeartbeat();
        
        // Auto-reconnect if enabled and not a manual close
        if (autoReconnect && event.code !== 1000) {
          scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('❌ Failed to create enhanced session WebSocket connection:', error);
      setError('Failed to connect to WebSocket');
      
      if (autoReconnect) {
        scheduleReconnect();
      }
    }
  }, [autoReconnect]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting enhanced session WebSocket');
    
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      isReconnecting: false
    }));
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !autoReconnect) return;
    
    setConnectionState(prev => {
      const newAttempts = prev.reconnectAttempts + 1;
      const delay = Math.min(1000 * Math.pow(2, newAttempts - 1), 30000); // Max 30s
      
      console.log(`🔄 Scheduling enhanced session reconnect in ${delay}ms (attempt ${newAttempts})`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
      
      return {
        ...prev,
        isReconnecting: true,
        reconnectAttempts: newAttempts
      };
    });
  }, [autoReconnect, connect]);

  // Initialize connection on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopHeartbeat();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [stopHeartbeat]);

  // Derived state and utility functions
  const sessionState = enableLegacyMode ? legacySessionState : enhancedSessionState;
  const hasSessionData = sessionState !== null;
  
  // Enhanced session utilities (only available in enhanced mode)
  const enhancedUtils = enableLegacyMode ? null : {
    formatTimeForUser: (utcTimestamp: string | null, format?: string) => {
      if (!enhancedSessionState || !utcTimestamp) return null;
      // This would use the reducer's formatting in a real implementation
      return new Date(utcTimestamp).toLocaleString();
    },
    
    getSessionDuration: () => {
      if (!enhancedSessionState?.session?.startedAt) return null;
      const start = new Date(enhancedSessionState.session.startedAt);
      const end = enhancedSessionState.session.finishedAt 
        ? new Date(enhancedSessionState.session.finishedAt)
        : new Date();
      
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    },
    
    isInActiveSession: () => {
      return enhancedSessionState?.session?.startedAt && !enhancedSessionState?.session?.finishedAt;
    },
    
    getCurrentTarget: () => {
      return enhancedSessionState?.target || null;
    },
    
    getCurrentFilter: () => {
      return enhancedSessionState?.filter || null;
    },
    
    getLastImage: () => {
      return enhancedSessionState?.image?.lastSavedAt || null;
    },
    
    getSafetyStatus: () => {
      return enhancedSessionState?.safety || null;
    },
    
    getCurrentActivity: () => {
      return enhancedSessionState?.activity || null;
    },
    
    getLastEquipmentChange: () => {
      return enhancedSessionState?.equipmentLastChange || null;
    }
  };

  return {
    // State
    sessionState,
    enhancedSessionState: enableLegacyMode ? null : enhancedSessionState,
    legacySessionState: enableLegacyMode ? legacySessionState : null,
    connectionState,
    error,
    
    // Computed
    isConnected: connectionState.isConnected,
    isReconnecting: connectionState.isReconnecting,
    hasSessionData,
    
    // Methods
    connect,
    disconnect,
    
    // Enhanced utilities (only available in enhanced mode)
    utils: enhancedUtils
  };
};

/**
 * Legacy compatibility hook - uses legacy format by default
 */
export const useSessionWebSocket = () => {
  return useEnhancedSessionWebSocket({ 
    enableLegacyMode: true 
  });
};

/**
 * Enhanced session hook - uses new reducer-based format
 */
export const useReducerSessionWebSocket = () => {
  return useEnhancedSessionWebSocket({ 
    enableLegacyMode: false,
    enableTimezoneFormatting: true
  });
};
