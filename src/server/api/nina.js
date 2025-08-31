// NINA integration API routes
const express = require('express');

class NINARoutes {
  constructor(ninaService, sessionStateManager) {
    this.ninaService = ninaService;
    this.sessionStateManager = sessionStateManager;
  }

  register(app) {
    // Equipment status endpoint
    app.get('/api/nina/equipment', async (req, res) => {
      try {
        const equipment = await this.ninaService.getEquipmentStatus();
        res.json(equipment);
      } catch (error) {
        console.error('Error getting NINA equipment status:', error);
        res.status(500).json({ error: 'Failed to get equipment status' });
      }
    });

    // NINA connection status
    app.get('/api/nina/status', async (req, res) => {
      try {
        const status = await this.ninaService.getConnectionStatus();
        res.json(status);
      } catch (error) {
        console.error('Error getting NINA status:', error);
        res.status(500).json({ error: 'Failed to get NINA status' });
      }
    });

    // Flat panel status
    app.get('/api/nina/flat-panel', async (req, res) => {
      try {
        const flatPanel = await this.ninaService.getFlatPanelStatus();
        res.json(flatPanel);
      } catch (error) {
        console.error('Error getting flat panel status:', error);
        res.status(500).json({ error: 'Failed to get flat panel status' });
      }
    });

    // Weather status
    app.get('/api/nina/weather', async (req, res) => {
      try {
        const weather = await this.ninaService.getWeatherStatus();
        res.json(weather);
      } catch (error) {
        console.error('Error getting weather status:', error);
        res.status(500).json({ error: 'Failed to get weather status' });
      }
    });

    // Session data endpoint
    app.get('/api/nina/session', async (req, res) => {
      try {
        const sessionData = await this.ninaService.getSessionData();
        res.json({
          Response: sessionData,
          Success: true,
          Error: null,
          StatusCode: 200,
          Type: 'API'
        });
      } catch (error) {
        console.error('Error getting session data:', error);
        res.status(500).json({
          Response: null,
          Success: false,
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });

    // Image history endpoint
    app.get('/api/nina/image-history', async (req, res) => {
      try {
        const imageHistory = await this.ninaService.getImageHistory();
        res.json(imageHistory);
      } catch (error) {
        console.error('Error getting image history:', error);
        res.status(500).json({ error: 'Failed to get image history' });
      }
    });

    // Latest image endpoint
    app.get('/api/nina/latest-image', async (req, res) => {
      try {
        const latestImage = await this.ninaService.getLatestImage();
        res.json(latestImage);
      } catch (error) {
        console.error('Error getting latest image:', error);
        res.status(500).json({ error: 'Failed to get latest image' });
      }
    });

    // Get image by index
    app.get('/api/nina/image/:index', async (req, res) => {
      try {
        const index = parseInt(req.params.index) || 0;
        const options = {
          annotate: req.query.annotate === 'true',
          stretch: req.query.stretch === 'true',
          scale: req.query.scale ? parseFloat(req.query.scale) : undefined,
          format: req.query.format || 'jpeg',
          quality: req.query.quality ? parseInt(req.query.quality) : undefined
        };
        
        const imageData = await this.ninaService.getImageByIndex(index, options);
        res.json(imageData);
      } catch (error) {
        console.error(`Error getting NINA image ${req.params.index}:`, error);
        res.status(500).json({ 
          error: 'Failed to get NINA image',
          details: error.message 
        });
      }
    });

    // Camera info endpoint
    app.get('/api/nina/camera', async (req, res) => {
      try {
        const cameraInfo = await this.ninaService.getCameraInfo();
        res.json(cameraInfo);
      } catch (error) {
        console.error('Error getting camera info:', error);
        res.status(500).json({ error: 'Failed to get camera info' });
      }
    });

    // Event history endpoint
    app.get('/api/nina/event-history', async (req, res) => {
      try {
        const eventHistory = await this.ninaService.getEventHistory();
        res.json(eventHistory);
      } catch (error) {
        console.error('Error getting event history:', error);
        res.status(500).json({ error: 'Failed to get event history' });
      }
    });

    // Session state endpoint (using SessionStateManager)
    app.get('/api/nina/session-state', async (req, res) => {
      try {
        if (!this.sessionStateManager) {
          return res.status(503).json({ error: 'Session state manager not available' });
        }
        
        const sessionState = this.sessionStateManager.getSessionState();
        res.json({
          Response: sessionState,
          Success: true,
          Error: null,
          StatusCode: 200,
          Type: 'API'
        });
      } catch (error) {
        console.error('Error getting session state:', error);
        res.status(500).json({
          Response: null,
          Success: false,
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });

    // Refresh session state
    app.post('/api/nina/session-state/refresh', async (req, res) => {
      try {
        if (!this.sessionStateManager) {
          return res.status(503).json({ error: 'Session state manager not available' });
        }
        
        await this.sessionStateManager.refreshSessionState();
        const sessionState = this.sessionStateManager.getSessionState();
        
        res.json({
          Response: sessionState,
          Success: true,
          Error: null,
          StatusCode: 200,
          Type: 'API'
        });
      } catch (error) {
        console.error('Error refreshing session state:', error);
        res.status(500).json({
          Response: null,
          Success: false,
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });
  }
}

module.exports = NINARoutes;
