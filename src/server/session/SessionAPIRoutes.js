// Unified Session API Routes
// RESTful endpoints for the new session management system

class SessionAPIRoutes {
  constructor(unifiedSessionManager) {
    console.log('🔧 SessionAPIRoutes constructor called with:', unifiedSessionManager ? 'VALID sessionManager' : 'NULL sessionManager');
    this.sessionManager = unifiedSessionManager;
    console.log('🔧 SessionAPIRoutes this.sessionManager set to:', this.sessionManager ? 'VALID' : 'NULL');
    
    // Session state caching to prevent duplicate API calls
    this.sessionCache = null;
    this.sessionCacheTimestamp = 0;
    this.CACHE_DURATION_MS = 1000; // 1 second cache duration
  }

  // Cache invalidation method - call when session data changes
  invalidateCache() {
    this.sessionCache = null;
    this.sessionCacheTimestamp = 0;
    console.log('🗑️ Session cache invalidated');
  }

  // Register session API routes
  register(app) {
    // Get current session state (main endpoint)
    app.get('/api/session', async (req, res) => {
      try {
        const sessionData = this.sessionManager.getCurrentSessionData();
        res.json({
          success: true,
          data: sessionData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error getting session data:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get session state for WebSocket connection (unified format) with caching
    app.get('/api/nina/session-state', async (req, res) => {
      try {
        // Debug session manager availability
        if (!this.sessionManager) {
          console.error('❌ Session manager is null in SessionAPIRoutes');
          return res.status(503).json({
            error: "Session state manager not available"
          });
        }

        // Check cache first to prevent duplicate API calls
        const now = Date.now();
        if (this.sessionCache && (now - this.sessionCacheTimestamp) < this.CACHE_DURATION_MS) {
          console.log('📦 Returning cached session state (avoiding duplicate call)');
          return res.json(this.sessionCache);
        }

        // Get fresh session data
        const sessionData = this.sessionManager.getCurrentSessionData();
        console.log('🎯 Returning active session for target:', sessionData?.target?.name);
        console.log('🎯 Returning unified session for API request:', {
          target: sessionData?.target?.name,
          isGuiding: sessionData?.isGuiding,
          activity: sessionData?.activity
        });
        
        // Update cache
        this.sessionCache = sessionData || {};
        this.sessionCacheTimestamp = now;
        
        // Return unified format (same as WebSocket message data)
        res.json(sessionData || {});
      } catch (error) {
        console.error('❌ Error getting unified session state:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Manual session refresh
    app.post('/api/session/refresh', async (req, res) => {
      try {
        console.log('🔄 Manual session refresh requested via API');
        
        // Invalidate cache before refresh
        this.invalidateCache();
        
        const sessionData = await this.sessionManager.refresh();
        
        res.json({
          success: true,
          message: 'Session data refreshed from NINA',
          data: sessionData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error refreshing session:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get session statistics
    app.get('/api/session/stats', (req, res) => {
      try {
        const stats = this.sessionManager.getStats();
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error getting session stats:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Health check for session manager
    app.get('/api/session/health', (req, res) => {
      const health = {
        sessionManager: this.sessionManager.isInitialized,
        websocket: this.sessionManager.wsClient?.isConnected || false,
        database: true, // ConfigDatabase is always available if we get here
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      const isHealthy = health.sessionManager && health.database;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: health
      });
    });

    console.log('✅ Session API routes registered');
  }

  // Convert new session format to legacy format for backward compatibility
  convertToLegacyFormat(sessionData) {
    return {
      target: sessionData.target ? {
        name: sessionData.target.name,
        project: sessionData.target.project,
        coordinates: sessionData.target.coordinates,
        rotation: sessionData.target.rotation,
        startedAt: sessionData.target.startedAt,
        targetEndTime: sessionData.target.targetEndTime,
        isExpired: sessionData.target.isExpired
      } : null,
      
      filter: sessionData.filter ? {
        name: sessionData.filter.name
      } : null,
      
      lastImage: sessionData.lastImage,
      
      safe: sessionData.safe || { isSafe: null, time: null },
      
      activity: sessionData.activity || { subsystem: null, state: null, since: null },
      
      lastEquipmentChange: sessionData.lastEquipmentChange,
      
      flats: sessionData.flats || {
        isActive: false,
        filter: null,
        brightness: null,
        imageCount: 0,
        startedAt: null,
        lastImageAt: null
      },
      
      darks: sessionData.darks || {
        isActive: false,
        currentExposureTime: null,
        exposureGroups: {},
        totalImages: 0,
        startedAt: null,
        lastImageAt: null
      },
      
      sessionStart: sessionData.sessionStart,
      isActive: sessionData.isActive,
      lastUpdate: sessionData.lastUpdate,
      
      // Include recent events and metadata
      events: sessionData.events || [],
      eventCount: sessionData.eventCount || 0,
      connectionStatus: sessionData.connectionStatus || false
    };
  }
}

module.exports = SessionAPIRoutes;
