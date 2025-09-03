// Configuration API routes
const express = require('express');

class ConfigRoutes {
  constructor(configDatabase, sessionStateManager = null) {
    this.configDatabase = configDatabase;
    this.sessionStateManager = sessionStateManager; // Add sessionStateManager access
  }

  register(app) {
    // Enhanced health check endpoint with backend status
    app.get('/api/config/health', (req, res) => {
      const health = { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        backend: {
          initialized: false,
          ninaConnected: false,
          eventCount: 0,
          lastUpdate: null
        }
      };
      
      // Add backend connection status if available
      if (this.sessionStateManager) {
        const sessionState = this.sessionStateManager.getSessionState();
        health.backend = {
          initialized: this.sessionStateManager.isInitialized,
          ninaConnected: sessionState.connectionStatus || false,
          eventCount: sessionState.eventCount || 0,
          lastUpdate: sessionState.lastUpdate
        };
      }
      
      res.json(health);
    });

    // Get configuration
    app.get('/api/config', (req, res) => {
      try {
        const config = this.configDatabase.getConfig();
        res.json(config);
      } catch (error) {
        console.error('Error getting config:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
      }
    });

    // Update configuration
    app.post('/api/config', (req, res) => {
      try {
        const updatedConfig = this.configDatabase.updateConfig(req.body);
        res.json(updatedConfig);
      } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
      }
    });

    // Export configuration
    app.get('/api/config/export', (req, res) => {
      try {
        const config = this.configDatabase.getConfig();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="nina-dashboard-config.json"');
        res.json(config);
      } catch (error) {
        console.error('Error exporting config:', error);
        res.status(500).json({ error: 'Failed to export configuration' });
      }
    });

    // Import configuration
    app.post('/api/config/import', (req, res) => {
      try {
        const importedConfig = this.configDatabase.updateConfig(req.body);
        res.json({
          success: true,
          message: 'Configuration imported successfully',
          config: importedConfig
        });
      } catch (error) {
        console.error('Error importing config:', error);
        res.status(500).json({ error: 'Failed to import configuration' });
      }
    });

    // Configuration statistics
    app.get('/api/config/stats', (req, res) => {
      try {
        const config = this.configDatabase.getConfig();
        const stats = {
          totalSettings: Object.keys(config).length,
          hasNinaConfig: !!(config.nina),
          hasStreams: !!(config.streams && Object.keys(config.streams).length > 0),
          hasDirectories: !!(config.directories),
          lastUpdated: new Date().toISOString()
        };
        res.json(stats);
      } catch (error) {
        console.error('Error getting config stats:', error);
        res.status(500).json({ error: 'Failed to get configuration statistics' });
      }
    });
  }
}

module.exports = ConfigRoutes;
