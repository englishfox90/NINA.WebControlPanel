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

    // Latest image endpoint - New 3-step implementation
    app.get('/api/nina/latest-image', async (req, res) => {
      try {
        console.log('📸 API: Latest image request received');
        
        // Step 1: Get image count from NINA (all image types)
        const imageCount = await this.ninaService.getImageHistoryCount();
        
        if (imageCount === 0) {
          console.log('📸 No images available in NINA');
          return res.json({
            Success: true,
            StatusCode: 204,
            imageBase64: null,
            imageContentType: null,
            imageStats: null,
            ExposureTime: null,
            message: 'No images available',
            Error: null
          });
        }
        
        // Step 2: Get latest image metadata (count - 1)
        const imageIndex = imageCount - 1;
        console.log(`📸 Fetching image metadata for index ${imageIndex} (latest of ${imageCount})`);
        
        const imageStats = await this.ninaService.getImageHistoryByIndex(imageIndex);
        
        if (!imageStats) {
          console.warn('⚠️ Failed to get image metadata');
          return res.json({
            Success: true,
            StatusCode: 204,
            imageBase64: null,
            imageContentType: null,
            imageStats: null,
            ExposureTime: null,
            message: 'Failed to get image metadata',
            Error: 'Image metadata not available'
          });
        }
        
        // Step 3: Get prepared image as binary data
        let imageBase64 = null;
        let imageContentType = null;
        
        try {
          const imageData = await this.ninaService.getPreparedImageArrayBuffer();
          
          // Convert array buffer to base64
          const buffer = Buffer.from(imageData.bytes);
          imageBase64 = buffer.toString('base64');
          imageContentType = imageData.contentType;
          
          console.log(`📸 Image encoded to base64: ${imageBase64.length} characters`);
        } catch (imageError) {
          console.error('❌ Failed to get prepared image:', imageError.message);
          console.error('❌ Full error details:', imageError);
          // Continue without image - still return metadata
        }
        
        // Return combined response
        const response = {
          Success: true,
          StatusCode: 200,
          imageBase64: imageBase64,
          imageContentType: imageContentType,
          imageStats: imageStats,
          ExposureTime: imageStats.ExposureTime || 30, // Default to 30s if missing
          message: imageBase64 ? 'Image and metadata retrieved successfully' : 'Metadata retrieved, image unavailable',
          Error: null
        };
        
        console.log(`📸 Returning response: ${imageBase64 ? 'with' : 'without'} image, ExposureTime: ${response.ExposureTime}s`);
        res.json(response);
        
      } catch (error) {
        console.error('❌ Error getting latest image:', error);
        res.status(500).json({ 
          Success: false,
          StatusCode: 500,
          imageBase64: null,
          imageContentType: null,
          imageStats: null,
          ExposureTime: null,
          message: 'Failed to get latest image',
          Error: error.message
        });
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

    // NINA application logs endpoint
    app.get('/api/nina/logs', async (req, res) => {
      try {
        const lineCount = parseInt(req.query.lineCount) || 25;
        
        // Validate line count range (10-100)
        const validLineCount = Math.min(Math.max(lineCount, 10), 100);
        
        console.log(`📋 API: NINA logs request - ${validLineCount} lines`);
        
        const logsData = await this.ninaService.getNINALogs(validLineCount);
        
        if (logsData.Success) {
          console.log(`📋 Returning ${logsData.lineCount} log entries`);
        } else {
          console.warn('⚠️ NINA logs request failed:', logsData.Error);
        }
        
        res.json(logsData);
      } catch (error) {
        console.error('❌ Error getting NINA logs:', error);
        res.status(500).json({
          Response: [],
          Success: false,
          Error: error.message,
          StatusCode: 500,
          Type: 'API',
          timestamp: new Date().toISOString(),
          lineCount: 0
        });
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

    // LiveStack endpoints
    app.get('/api/nina/livestack/options', async (req, res) => {
      try {
        console.log('📋 API: LiveStack options request');
        const response = await this.ninaService.getLiveStackOptions();
        res.json(response);
      } catch (error) {
        console.error('❌ Error getting LiveStack options:', error);
        res.status(500).json({
          Success: false,
          Response: [],
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });

    // Session state endpoint (compatibility - now uses unified state)
    app.get('/api/nina/session-state', async (req, res) => {
      try {
        // Get unified state if available
        if (global.unifiedStateSystem) {
          const state = global.unifiedStateSystem.getState();
          const session = state.currentSession;
          
          res.json({
            isGuiding: session?.guiding?.isGuiding || false,
            isActive: session?.isActive || false,
            targetName: session?.target?.targetName || null,
            currentFilter: session?.imaging?.currentFilter || null,
            exposureSeconds: session?.imaging?.exposureSeconds || null,
            frameType: session?.imaging?.frameType || null,
            source: 'unified-state'
          });
        } else {
          // Fallback to legacy behavior
          res.json({
            isGuiding: false,
            isActive: false,
            targetName: null,
            currentFilter: null,
            exposureSeconds: null,
            frameType: null,
            source: 'fallback'
          });
        }
      } catch (error) {
        console.error('Error getting session state:', error);
        res.status(500).json({ error: 'Failed to get session state' });
      }
    });

    app.get('/api/nina/livestack/info/:target/:filter', async (req, res) => {
      try {
        const { target, filter } = req.params;
        console.log(`📋 API: LiveStack info request - ${target} - ${filter}`);
        const response = await this.ninaService.getLiveStackInfo(target, filter);
        res.json(response);
      } catch (error) {
        console.error('❌ Error getting LiveStack info:', error);
        res.status(500).json({
          Success: false,
          Response: null,
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });

    app.get('/api/nina/livestack/image/:target/:filter', async (req, res) => {
      try {
        const { target, filter } = req.params;
        const { stream } = req.query;
        
        console.log(`📋 API: LiveStack image request - ${target} - ${filter}`);
        console.log('🔍 Query parameters:', req.query);
        console.log('🔍 Stream parameter:', stream, 'Type:', typeof stream);
        
        if (stream === 'true') {
          console.log('📡 Using stream mode for PNG response');
          // Stream the image directly
          const response = await this.ninaService.getLiveStackImageStream(target, filter);
          
          if (response.Success && response.imageBuffer) {
            res.set({
              'Content-Type': 'image/png',
              'Content-Length': response.imageBuffer.length,
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.send(response.imageBuffer);
          } else {
            res.status(404).json({
              Success: false,
              Error: response.Error || 'Image not found',
              StatusCode: 404,
              Type: 'API'
            });
          }
        } else {
          // Return base64 as before
          const response = await this.ninaService.getLiveStackImage(target, filter);
          res.json(response);
        }
      } catch (error) {
        console.error('❌ Error getting LiveStack image:', error);
        res.status(500).json({
          Success: false,
          Response: '',
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });
  }
}

module.exports = NINARoutes;
