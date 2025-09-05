/**
 * Session Widget Data Hook
 * Handles all data fetching, WebSocket connections, and state management
 * Updated to use unified session WebSocket system with bootstrap pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config/api';
import { useUnifiedWebSocket } from '../../hooks/useUnifiedWebSocket';
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

  // Use the unified WebSocket system with bootstrap pattern
  const { 
    connected: wsConnected,
    onSessionUpdate
  } = useUnifiedWebSocket();

  // Bootstrap: Load initial session state from unified session API
  const loadInitialSessionState = useCallback(async () => {
    try {
      console.log(`📊 Loading initial session state (${enableEnhancedMode ? 'Enhanced' : 'Standard'})...`);
      setLoading(true);
      setError(null);

      const response = await fetch(getApiUrl('nina/session-state'));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session state: ${response.statusText}`);
      }
      
      const unifiedSession = await response.json();
      console.log(`📊 Initial session state loaded:`, {
        isActive: unifiedSession.isActive,
        target: unifiedSession.target?.name,
        activity: unifiedSession.activity,
        enabledMode: enableEnhancedMode ? 'Enhanced' : 'Standard'
      });
      
      setSessionData(unifiedSession);
      setLoading(false);
      
    } catch (err) {
      console.error('❌ Failed to load initial session state:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session state');
      setLoading(false);
    }
  }, [enableEnhancedMode]);

  // Handle unified session updates from WebSocket
  const handleUnifiedSessionUpdate = useCallback((unifiedSession: any) => {
    console.log(`📡 Unified session WebSocket update received:`, {
      isActive: unifiedSession.isActive,
      target: unifiedSession.target?.name,
      activity: unifiedSession.activity,
      mode: enableEnhancedMode ? 'Enhanced' : 'Standard'
    });
    
    setSessionData(unifiedSession);
    setError(null);
    
    // If we were loading, we're no longer loading since we got data
    if (loading) {
      setLoading(false);
    }
  }, [enableEnhancedMode, loading]);

  // Bootstrap: Initialize on mount
  useEffect(() => {
    console.log(`� SessionWidget initializing (${enableEnhancedMode ? 'Enhanced' : 'Standard'}) - loading initial state and subscribing to updates`);
    
    // Load initial state
    loadInitialSessionState();
    
    // Subscribe to real-time session updates
    const unsubscribeSession = onSessionUpdate(handleUnifiedSessionUpdate);
    
    return () => {
      console.log(`📊 SessionWidget cleanup (${enableEnhancedMode ? 'Enhanced' : 'Standard'}) - unsubscribing from session updates`);
      unsubscribeSession();
    };
  }, [loadInitialSessionState, onSessionUpdate, handleUnifiedSessionUpdate]);

  // Public refresh function (manual refresh using bootstrap method)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitialSessionState();
      console.log(`🔄 Session data refreshed (${enableEnhancedMode ? 'Enhanced' : 'Standard'})`);
    } catch (error) {
      console.error('❌ Error refreshing session data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadInitialSessionState, enableEnhancedMode]);

  return {
    sessionData,
    loading,
    error,
    refreshing,
    wsConnected,
    refresh
  };
};
