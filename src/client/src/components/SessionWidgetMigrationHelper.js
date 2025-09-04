// Migration Helper for SessionWidget to Use Unified Session API
// Provides compatibility layer between old and new session data structures

class SessionWidgetMigrationHelper {
  constructor() {
    this.newApiAvailable = false;
  }

  // Check if new unified session API is available
  async checkNewAPIAvailability() {
    try {
      const response = await fetch('/api/session/health');
      this.newApiAvailable = response.ok;
      return this.newApiAvailable;
    } catch (error) {
      console.warn('New session API not available, using legacy API');
      this.newApiAvailable = false;
      return false;
    }
  }

  // Unified session data fetch that falls back to legacy API
  async fetchSessionData() {
    if (this.newApiAvailable) {
      try {
        // Try new unified API first
        const response = await fetch('/api/session');
        if (response.ok) {
          const result = await response.json();
          return this.adaptNewFormatToLegacy(result.data);
        }
      } catch (error) {
        console.warn('New session API failed, falling back to legacy:', error.message);
      }
    }

    // Fall back to legacy API
    try {
      const response = await fetch('/api/nina/session-state');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Both session APIs failed:', error.message);
      throw error;
    }
  }

  // Convert new unified session format to legacy format for existing components
  adaptNewFormatToLegacy(unifiedData) {
    return {
      // Core session properties
      sessionStart: unifiedData.sessionStart,
      isActive: unifiedData.isActive,
      lastUpdate: unifiedData.lastUpdate,

      // Target information
      target: unifiedData.target ? {
        name: unifiedData.target.name,
        project: unifiedData.target.project,
        coordinates: unifiedData.target.coordinates,
        rotation: unifiedData.target.rotation,
        startedAt: unifiedData.target.startedAt,
        targetEndTime: unifiedData.target.targetEndTime,
        isExpired: unifiedData.target.isExpired
      } : null,

      // Filter information
      filter: unifiedData.filter ? {
        name: unifiedData.filter.name
      } : null,

      // Last image
      lastImage: unifiedData.lastImage || null,

      // Safety information
      safe: unifiedData.safe || { isSafe: null, time: null },

      // Activity status
      activity: unifiedData.activity || { subsystem: null, state: null, since: null },

      // Equipment changes
      lastEquipmentChange: unifiedData.lastEquipmentChange || null,

      // Flat field information
      flats: unifiedData.flats || {
        isActive: false,
        filter: null,
        brightness: null,
        imageCount: 0,
        startedAt: null,
        lastImageAt: null
      },

      // Dark frame information
      darks: unifiedData.darks || {
        isActive: false,
        currentExposureTime: null,
        exposureGroups: {},
        totalImages: 0,
        startedAt: null,
        lastImageAt: null
      },

      // Event information (enhanced from unified system)
      events: unifiedData.events || [],
      eventCount: unifiedData.eventCount || 0,
      connectionStatus: unifiedData.connectionStatus || false,

      // Add unified system metadata
      _metadata: {
        source: 'unified-session-api',
        version: '2.0',
        adaptedAt: new Date().toISOString(),
        sessionState: unifiedData.sessionState || 'idle'
      }
    };
  }

  // Refresh session data (works with both APIs)
  async refreshSessionData() {
    if (this.newApiAvailable) {
      try {
        const response = await fetch('/api/session/refresh', { method: 'POST' });
        if (response.ok) {
          const result = await response.json();
          return this.adaptNewFormatToLegacy(result.data);
        }
      } catch (error) {
        console.warn('New session refresh failed, falling back to legacy');
      }
    }

    // Fall back to legacy refresh
    try {
      const response = await fetch('/api/nina/session-state/refresh', { method: 'POST' });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Session refresh failed:', error.message);
      throw error;
    }
  }

  // Get WebSocket URL (prefers unified endpoint)
  getWebSocketURL() {
    if (this.newApiAvailable) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/unified`;
    } else {
      // Legacy WebSocket endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/session`;
    }
  }

  // Adapt WebSocket messages to consistent format
  adaptWebSocketMessage(message) {
    try {
      const data = JSON.parse(message.data);
      
      // Handle unified session updates
      if (data.type === 'unifiedSessionUpdate') {
        return {
          type: 'sessionUpdate',
          data: this.adaptNewFormatToLegacy(data.data),
          timestamp: data.timestamp,
          _source: 'unified'
        };
      }
      
      // Handle legacy session updates
      if (data.type === 'sessionUpdate') {
        return {
          ...data,
          _source: 'legacy'
        };
      }
      
      // Handle NINA events (unchanged)
      if (data.type === 'nina-event') {
        return data;
      }
      
      // Handle connection/heartbeat messages
      if (data.type === 'connection' || data.type === 'heartbeat') {
        return data;
      }
      
      return data;
    } catch (error) {
      console.error('Error adapting WebSocket message:', error);
      return null;
    }
  }

  // Log migration status for debugging
  logMigrationStatus() {
    console.log('📊 Session Widget Migration Status:', {
      newApiAvailable: this.newApiAvailable,
      apiEndpoint: this.newApiAvailable ? '/api/session' : '/api/nina/session-state',
      wsEndpoint: this.getWebSocketURL(),
      timestamp: new Date().toISOString()
    });
  }
}

// Usage example for SessionWidget.tsx:
/*
import SessionWidgetMigrationHelper from './SessionWidgetMigrationHelper';

const SessionWidget = () => {
  const [migrationHelper] = useState(new SessionWidgetMigrationHelper());
  const [sessionData, setSessionData] = useState(null);
  
  useEffect(() => {
    const initializeSession = async () => {
      await migrationHelper.checkNewAPIAvailability();
      migrationHelper.logMigrationStatus();
      
      const data = await migrationHelper.fetchSessionData();
      setSessionData(data);
    };
    
    initializeSession();
  }, []);
  
  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(migrationHelper.getWebSocketURL());
    
    ws.onmessage = (message) => {
      const adaptedMessage = migrationHelper.adaptWebSocketMessage(message);
      if (adaptedMessage && adaptedMessage.type === 'sessionUpdate') {
        setSessionData(adaptedMessage.data);
      }
    };
    
    return () => ws.close();
  }, []);
  
  // Manual refresh
  const handleRefresh = async () => {
    const refreshedData = await migrationHelper.refreshSessionData();
    setSessionData(refreshedData);
  };
  
  return (
    // Existing JSX remains unchanged
  );
};
*/

module.exports = SessionWidgetMigrationHelper;
