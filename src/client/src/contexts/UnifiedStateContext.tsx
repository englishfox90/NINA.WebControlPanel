// UnifiedStateContext - Singleton WebSocket connection for all widgets
// Provides a single shared WebSocket connection that all components can subscribe to

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { UnifiedState, UnifiedWsMessage } from '../interfaces/unifiedState';

interface UnifiedStateContextValue {
  state: UnifiedState | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  lastUpdate: UnifiedWsMessage | null;
  reconnect: () => void;
}

const UnifiedStateContext = createContext<UnifiedStateContextValue | null>(null);

const API_BASE = 'http://localhost:3001';
const WS_BASE = 'ws://localhost:3001';

interface UnifiedStateProviderProps {
  children: ReactNode;
  reconnectDelay?: number;
}

export const UnifiedStateProvider: React.FC<UnifiedStateProviderProps> = ({ 
  children, 
  reconnectDelay = 5000 
}) => {
  const [state, setState] = useState<UnifiedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<UnifiedWsMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const subscribersRef = useRef(0); // Track number of subscribers

  /**
   * Fetch initial state from HTTP endpoint
   */
  const fetchInitialState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/state`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setState(data);
      console.log('✅ Initial unified state loaded (singleton)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch initial state';
      setError(errorMessage);
      console.error('❌ Error fetching initial state:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Connect to WebSocket (singleton - only one connection)
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Singleton WebSocket already connected');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⚠️ Singleton WebSocket connection already in progress');
      return;
    }

    console.log('🔌 Connecting to unified state WebSocket (SINGLETON) at', WS_BASE);

    try {
      const ws = new WebSocket(WS_BASE);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Singleton WebSocket connected');
        setConnected(true);
        setError(null);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: UnifiedWsMessage = JSON.parse(event.data);
          console.log(`📨 Unified state update (singleton): ${message.updateKind} - ${message.updateReason}`);
          
          setState(message.state);
          setLastUpdate(message);
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ Singleton WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log(`🔌 Singleton WebSocket closed: ${event.code} - ${event.reason || 'No reason'}`);
        setConnected(false);

        if (shouldReconnectRef.current) {
          console.log(`⏱️ Singleton will reconnect in ${reconnectDelay / 1000} seconds...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Singleton attempting to reconnect...');
            connect();
          }, reconnectDelay);
        }
      };

    } catch (err) {
      console.error('❌ Failed to create singleton WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setConnected(false);
    }
  }, [reconnectDelay]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting singleton WebSocket...');
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  }, []);

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    console.log('🚀 UnifiedStateProvider initialized (SINGLETON)');
    fetchInitialState();
    connect();

    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [fetchInitialState, connect, disconnect]);

  const value: UnifiedStateContextValue = {
    state,
    loading,
    error,
    connected,
    lastUpdate,
    reconnect
  };

  return (
    <UnifiedStateContext.Provider value={value}>
      {children}
    </UnifiedStateContext.Provider>
  );
};

/**
 * Hook to consume the unified state (singleton connection)
 */
export const useUnifiedState = () => {
  const context = useContext(UnifiedStateContext);
  
  if (!context) {
    throw new Error('useUnifiedState must be used within UnifiedStateProvider');
  }

  return context;
};
