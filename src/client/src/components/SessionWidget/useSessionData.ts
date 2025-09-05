import { useState, useEffect, useCallback } from 'react';
import { SessionData } from '../../interfaces/session';
import { useSessionWebSocket } from '../../hooks/useUnifiedWebSocket';

interface SessionEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

interface UseSessionDataOptions {
  enableEnhancedMode?: boolean;
  refreshInterval?: number;
}

interface UseSessionDataReturn {
  sessionData: SessionData | null;
  events: SessionEvent[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refreshData: () => Promise<void>;
  wsConnected: boolean;
  refreshing: boolean;
}

/**
 * Custom hook for session data management using unified WebSocket system
 * Eliminates duplicate API calls by using the existing WebSocket infrastructure
 */
const useSessionData = (options: UseSessionDataOptions = {}): UseSessionDataReturn => {
  const { enableEnhancedMode = false } = options;
  
  // State management
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use the unified WebSocket system
  const { connected: wsConnected, onSessionUpdate } = useSessionWebSocket();
  
  // Manual refresh function (for user-initiated refresh)
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      if (enableEnhancedMode) {
        console.log('🔄 Manual session data refresh requested');
      }
      
      const response = await fetch('/api/nina/session-state');
      
      if (!response.ok) {
        throw new Error(`Session API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && (data.data || data.target)) {
        setSessionData(data.data || data);
        setLastUpdate(new Date());
        setLoading(false);
        
        if (enableEnhancedMode) {
          console.log('✅ Manual session refresh successful:', data);
        }
      }
      
    } catch (err) {
      console.error('❌ Session data refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh session data');
    } finally {
      setRefreshing(false);
    }
  }, [enableEnhancedMode]);
  
  // Handle session updates from unified WebSocket
  useEffect(() => {
    if (!wsConnected) {
      if (enableEnhancedMode) {
        console.log('🔌 Session WebSocket not connected, loading initial data...');
      }
      // Load initial data when WebSocket is not connected
      refreshData();
      return;
    }
    
    if (enableEnhancedMode) {
      console.log('🔌 Session WebSocket connected, subscribing to updates...');
    }
    
    const unsubscribe = onSessionUpdate((data: any) => {
      if (enableEnhancedMode) {
        console.log('� Session update received:', data);
      }
      
      setSessionData(data);
      setLastUpdate(new Date());
      setError(null);
      setLoading(false);
      
      // Add to events list
      const newEvent: SessionEvent = {
        id: Date.now().toString(),
        type: 'session_update',
        data: data,
        timestamp: new Date()
      };
      
      setEvents(prev => [newEvent, ...prev].slice(0, 25));
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [wsConnected, onSessionUpdate, refreshData, enableEnhancedMode]);
  
  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  return {
    sessionData,
    events,
    loading,
    error,
    lastUpdate,
    refreshData,
    wsConnected,
    refreshing
  };
};

export default useSessionData;