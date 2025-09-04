// Session Stats Manager - Handles statistics and monitoring data
const SessionSchema = require('../database/sessionSchema');

class SessionStatsManager {
  constructor(configDatabase) {
    this.configDatabase = configDatabase;
    this.sessionSchema = new SessionSchema(configDatabase.db);
    
    // Components will be injected
    this.sessionFSM = null;
    this.wsClient = null;
    this.eventHandler = null;
    
    console.log('📈 SessionStatsManager created');
  }

  // Inject dependencies
  setSessionFSM(sessionFSM) {
    this.sessionFSM = sessionFSM;
  }

  setWebSocketClient(wsClient) {
    this.wsClient = wsClient;
  }

  setEventHandler(eventHandler) {
    this.eventHandler = eventHandler;
  }

  // Get comprehensive statistics
  getStats() {
    const dbStats = this.getDatabaseStats();
    const sessionStats = this.getSessionStats();
    const wsStats = this.getWebSocketStats();
    const eventStats = this.getEventStats();
    
    return {
      // Database statistics
      database: dbStats,
      
      // Current session statistics
      session: sessionStats,
      
      // WebSocket connection statistics
      webSocket: wsStats,
      
      // Event processing statistics
      events: eventStats,
      
      // System information
      system: {
        lastUpdate: new Date().toISOString(),
        uptime: this.getUptimeStats(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  // Database statistics
  getDatabaseStats() {
    try {
      const dbStats = this.sessionSchema.getStats();
      return {
        ...dbStats,
        databaseSize: this.getDatabaseSize(),
        lastDbUpdate: this.getLastDatabaseUpdate()
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return {
        totalSessions: 0,
        totalEvents: 0,
        databaseSize: 0,
        lastDbUpdate: null,
        error: error.message
      };
    }
  }

  // Current session statistics
  getSessionStats() {
    if (!this.sessionFSM) {
      return {
        isActive: false,
        currentState: 'unknown',
        sessionStart: null,
        sessionDuration: null
      };
    }

    const sessionData = this.sessionFSM.getSessionData();
    let sessionDuration = null;
    
    if (sessionData.sessionStart) {
      const start = new Date(sessionData.sessionStart);
      sessionDuration = Math.floor((Date.now() - start.getTime()) / 1000 / 60); // minutes
    }
    
    return {
      isActive: sessionData.isActive,
      currentState: this.sessionFSM.currentState,
      sessionStart: sessionData.sessionStart,
      sessionDuration: sessionDuration,
      targetName: sessionData.target?.name || null,
      projectName: sessionData.target?.project || null,
      currentFilter: sessionData.filter?.name || null,
      safetyStatus: sessionData.safe?.isSafe ? 'safe' : 'unsafe',
      activityState: `${sessionData.activity?.subsystem || 'Unknown'}: ${sessionData.activity?.state || 'Idle'}`,
      flatsActive: sessionData.flats?.isActive || false,
      darksActive: sessionData.darks?.isActive || false
    };
  }

  // WebSocket connection statistics
  getWebSocketStats() {
    if (!this.wsClient) {
      return {
        isConnected: false,
        connectionState: 'not-initialized',
        reconnectAttempts: 0,
        lastHeartbeat: null,
        wsUrl: null
      };
    }

    return {
      isConnected: this.wsClient.isConnected || false,
      connectionState: this.wsClient.connectionState || 'unknown',
      reconnectAttempts: this.wsClient.reconnectAttempts || 0,
      lastHeartbeat: this.wsClient.lastHeartbeat ? 
        new Date(this.wsClient.lastHeartbeat).toISOString() : null,
      wsUrl: this.wsClient.getWebSocketUrl ? this.wsClient.getWebSocketUrl() : null,
      connectionUptime: this.wsClient.connectionStartTime ? 
        Math.floor((Date.now() - this.wsClient.connectionStartTime) / 1000) : null // seconds
    };
  }

  // Event processing statistics
  getEventStats() {
    if (!this.eventHandler) {
      return {
        recentEventCount: 0,
        lastEventTime: null,
        eventsPerMinute: 0
      };
    }

    const eventStats = this.eventHandler.getEventStats();
    const recentEvents = this.eventHandler.getRecentEvents();
    
    // Calculate events per minute (last 5 minutes)
    let eventsPerMinute = 0;
    if (recentEvents.length > 0) {
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const recentEventCount = recentEvents.filter(event => 
        new Date(event.timestamp).getTime() > fiveMinutesAgo
      ).length;
      eventsPerMinute = recentEventCount / 5;
    }
    
    return {
      recentEventCount: eventStats.recentEventCount || 0,
      lastEventTime: eventStats.lastEventTime,
      eventsPerMinute: Math.round(eventsPerMinute * 100) / 100,
      connectionStatus: eventStats.connectionStatus || false
    };
  }

  // System uptime statistics
  getUptimeStats() {
    const uptimeSeconds = process.uptime();
    
    return {
      processUptimeSeconds: uptimeSeconds,
      processUptimeFormatted: this.formatUptime(uptimeSeconds),
      startTime: new Date(Date.now() - uptimeSeconds * 1000).toISOString()
    };
  }

  // Get database size (approximate)
  getDatabaseSize() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.resolve(this.configDatabase.dbPath || 'dashboard-config.sqlite');
      
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        return Math.round(stats.size / 1024); // KB
      }
    } catch (error) {
      console.warn('⚠️ Could not get database size:', error);
    }
    
    return 0;
  }

  // Get last database update time
  getLastDatabaseUpdate() {
    try {
      // Query for the most recent session state update
      const stmt = this.configDatabase.db.prepare(`
        SELECT MAX(last_update) as last_update 
        FROM session_state
      `);
      const result = stmt.get();
      return result?.last_update || null;
    } catch (error) {
      console.warn('⚠️ Could not get last database update:', error);
      return null;
    }
  }

  // Format uptime in human-readable format
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        userTime: process.cpuUsage().user,
        systemTime: process.cpuUsage().system
      },
      uptime: {
        process: process.uptime(),
        system: require('os').uptime()
      }
    };
  }

  // Get health summary
  getHealthSummary() {
    const stats = this.getStats();
    const performance = this.getPerformanceMetrics();
    
    const health = {
      overall: 'healthy',
      issues: [],
      score: 100
    };
    
    // Check various health indicators
    if (!stats.webSocket.isConnected) {
      health.issues.push('WebSocket disconnected');
      health.score -= 30;
    }
    
    if (stats.events.eventsPerMinute === 0 && stats.session.isActive) {
      health.issues.push('No recent events during active session');
      health.score -= 20;
    }
    
    if (performance.memory.heapUsed > 200) { // More than 200MB
      health.issues.push('High memory usage');
      health.score -= 10;
    }
    
    if (stats.webSocket.reconnectAttempts > 5) {
      health.issues.push('Multiple reconnection attempts');
      health.score -= 15;
    }
    
    // Determine overall health
    if (health.score >= 80) {
      health.overall = 'healthy';
    } else if (health.score >= 60) {
      health.overall = 'warning';
    } else {
      health.overall = 'critical';
    }
    
    return {
      ...health,
      lastCheck: new Date().toISOString(),
      performance
    };
  }

  // Cleanup
  destroy() {
    console.log('💥 Destroying SessionStatsManager');
  }
}

module.exports = SessionStatsManager;
