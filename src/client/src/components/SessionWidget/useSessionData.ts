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
    console.log(`📡 Session WebSocket update received - eliminating API call need:`, 
                `Active: ${data.isActive}, Darks: ${data.darks?.totalImages || 0}, Target: ${data.target?.name || 'None'}`);
    setSessionData(data);
    setError(null);
    // Since we got WebSocket data, we're no longer loading
    if (loading) {
      setLoading(false);
    }
  }, [enableEnhancedMode, loading]);

  // Handle widget events
  const handleWidgetEvent = useCallback((event: any) => {
    console.log(`📡 Session widget event (${enableEnhancedMode ? 'Enhanced' : 'Standard'}):`, event.Type);
    // WebSocket session updates already contain all the data we need
    // No need to make additional API calls since sessionUpdate messages include latest state
    // This eliminates duplicate network requests shown in dev tools
  }, [enableEnhancedMode]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribeSession = onSessionUpdate(handleSessionUpdate);
    const unsubscribeWidget = onWidgetEvent(handleWidgetEvent);

    return () => {
      unsubscribeSession();
      unsubscribeWidget();
    };
  }, [onSessionUpdate, onWidgetEvent, handleSessionUpdate, handleWidgetEvent]);

  // Smart initial data loading: prefer WebSocket, fallback to API
  useEffect(() => {
    // If WebSocket is connected, wait briefly for session data
    // Otherwise, load via API immediately
    if (wsConnected) {
      console.log('📡 WebSocket connected, waiting for session data...');
      const wsTimeout = setTimeout(() => {
        if (!sessionData) {
          console.log('📡 No WebSocket data received, falling back to API');
          loadSessionData();
        }
      }, 2000);
      return () => clearTimeout(wsTimeout);
    } else {
      console.log('📡 WebSocket not connected, loading via API');
      loadSessionData();
    }
  }, [wsConnected, loadSessionData]);

  // Handle WebSocket connection status changes
  useEffect(() => {
    if (wsConnected && !sessionData && !loading) {
      console.log('📡 WebSocket reconnected, data should arrive via sessionUpdate');
      // Data should come via sessionUpdate, no API call needed
    }
  }, [wsConnected, sessionData, loading]);

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
