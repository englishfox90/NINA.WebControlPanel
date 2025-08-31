/**
 * Session Widget Data Hook
 * Handles all data fetching, WebSocket connections, and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config/api';
import { useSessionWebSocket } from '../../hooks/useUnifiedWebSocket';
import type { SessionData, LegacySessionState, EnhancedSessionState } from '../../interfaces/session';

export interface UseSessionDataReturn {
  sessionData: SessionData | LegacySessionState | EnhancedSessionState | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  wsConnected: boolean;
  refresh: () => Promise<void>;
}

export const useSessionData = (enableEnhancedMode = false): UseSessionDataReturn => {
  const [sessionData, setSessionData] = useState<SessionData | LegacySessionState | EnhancedSessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Use the working unified WebSocket system
  const { 
    connected: wsConnected, 
    onSessionUpdate,
    onWidgetEvent 
  } = useSessionWebSocket();

  // Load session data from REST API
  const loadSessionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(getApiUrl('nina/session-state'));
      const result = await response.json();
      
      if (result.Success && result.Response) {
        setSessionData(result.Response);
        console.log(`✅ Session data loaded (${enableEnhancedMode ? 'Enhanced' : 'Standard'}):`, 
                   result.Response.isActive ? 'Active' : 'Idle');
      } else {
        throw new Error(result.Error || 'Failed to load session data');
      }
      
    } catch (err) {
      console.error('❌ Failed to load session data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [enableEnhancedMode]);

  // Handle WebSocket session updates
  const handleSessionUpdate = useCallback((data: any) => {
    console.log(`📡 Session update received (${enableEnhancedMode ? 'Enhanced' : 'Standard'}):`, data);
    setSessionData(data);
    setError(null);
  }, [enableEnhancedMode]);

  // Handle widget events
  const handleWidgetEvent = useCallback((event: any) => {
    console.log(`📡 Session widget event (${enableEnhancedMode ? 'Enhanced' : 'Standard'}):`, event.Type);
    // Refresh on important session events
    if (['SEQUENCE-STARTING', 'SEQUENCE-FINISHED', 'IMAGE-SAVE'].includes(event.Type)) {
      loadSessionData();
    }
  }, [loadSessionData, enableEnhancedMode]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribeSession = onSessionUpdate(handleSessionUpdate);
    const unsubscribeWidget = onWidgetEvent(handleWidgetEvent);

    return () => {
      unsubscribeSession();
      unsubscribeWidget();
    };
  }, [onSessionUpdate, onWidgetEvent, handleSessionUpdate, handleWidgetEvent]);

  // Load initial data
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Public refresh function
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSessionData();
      console.log(`🔄 Session data refreshed (${enableEnhancedMode ? 'Enhanced' : 'Standard'})`);
    } catch (error) {
      console.error('❌ Error refreshing session data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadSessionData, enableEnhancedMode]);

  return {
    sessionData,
    loading,
    error,
    refreshing,
    wsConnected,
    refresh
  };
};
