// NINA integration API routes
const express = require('express');

class NINARoutes {
  constructor(ninaService, sessionStateManager, configDatabase) {
    this.ninaService = ninaService;
    this.sessionStateManager = sessionStateManager;
    this.configDatabase = configDatabase;
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

    // Guider graph endpoint
    app.get('/api/nina/guider-graph', async (req, res) => {
      try {
        const guiderGraph = await this.ninaService.getGuiderGraph();
        res.json(guiderGraph);
      } catch (error) {
        console.error('Error getting guider graph:', error);
        res.status(500).json({ 
          error: 'Failed to fetch guider graph data',
          details: error.message 
        });
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

    // Proxy NINA prepared-image endpoint
    app.get('/api/nina/prepared-image', async (req, res) => {
      try {
        const config = this.configDatabase.getConfig();
        // Remove trailing slash from baseUrl if present
        const baseUrl = config.nina.baseUrl.replace(/\/$/, '');
        const ninaApiUrl = `${baseUrl}:${config.nina.apiPort}`;
        
        // Build query parameters from request
        const queryParams = new URLSearchParams();
        if (req.query.resize) queryParams.set('resize', req.query.resize);
        if (req.query.size) queryParams.set('size', req.query.size);
        if (req.query.autoPrepare) queryParams.set('autoPrepare', req.query.autoPrepare);
        
        const preparedImageUrl = `${ninaApiUrl}/v2/api/prepared-image?${queryParams.toString()}`;
        console.log('📸 Proxying prepared-image request to:', preparedImageUrl);
        
        // Use axios for HTTP request instead of fetch
        const axios = require('axios');
        const response = await axios.get(preparedImageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
          validateStatus: function (status) {
            // Accept 200-299 range and 304 (Not Modified)
            return (status >= 200 && status < 300) || status === 304;
          }
        });
        
        // Handle 304 Not Modified - return empty response
        if (response.status === 304) {
          console.log('📸 Image not modified (304), sending empty response');
          return res.status(304).end();
        }
        
        if (response.status === 404) {
          return res.status(404).json({
            error: 'No prepared image available',
            message: 'NINA has no prepared image ready yet'
          });
        }
        
        if (response.status !== 200) {
          throw new Error(`NINA API error: ${response.status} ${response.statusText}`);
        }
        
        // Get content type from response headers
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        res.set({
          'Content-Type': contentType,
          'Content-Length': response.data.length,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        
        res.send(response.data);
        console.log('✅ Prepared image proxied successfully:', response.data.length, 'bytes');
        
      } catch (error) {
        console.error('❌ Error proxying prepared-image:', error.message);
        res.status(500).json({ 
          error: 'Failed to get prepared image',
          details: error.message 
        });
      }
    });
  }
}

module.exports = NINARoutes;
