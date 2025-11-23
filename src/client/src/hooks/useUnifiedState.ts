// useUnifiedState Hook
// React hook for consuming the unified WebSocket state
// Provides automatic reconnection and state synchronization

import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedState, UnifiedWsMessage, UpdateKind } from '../interfaces/unifiedState';

interface UseUnifiedStateOptions {
  autoConnect?: boolean;
  reconnectDelay?: number;
  onUpdate?: (message: UnifiedWsMessage) => void;
  filterUpdateKinds?: UpdateKind[]; // Only trigger updates for specific kinds
}

interface UseUnifiedStateReturn {
  state: UnifiedState | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  lastUpdate: UnifiedWsMessage | null;
  reconnect: () => void;
  disconnect: () => void;
}

const API_BASE = 'http://localhost:3001';
const WS_BASE = 'ws://localhost:3001';

export const useUnifiedState = (options: UseUnifiedStateOptions = {}): UseUnifiedStateReturn => {
  const {
    autoConnect = true,
    reconnectDelay = 5000,
    onUpdate,
    filterUpdateKinds
  } = options;

  const [state, setState] = useState<UnifiedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<UnifiedWsMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(autoConnect);

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
      console.log('✅ Initial unified state loaded');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch initial state';
      setError(errorMessage);
      console.error('❌ Error fetching initial state:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Already connected to unified state WebSocket');
      return;
    }

    // Prevent rapid reconnections
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⚠️ WebSocket connection already in progress');
      return;
    }

    console.log('🔌 Connecting to unified state WebSocket at', WS_BASE);

    try {
      const ws = new WebSocket(WS_BASE);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to unified state WebSocket');
        setConnected(true);
        setError(null);

        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: UnifiedWsMessage = JSON.parse(event.data);
          
          // Apply filter if specified
          if (filterUpdateKinds && !filterUpdateKinds.includes(message.updateKind)) {
            return;
          }

          console.log(`📨 Unified state update: ${message.updateKind} - ${message.updateReason}`);
          
          // Update state
          setState(message.state);
          setLastUpdate(message);

          // Call custom update handler if provided
          if (onUpdate) {
            onUpdate(message);
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason || 'No reason'}`);
        setConnected(false);

        // Attempt reconnection if enabled
        if (shouldReconnectRef.current) {
          console.log(`⏱️ Will reconnect in ${reconnectDelay / 1000} seconds...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, reconnectDelay);
        }
      };

    } catch (err) {
      console.error('❌ Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setConnected(false);
    }
  }, [reconnectDelay, onUpdate, filterUpdateKinds]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from unified state WebSocket...');
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
    let mounted = true;

    // Fetch initial state
    fetchInitialState();

    // Connect to WebSocket if auto-connect enabled
    if (autoConnect && mounted) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      mounted = false;
      shouldReconnectRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    state,
    loading,
    error,
    connected,
    lastUpdate,
    reconnect,
    disconnect
  };
};

/**
 * Hook for subscribing to specific update kinds
 */
export const useUnifiedStateFilter = (
  updateKinds: UpdateKind[],
  onUpdate?: (message: UnifiedWsMessage) => void
) => {
  return useUnifiedState({
    filterUpdateKinds: updateKinds,
    onUpdate
  });
};

/**
 * Hook for session updates only
 */
export const useSessionState = (onUpdate?: (message: UnifiedWsMessage) => void) => {
  return useUnifiedStateFilter(['session', 'fullSync'], onUpdate);
};

/**
 * Hook for equipment updates only
 */
export const useEquipmentState = (onUpdate?: (message: UnifiedWsMessage) => void) => {
  return useUnifiedStateFilter(['equipment', 'fullSync'], onUpdate);
};

/**
 * Hook for image updates only
 */
export const useImageState = (onUpdate?: (message: UnifiedWsMessage) => void) => {
  return useUnifiedStateFilter(['image', 'fullSync'], onUpdate);
};
