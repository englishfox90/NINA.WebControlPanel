// API Routes Handler for NINA WebControlPanel
// Extracts all API routes from config-server.js for better organization
// This keeps the main server file under 500 lines as requested

const path = require('path');

class APIRoutes {
  constructor(configDatabase, systemMonitor, ninaService, astronomicalService, targetSchedulerService, sessionStateManager) {
    this.configDatabase = configDatabase;
    this.systemMonitor = systemMonitor;
    this.ninaService = ninaService;
    this.astronomicalService = astronomicalService;
    this.targetSchedulerService = targetSchedulerService;
    this.sessionStateManager = sessionStateManager;
    
    // Use the targetSchedulerService passed from config-server.js
    this.targetSchedulerDb = targetSchedulerService;
    
    console.log('🔧 API Routes initialized with all services');
  }

  // Register all API routes on the Express app
  register(app) {
    this.registerConfigRoutes(app);
    this.registerSystemRoutes(app);
    this.registerSchedulerRoutes(app);
    this.registerAstronomicalRoutes(app);
    this.registerNINARoutes(app);
    this.registerDashboardRoutes(app);
  }

  // Configuration API routes
  registerConfigRoutes(app) {
    // Health check endpoint
    app.get('/api/config/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Get entire configuration
    app.get('/api/config', (req, res) => {
      try {
        const config = this.configDatabase.getConfig();
        res.json(config);
      } catch (error) {
        console.error('Error getting configuration:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
      }
    });

    // Set entire configuration
    app.put('/api/config', (req, res) => {
      try {
        this.configDatabase.setConfig(req.body);
        res.json({ success: true, message: 'Configuration updated successfully' });
      } catch (error) {
        console.error('Error setting configuration:', error);
        res.status(500).json({ error: 'Failed to set configuration' });
      }
    });

    // Export configuration to JSON
    app.get('/api/config/export', (req, res) => {
      try {
        const config = this.configDatabase.getConfig();
        res.setHeader('Content-Disposition', 'attachment; filename=dashboard-config-export.json');
        res.setHeader('Content-Type', 'application/json');
        res.json(config);
      } catch (error) {
        console.error('Error exporting configuration:', error);
        res.status(500).json({ error: 'Failed to export configuration' });
      }
    });

    // Import configuration from JSON
    app.post('/api/config/import', (req, res) => {
      try {
        this.configDatabase.setConfig(req.body);
        res.json({ success: true, message: 'Configuration imported successfully' });
      } catch (error) {
        console.error('Error importing configuration:', error);
        res.status(500).json({ error: 'Failed to import configuration' });
      }
    });

    // Get database statistics
    app.get('/api/config/stats', (req, res) => {
      try {
        const stats = this.configDatabase.getStats();
        res.json(stats);
      } catch (error) {
        console.error('Error getting database statistics:', error);
        res.status(500).json({ error: 'Failed to get database statistics' });
      }
    });
  }

  // System monitoring API routes
  registerSystemRoutes(app) {
    // System status endpoint
    app.get('/api/system/status', async (req, res) => {
      try {
        const status = await this.systemMonitor.getSystemStatus();
        res.json(status);
      } catch (error) {
        console.error('Error getting system status:', error);
        res.status(500).json({ error: 'Failed to get system status' });
      }
    });

    app.get('/api/system/uptime', async (req, res) => {
      try {
        const uptime = await this.systemMonitor.getUptimeInfo();
        res.json(uptime);
      } catch (error) {
        console.error('Error getting uptime:', error);
        res.status(500).json({ error: 'Failed to get uptime info' });
      }
    });

    app.get('/api/system/cpu', async (req, res) => {
      try {
        const cpu = await this.systemMonitor.getCPUInfo();
        res.json(cpu);
      } catch (error) {
        console.error('Error getting CPU info:', error);
        res.status(500).json({ error: 'Failed to get CPU info' });
      }
    });

    app.get('/api/system/memory', async (req, res) => {
      try {
        const memory = await this.systemMonitor.getMemoryInfo();
        res.json(memory);
      } catch (error) {
        console.error('Error getting memory info:', error);
        res.status(500).json({ error: 'Failed to get memory info' });
      }
    });

    app.get('/api/system/disk', async (req, res) => {
      try {
        const disk = await this.systemMonitor.getDiskInfo();
        res.json(disk);
      } catch (error) {
        console.error('Error getting disk info:', error);
        res.status(500).json({ error: 'Failed to get disk info' });
      }
    });

    app.get('/api/system/network', async (req, res) => {
      try {
        const network = await this.systemMonitor.getNetworkInfo();
        res.json(network);
      } catch (error) {
        console.error('Error getting network info:', error);
        res.status(500).json({ error: 'Failed to get network info' });
      }
    });
  }

  // Target scheduler API routes
  registerSchedulerRoutes(app) {
    // Get scheduler progress overview
    app.get('/api/scheduler/progress', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const projects = this.targetSchedulerDb.getProjectProgress();
        res.json({ 
          projects,
          lastUpdate: new Date().toISOString(),
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.state === 1).length
        });
      } catch (error) {
        console.error('Error getting scheduler progress:', error);
        res.status(500).json({ error: 'Failed to get scheduler progress' });
      }
    });

    // Get detailed project information
    app.get('/api/scheduler/project/:id', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const projectId = parseInt(req.params.id);
        const project = this.targetSchedulerDb.getProjectDetails(projectId);
        
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
      } catch (error) {
        console.error('Error getting project details:', error);
        res.status(500).json({ error: 'Failed to get project details' });
      }
    });

    // Get scheduler status (current/next target)
    app.get('/api/scheduler/status', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const status = this.targetSchedulerDb.getSchedulerStatus();
        res.json(status);
      } catch (error) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({ error: 'Failed to get scheduler status' });
      }
    });

    // Get recent imaging activity
    app.get('/api/scheduler/activity', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const days = parseInt(req.query.days) || 7;
        const activity = this.targetSchedulerDb.getRecentActivity(days);
        res.json({ activity, days });
      } catch (error) {
        console.error('Error getting scheduler activity:', error);
        res.status(500).json({ error: 'Failed to get scheduler activity' });
      }
    });
  }

  // Astronomical service API routes  
  registerAstronomicalRoutes(app) {
    // Get current time and astronomical data
    app.get('/api/time/astronomical', async (req, res) => {
      try {
        const now = new Date();
        const browserTime = req.headers['x-browser-time'] || now.toISOString();
        const timeZoneOffset = parseInt(req.headers['x-timezone-offset'] || '0');
        
        // Get observatory location from configuration first to get timezone
        const config = this.configDatabase.getConfig();
        const location = config.observatory?.location || {
          latitude: 31.5475,
          longitude: -99.3817,
          timezone: 'America/Chicago'
        };
        
        // Create server time in the observatory's timezone
        const serverTimeLocal = now.toLocaleString('en-US', { 
          timeZone: location.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Calculate timezone offset in minutes for the observatory location
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: location.timezone,
          timeZoneName: 'longOffset'
        });
        const offsetString = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';
        const timezoneOffsetMinutes = offsetString ? parseTimezoneOffset(offsetString) : 0;
        
        // Helper function to parse timezone offset string like "GMT-4" to minutes
        function parseTimezoneOffset(offsetStr) {
          const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
          if (!match) return 0;
          const sign = match[1] === '+' ? -1 : 1; // Note: reversed because we want offset FROM UTC
          const hours = parseInt(match[2], 10);
          const minutes = parseInt(match[3] || '0', 10);
          return sign * (hours * 60 + minutes);
        }
        
        // Calculate if server and browser times are significantly different (more than 1 minute)
        const serverTime = now.toISOString(); // Keep as UTC for consistency
        const browserDate = new Date(browserTime);
        const timeDifference = Math.abs(now.getTime() - browserDate.getTime());
        const isDifferent = timeDifference > 60000; // More than 1 minute difference
        
        console.log(`🌅 Fetching astronomical data for location: ${location.latitude}, ${location.longitude}`);
        
        // Get real astronomical data from sunrise-sunset.org API
        const astronomicalData = await this.astronomicalService.getComprehensiveAstronomicalData(
          location.latitude,
          location.longitude,
          location.timezone
        );
        
        // Add current phase using real astronomical data instead of hardcoded times
        astronomicalData.currentPhase = this.astronomicalService.getCurrentPhase(now, astronomicalData);
        astronomicalData.moonPhase = this.astronomicalService.getMoonPhase(now);
        
        const response = {
          time: {
            serverTime,
            serverTimeLocal,
            serverTimezone: location.timezone,
            serverTimezoneOffsetMinutes: timezoneOffsetMinutes,
            browserTime,
            timeZoneOffset,
            isDifferent
          },
          astronomical: astronomicalData,
          lastUpdate: now.toISOString()
        };
        
        res.json(response);
      } catch (error) {
        console.error('❌ Error getting time/astronomical data:', error);
        
        // Fallback to mock data on API failure
        const config = this.configDatabase.getConfig();
        const timezone = config.observatory?.location?.timezone || 'America/Chicago';
        const fallbackNow = new Date();
        const fallbackServerTimeLocal = fallbackNow.toLocaleString('en-US', { 
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const fallbackData = {
          sunrise: '06:30:00',
          sunset: '19:30:00',
          civilTwilightBegin: '06:00:00',
          civilTwilightEnd: '20:00:00',
          nauticalTwilightBegin: '05:25:00',
          nauticalTwilightEnd: '20:35:00',
          astronomicalTwilightBegin: '04:50:00',
          astronomicalTwilightEnd: '21:10:00',
          currentPhase: this.astronomicalService.getCurrentPhase(new Date()),
          moonPhase: this.astronomicalService.getMoonPhase(new Date()),
          fallback: true
        };
        
        res.json({
          time: {
            serverTime: fallbackNow.toISOString(),
            serverTimeLocal: fallbackServerTimeLocal,
            serverTimezone: timezone,
            serverTimezoneOffsetMinutes: (new Date().getTimezoneOffset() * -1),
            browserTime: req.headers['x-browser-time'] || new Date().toISOString(),
            timeZoneOffset: parseInt(req.headers['x-timezone-offset'] || '0'),
            isDifferent: false
          },
          astronomical: fallbackData,
          lastUpdate: fallbackNow.toISOString()
        });
      }
    });
  }

  // NINA service API routes
  // NINA service API routes
  registerNINARoutes(app) {
    // Get NINA equipment status
    app.get('/api/nina/equipment', async (req, res) => {
      try {
        const equipmentStatus = await this.ninaService.getEquipmentStatus();
        res.json(equipmentStatus);
      } catch (error) {
        console.error('Error getting NINA equipment status:', error);
        res.status(500).json({ 
          error: 'Failed to get NINA equipment status',
          details: error.message,
          mockMode: true,
          equipment: await this.ninaService.getMockEquipmentStatus()
        });
      }
    });

    // Get NINA connection status
    app.get('/api/nina/status', async (req, res) => {
      try {
        const status = await this.ninaService.getConnectionStatus();
        res.json(status);
      } catch (error) {
        console.error('Error getting NINA status:', error);
        res.status(500).json({ 
          connected: false,
          error: 'Failed to get NINA status',
          details: error.message 
        });
      }
    });

    // Get NINA flat panel status for safety monitoring
    app.get('/api/nina/flat-panel', async (req, res) => {
      try {
        const flatPanelStatus = await this.ninaService.getFlatPanelStatus();
        res.json(flatPanelStatus);
      } catch (error) {
        console.error('Error getting flat panel status:', error);
        res.status(500).json({ 
          error: 'Failed to get flat panel status',
          details: error.message,
          Success: false,
          StatusCode: 500,
          Response: {
            Connected: false,
            LightOn: false,
            CoverState: "Unknown",
            LocalizedCoverState: "Unknown",
            LocalizedLightOnState: "Unknown",
            Brightness: 0,
            SupportsOpenClose: false,
            MinBrightness: 0,
            MaxBrightness: 0,
            SupportsOnOff: false,
            SupportedActions: [],
            Name: "Flat Panel",
            DisplayName: "Flat Panel",
            Description: "Flat panel status unavailable",
            DriverInfo: "N/A",
            DriverVersion: "N/A",
            DeviceId: "unknown"
          }
        });
      }
    });

    // Get NINA weather station status
    app.get('/api/nina/weather', async (req, res) => {
      try {
        const weatherStatus = await this.ninaService.getWeatherStatus();
        res.json(weatherStatus);
      } catch (error) {
        console.error('Error getting weather status:', error);
        res.status(500).json({ 
          error: 'Failed to get weather status',
          details: error.message,
          Success: false,
          StatusCode: 500,
          Response: {
            Connected: false,
            Temperature: null,
            Humidity: null,
            Pressure: null,
            WindSpeed: null,
            WindDirection: null,
            CloudCover: null,
            DewPoint: null,
            RainRate: "0",
            SkyBrightness: "Unknown",
            SkyQuality: "Unknown",
            SkyTemperature: "Unknown",
            StarFWHM: "Unknown",
            WindGust: "0",
            AveragePeriod: 0,
            SupportedActions: [],
            Name: "Weather Station",
            DisplayName: "Weather Station",
            Description: "Weather station unavailable",
            DriverInfo: "N/A",
            DriverVersion: "N/A",
            DeviceId: "unknown"
          }
        });
      }
    });

    // Get NINA session data (image history + camera info + optional image)
    app.get('/api/nina/session', async (req, res) => {
      try {
        const includeImage = req.query.includeImage === 'true';
        const sessionData = await this.ninaService.getSessionData(includeImage);
        res.json(sessionData);
      } catch (error) {
        console.error('Error getting NINA session data:', error);
        res.status(500).json({ 
          error: 'Failed to get NINA session data',
          details: error.message 
        });
      }
    });

    // Get NINA image history
    app.get('/api/nina/image-history', async (req, res) => {
      try {
        const all = req.query.all === 'true';
        const imageType = req.query.imageType || 'LIGHT';
        const history = await this.ninaService.getImageHistory(all, imageType);
        res.json(history);
      } catch (error) {
        console.error('Error getting NINA image history:', error);
        res.status(500).json({ 
          error: 'Failed to get NINA image history',
          details: error.message 
        });
      }
    });

    // Get latest NINA image
    app.get('/api/nina/latest-image', async (req, res) => {
      try {
        const imageType = req.query.imageType || 'LIGHT';
        const history = await this.ninaService.getImageHistory(false, imageType);
        
        // Get the most recent image
        const latestImage = history && history.length > 0 ? history[0] : null;
        
        res.json({
          latestImage,
          timestamp: new Date().toISOString(),
          success: !!latestImage,
          message: latestImage ? 'Latest image retrieved' : 'No recent images found'
        });
      } catch (error) {
        console.error('Error getting latest NINA image:', error);
        res.status(500).json({ 
          error: 'Failed to get latest NINA image',
          details: error.message 
        });
      }
    });

    // Get NINA image by index
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

    // Get NINA camera info
    app.get('/api/nina/camera', async (req, res) => {
      try {
        const cameraInfo = await this.ninaService.getCameraInfo();
        res.json(cameraInfo);
      } catch (error) {
        console.error('Error getting NINA camera info:', error);
        res.status(500).json({ 
          error: 'Failed to get NINA camera info',
          details: error.message 
        });
      }
    });

    // Get NINA event history
    app.get('/api/nina/event-history', async (req, res) => {
      try {
        console.log('📡 NINA Event History Request: /v2/api/event-history');
        const eventHistory = await this.ninaService.getEventHistory();
        res.json(eventHistory);
      } catch (error) {
        console.error('❌ Error getting NINA event history:', error.message);
        res.status(500).json({ 
          error: 'Failed to get NINA event history',
          details: error.message,
          Success: false,
          Response: []
        });
      }
    });

    // Get current session state
    app.get('/api/nina/session-state', async (req, res) => {
      try {
        const sessionState = this.sessionStateManager.getSessionState();
        res.json({
          Success: true,
          Response: sessionState,
          Error: '',
          StatusCode: 200,
          Type: 'API'
        });
      } catch (error) {
        console.error('❌ Error getting session state:', error.message);
        res.status(500).json({ 
          Success: false,
          Response: null,
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });

    // Refresh session state manually
    app.post('/api/nina/session-state/refresh', async (req, res) => {
      try {
        const sessionState = await this.sessionStateManager.refreshSessionState();
        res.json({
          Success: true,
          Response: sessionState,
          Error: '',
          StatusCode: 200,
          Type: 'API'
        });
      } catch (error) {
        console.error('❌ Error refreshing session state:', error.message);
        res.status(500).json({ 
          Success: false,
          Response: null,
          Error: error.message,
          StatusCode: 500,
          Type: 'API'
        });
      }
    });
  }

  // Dashboard widget management API routes
  registerDashboardRoutes(app) {
    // Dashboard Widgets API (using ConfigDatabase)
    app.get('/api/dashboard-widgets', (req, res) => {
      try {
        const widgets = this.configDatabase.getWidgets();
        res.json(widgets);
      } catch (error) {
        console.error('Error getting widgets:', error);
        res.status(500).json({ error: 'Failed to get widgets' });
      }
    });

    app.post('/api/dashboard-widgets', (req, res) => {
      try {
        const widget = req.body;
        this.configDatabase.addWidget(widget);
        res.json({ success: true, id: widget.id });
      } catch (error) {
        console.error('Error adding widget:', error);
        res.status(500).json({ error: 'Failed to add widget' });
      }
    });

    // Bulk widget layout update for drag-and-drop operations (MUST be before /:id route)
    app.put('/api/dashboard-widgets/layout', (req, res) => {
      try {
        const { widgets } = req.body;
        
        if (!widgets || !Array.isArray(widgets)) {
          return res.status(400).json({ error: 'Invalid request: widgets array is required' });
        }
        
        // Update each widget's position
        for (const widget of widgets) {
          if (widget.layout && widget.id) {
            this.configDatabase.updateWidget(widget.id, {
              x: widget.layout.x,
              y: widget.layout.y,
              w: widget.layout.w,
              h: widget.layout.h
            });
          }
        }
        
        res.json({ success: true, message: 'Widget layout updated successfully' });
      } catch (error) {
        console.error('Error updating widget layout:', error);
        res.status(500).json({ error: 'Failed to update widget layout' });
      }
    });

    app.put('/api/dashboard-widgets/:id', (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body;
        
        // Validate and filter the updates to only include valid database columns
        const validUpdates = {};
        const allowedFields = ['component', 'title', 'x', 'y', 'w', 'h', 'minW', 'minH', 'enabled'];
        
        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            validUpdates[field] = updates[field];
          }
        }
        
        // Handle layout updates (if the updates contain a layout object)
        if (updates.layout) {
          if (updates.layout.x !== undefined) validUpdates.x = updates.layout.x;
          if (updates.layout.y !== undefined) validUpdates.y = updates.layout.y;
          if (updates.layout.w !== undefined) validUpdates.w = updates.layout.w;
          if (updates.layout.h !== undefined) validUpdates.h = updates.layout.h;
          if (updates.layout.minW !== undefined) validUpdates.minW = updates.layout.minW;
          if (updates.layout.minH !== undefined) validUpdates.minH = updates.layout.minH;
        }
        
        if (Object.keys(validUpdates).length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        this.configDatabase.updateWidget(id, validUpdates);
        res.json({ success: true });
      } catch (error) {
        console.error('Error updating widget:', error);
        res.status(500).json({ error: 'Failed to update widget' });
      }
    });

    app.delete('/api/dashboard-widgets/:id', (req, res) => {
      try {
        const id = req.params.id;
        this.configDatabase.removeWidget(id);
        res.json({ success: true });
      } catch (error) {
        console.error('Error removing widget:', error);
        res.status(500).json({ error: 'Failed to remove widget' });
      }
    });
  }
}

module.exports = APIRoutes;
