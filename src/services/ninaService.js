// NINA API Service for backend integration
// Handles communication with NINA Advanced API for equipment status

const axios = require('axios');
const { getConfigDatabase } = require('../server/configDatabase');

class NINAService {
  constructor() {
    this.configDb = getConfigDatabase();
    this.updateConfig();
  }

  updateConfig() {
    const config = this.configDb.getConfig();
    this.baseUrl = config.nina.baseUrl;
    this.port = config.nina.apiPort;
    this.timeout = config.nina.timeout || 5000;
    this.retryAttempts = config.nina.retryAttempts || 3;
    
    // Ensure baseUrl ends with port if specified
    this.fullUrl = `${this.baseUrl.replace(/\/$/, '')}:${this.port}`;
    
    console.log(`🔭 NINA Service configured: ${this.fullUrl}`);
  }

  async makeRequest(endpoint, retries = this.retryAttempts) {
    try {
      const url = `${this.fullUrl}/v2/api${endpoint}`;
      console.log(`📡 NINA API Request: ${url}`);
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
        console.warn(`⚠️ NINA API retry (${retries} attempts remaining): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.makeRequest(endpoint, retries - 1);
      }
      
      console.error(`❌ NINA API Error (${endpoint}):`, error.message);
      throw new Error(`NINA API Error: ${error.message}`);
    }
  }

  async getEquipmentStatus() {
    try {
      // Get status from multiple NINA API endpoints
      const [
        cameraStatus,
        filterWheelStatus,
        focuserStatus,
        rotatorStatus,
        mountStatus, 
        guiderStatus,
        switchStatus,
        flatPanelStatus,
        weatherStatus,
        domeStatus,
        safetyMonitorStatus
      ] = await Promise.allSettled([
        this.makeRequest('/equipment/camera/info'),
        this.makeRequest('/equipment/filterwheel/info'),
        this.makeRequest('/equipment/focuser/info'),
        this.makeRequest('/equipment/rotator/info'),
        this.makeRequest('/equipment/mount/info'), // Fixed: was /equipment/telescope/info
        this.makeRequest('/equipment/guider/info'),
        this.makeRequest('/equipment/switch/info'),
        this.makeRequest('/equipment/flatdevice/info'),
        this.makeRequest('/equipment/weather/info'),
        this.makeRequest('/equipment/dome/info'),
        this.makeRequest('/equipment/safetymonitor/info')
      ]);

      // Process equipment data in the specified order
      const equipment = [];
      
      // 1. Camera
      if (cameraStatus.status === 'fulfilled' && cameraStatus.value && cameraStatus.value.Success) {
        const camera = cameraStatus.value.Response;
        equipment.push({
          name: 'Camera',
          deviceName: camera.Name || camera.DisplayName || 'Unknown Camera',
          connected: camera.Connected || false,
          status: camera.Connected ? 
            (camera.Temperature ? `${camera.Temperature.toFixed(1)}°C` : 'Ready') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Camera',
          deviceName: 'Unknown Camera',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 2. Filter Wheel
      if (filterWheelStatus.status === 'fulfilled' && filterWheelStatus.value && filterWheelStatus.value.Success) {
        const filterWheel = filterWheelStatus.value.Response;
        const currentFilter = filterWheel.SelectedFilter;
        equipment.push({
          name: 'Filter Wheel',
          deviceName: filterWheel.Name || filterWheel.DisplayName || 'Unknown Filter Wheel',
          connected: filterWheel.Connected || false,
          status: filterWheel.Connected ? 
            (currentFilter ? `Position ${filterWheel.Position} (${currentFilter})` : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Filter Wheel',
          deviceName: 'Unknown Filter Wheel',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 3. Focuser
      if (focuserStatus.status === 'fulfilled' && focuserStatus.value && focuserStatus.value.Success) {
        const focuser = focuserStatus.value.Response;
        equipment.push({
          name: 'Focuser',
          deviceName: focuser.Name || focuser.DisplayName || 'Unknown Focuser',
          connected: focuser.Connected || false,
          status: focuser.Connected ? 
            (focuser.Position !== undefined ? `Position ${focuser.Position}` : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Focuser',
          deviceName: 'Unknown Focuser', 
          connected: false,
          status: 'Disconnected'
        });
      }

      // 4. Rotator
      if (rotatorStatus.status === 'fulfilled' && rotatorStatus.value && rotatorStatus.value.Success) {
        const rotator = rotatorStatus.value.Response;
        equipment.push({
          name: 'Rotator',
          deviceName: rotator.Name || rotator.DisplayName || 'Unknown Rotator',
          connected: rotator.Connected || false,
          status: rotator.Connected ? 
            (rotator.Position !== undefined ? `${rotator.Position.toFixed(1)}°` : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Rotator',
          deviceName: 'Unknown Rotator',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 5. Mount
      if (mountStatus.status === 'fulfilled' && mountStatus.value && mountStatus.value.Success) {
        const mount = mountStatus.value.Response;
        equipment.push({
          name: 'Mount',
          deviceName: mount.Name || mount.DisplayName || 'Unknown Mount',
          connected: mount.Connected || false,
          status: mount.Connected ? 
            (mount.TrackingEnabled ? 'Tracking' : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Mount', 
          deviceName: 'Unknown Mount',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 6. Guider
      if (guiderStatus.status === 'fulfilled' && guiderStatus.value && guiderStatus.value.Success) {
        const guider = guiderStatus.value.Response;
        equipment.push({
          name: 'Guider',
          deviceName: guider.Name || guider.DisplayName || 'Unknown Guider',
          connected: guider.Connected || false,
          status: guider.Connected ? 
            (guider.IsGuiding ? 'Guiding' : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Guider',
          deviceName: 'Unknown Guider',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 7. Switch
      if (switchStatus.status === 'fulfilled' && switchStatus.value && switchStatus.value.Success) {
        const switchDevice = switchStatus.value.Response;
        equipment.push({
          name: 'Switch',
          deviceName: switchDevice.Name || switchDevice.DisplayName || 'Unknown Switch',
          connected: switchDevice.Connected || false,
          status: switchDevice.Connected ? 'Connected' : 'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Switch',
          deviceName: 'Unknown Switch',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 8. Flat Panel
      if (flatPanelStatus.status === 'fulfilled' && flatPanelStatus.value && flatPanelStatus.value.Success) {
        const flatPanel = flatPanelStatus.value.Response;
        equipment.push({
          name: 'Flat Panel',
          deviceName: flatPanel.Name || flatPanel.DisplayName || 'Unknown Flat Panel',
          connected: flatPanel.Connected || false,
          status: flatPanel.Connected ? 
            (flatPanel.Brightness !== undefined ? `Brightness ${flatPanel.Brightness}%` : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Flat Panel',
          deviceName: 'Unknown Flat Panel',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 9. Weather
      if (weatherStatus.status === 'fulfilled' && weatherStatus.value && weatherStatus.value.Success) {
        const weather = weatherStatus.value.Response;
        equipment.push({
          name: 'Weather',
          deviceName: weather.Name || weather.DisplayName || 'Weather Station',
          connected: weather.Connected || false,
          status: weather.Connected ? 
            (weather.CloudCover !== undefined ? `${weather.CloudCover}% clouds` : 'Monitoring') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Weather',
          deviceName: 'Weather Station',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 10. Dome
      if (domeStatus.status === 'fulfilled' && domeStatus.value && domeStatus.value.Success) {
        const dome = domeStatus.value.Response;
        equipment.push({
          name: 'Dome',
          deviceName: dome.Name || dome.DisplayName || 'Unknown Dome',
          connected: dome.Connected || false,
          status: dome.Connected ? 
            (dome.Azimuth !== undefined && dome.Azimuth !== "NaN" ? `Azimuth ${parseFloat(dome.Azimuth).toFixed(1)}°` : 'Connected') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Dome',
          deviceName: 'Unknown Dome',
          connected: false,
          status: 'Disconnected'
        });
      }

      // 11. Safety Monitor
      if (safetyMonitorStatus.status === 'fulfilled' && safetyMonitorStatus.value && safetyMonitorStatus.value.Success) {
        const safetyMonitor = safetyMonitorStatus.value.Response;
        equipment.push({
          name: 'Safety Monitor',
          deviceName: safetyMonitor.Name || safetyMonitor.DisplayName || 'Safety Monitor',
          connected: safetyMonitor.Connected || false,
          status: safetyMonitor.Connected ? 
            (safetyMonitor.IsSafe !== undefined ? (safetyMonitor.IsSafe ? 'Safe' : 'Unsafe') : 'Monitoring') : 
            'Disconnected'
        });
      } else {
        equipment.push({
          name: 'Safety Monitor',
          deviceName: 'Safety Monitor',
          connected: false,
          status: 'Disconnected'
        });
      }

      // Determine overall status
      const connectedCount = equipment.filter(e => e.connected).length;
      const totalCount = equipment.length;
      const allConnected = connectedCount === totalCount;
      
      return {
        equipment,
        summary: {
          connected: connectedCount,
          total: totalCount,
          allConnected,
          status: allConnected ? 'All Systems Go' : `${connectedCount}/${totalCount} Connected`
        },
        lastUpdate: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting NINA equipment status:', error);
      
      // Return mock data when NINA is unavailable (development mode)
      return this.getMockEquipmentStatus();
    }
  }

  getMockEquipmentStatus() {
    console.log('🚧 Using mock NINA equipment data (NINA not available)');
    
    return {
      equipment: [
        {
          name: 'Camera',
          deviceName: 'ZWO ASI2600MM Pro',
          connected: true,
          status: 'Ready'
        },
        {
          name: 'Filter Wheel',
          deviceName: 'ZWO EFW 8x1.25"',
          connected: true,
          status: 'Position 2 (Red)'
        },
        {
          name: 'Focuser',
          deviceName: 'ZWO EAF',
          connected: true,
          status: 'Position 12,543'
        },
        {
          name: 'Rotator',
          deviceName: 'ZWO EAR',
          connected: true,
          status: '45.2°'
        },
        {
          name: 'Mount',
          deviceName: 'Sky-Watcher EQ6-R Pro',
          connected: true,
          status: 'Tracking'
        },
        {
          name: 'Guider',
          deviceName: 'ZWO ASI120MM Mini',
          connected: true,
          status: 'Guiding'
        },
        {
          name: 'Switch',
          deviceName: 'Pegasus Astro Ultimate Powerbox',
          connected: true,
          status: 'Connected'
        },
        {
          name: 'Flat Panel',
          deviceName: 'Alnitak Flat-Man XL',
          connected: true,
          status: 'Brightness 50%'
        },
        {
          name: 'Weather',
          deviceName: 'AAG CloudWatcher',
          connected: true,
          status: '15% clouds'
        },
        {
          name: 'Dome',
          deviceName: 'NexDome Evolution',
          connected: false,
          status: 'Disconnected'
        },
        {
          name: 'Safety Monitor',
          deviceName: 'Observatory Safety',
          connected: true,
          status: 'Safe'
        }
      ],
      summary: {
        connected: 10,
        total: 11,
        allConnected: false,
        status: '10/11 Connected'
      },
      lastUpdate: new Date().toISOString(),
      mockMode: true
    };
  }

  async getFlatPanelStatus() {
    try {
      const response = await this.makeRequest('/equipment/flatdevice/info');
      return response;
    } catch (error) {
      console.warn('⚠️ Flat panel not available, returning safe defaults:', error.message);
      // Return safe defaults when flat panel is not available
      return {
        Response: {
          CoverState: "Closed", // Default to safe state
          LocalizedCoverState: "Closed",
          LocalizedLightOnState: "Off",
          LightOn: false, // Default to safe state
          Brightness: 0,
          SupportsOpenClose: false,
          MinBrightness: 0,
          MaxBrightness: 100,
          SupportsOnOff: true,
          SupportedActions: [],
          Connected: false,
          Name: "Flat Panel",
          DisplayName: "Flat Panel Device",
          Description: "ASCOM Flat Panel Device",
          DriverInfo: "Not Connected",
          DriverVersion: "N/A",
          DeviceId: "flatdevice"
        },
        Error: null,
        StatusCode: 200,
        Success: true,
        Type: "FlatDeviceResponse"
      };
    }
  }

  async getWeatherStatus() {
    try {
      const response = await this.makeRequest('/equipment/weather/info');
      return response;
    } catch (error) {
      console.warn('⚠️ Weather station not available, returning safe defaults:', error.message);
      // Return safe defaults when weather station is not available
      return {
        Response: {
          AveragePeriod: 0,
          CloudCover: 0,
          DewPoint: 0.0,
          Humidity: 0,
          Pressure: 1013,
          RainRate: "0",
          SkyBrightness: "Unknown",
          SkyQuality: "Unknown", 
          SkyTemperature: "Unknown",
          StarFWHM: "Unknown",
          Temperature: 0.0,
          WindDirection: 0,
          WindGust: "0",
          WindSpeed: 0.0,
          SupportedActions: [],
          Connected: false,
          Name: "Weather Station",
          DisplayName: "NINA Weather Station",
          Description: "ASCOM Weather Station Device",
          DriverInfo: "Not Connected",
          DriverVersion: "N/A",
          DeviceId: "weather"
        },
        Error: null,
        StatusCode: 200,
        Success: true,
        Type: "WeatherResponse"
      };
    }
  }

  async getConnectionStatus() {
    try {
      const response = await this.makeRequest('/application-start');
      if (response && response.Success) {
        return { 
          connected: true, 
          message: 'NINA API accessible',
          applicationStart: response.Response
        };
      } else {
        return { 
          connected: false, 
          message: 'NINA API returned invalid response'
        };
      }
    } catch (error) {
      return { 
        connected: false, 
        message: error.message
        // Note: No mockMode flag here - this is just a connection failure
      };
    }
  }

  // Get image history from NINA
  async getImageHistory(all = false, imageType = 'LIGHT') {
    try {
      const endpoint = `/image-history?all=${all}&imageType=${imageType}`;
      const response = await this.makeRequest(endpoint);
      return response;
    } catch (error) {
      console.warn('⚠️ Using mock image history data');
      return {
        Response: [
          {
            ExposureTime: 180,
            ImageType: 'LIGHT',
            Filter: 'Lum',
            RmsText: '0.15',
            Temperature: -10.2,
            CameraName: 'ZWO ASI585MM Pro',
            Gain: 139,
            Offset: 30,
            Date: new Date().toISOString(),
            TelescopeName: 'Mock Telescope',
            FocalLength: 600,
            StDev: 123.4,
            Mean: 1234.5,
            Median: 1200.0,
            Stars: 1247,
            HFR: 2.8,
            IsBayered: false
          }
        ],
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API'
      };
    }
  }

  // Get camera info from NINA
  async getCameraInfo() {
    try {
      const response = await this.makeRequest('/equipment/camera/info');
      return response;
    } catch (error) {
      console.warn('⚠️ Using mock camera data');
      return {
        Response: {
          Connected: true,
          Name: 'ZWO ASI585MM Pro',
          Temperature: -10.2,
          TargetTemp: -10.0,
          Gain: 139,
          Offset: 30,
          CoolerOn: true,
          CoolerPower: 85,
          CameraState: 'Ready',
          IsExposing: false,
          ExposureEndTime: ''
        },
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API'
      };
    }
  }

  // Get NINA event history
  async getEventHistory() {
    try {
      const response = await this.makeRequest('/event-history');
      
      if (response.Success && Array.isArray(response.Response)) {
        console.log(`✅ Successfully fetched NINA event history: ${response.Response.length} events`);
        return response;
      }
      
      throw new Error('Invalid event history response');
    } catch (error) {
      console.warn('⚠️ Using mock event history data');
      return {
        Response: [],
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API'
      };
    }
  }

  // Get image data with base64 encoded image
  async getImageByIndex(index = 0, options = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Set default options for web display
      if (options.resize !== undefined) params.append('resize', options.resize);
      if (options.quality !== undefined) params.append('quality', options.quality);
      if (options.size) params.append('size', options.size);
      if (options.scale !== undefined) params.append('scale', options.scale);
      if (options.factor !== undefined) params.append('factor', options.factor);
      if (options.blackClipping !== undefined) params.append('blackClipping', options.blackClipping);
      if (options.unlinked !== undefined) params.append('unlinked', options.unlinked);
      if (options.stream !== undefined) params.append('stream', options.stream);
      if (options.debayer !== undefined) params.append('debayer', options.debayer);
      if (options.bayerPattern) params.append('bayerPattern', options.bayerPattern);
      if (options.autoPrepare !== undefined) params.append('autoPrepare', options.autoPrepare);
      if (options.imageType) params.append('imageType', options.imageType);
      if (options.raw_fits !== undefined) params.append('raw_fits', options.raw_fits);
      
      const queryString = params.toString();
      const endpoint = `/image/${index}${queryString ? '?' + queryString : ''}`;
      
      console.log(`📸 Fetching image by index: ${endpoint}`);
      
      const response = await this.makeRequest(endpoint);
      
      if (response && response.Success && response.Response) {
        console.log('✅ Successfully fetched image data');
        return response;
      } else {
        console.warn('⚠️ Image API returned unsuccessful response:', response);
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch image data:', error.message);
      return null;
    }
  }

  // Get complete session data (history + camera + optional image)
  async getSessionData(includeImage = false) {
    try {
      // Get image history and camera info in parallel
      const [historyResponse, cameraResponse] = await Promise.all([
        this.getImageHistory(false, 'LIGHT'),
        this.getCameraInfo()
      ]);

      const result = {
        imageHistory: historyResponse,
        cameraInfo: cameraResponse,
        image: null,
        timestamp: new Date().toISOString()
      };

      // If image is requested and we have history, try to get the latest image (index 0)
      if (includeImage && historyResponse.Success && historyResponse.Response.length > 0) {
        // Get the most recent image (index 0) with web-friendly options
        const imageOptions = {
          resize: true,
          quality: 85,
          size: '800x600', // Reasonable size for web display
          autoPrepare: true, // Let NINA handle all processing
          imageType: 'LIGHT' // Match the filter we used for history
        };
        
        result.image = await this.getImageByIndex(0, imageOptions);
      }

      return {
        Response: result,
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API'
      };
    } catch (error) {
      console.error('Error getting session data:', error);
      throw new Error(`Failed to get session data: ${error.message}`);
    }
  }

  async getGuiderGraph() {
    try {
      console.log('🎯 Fetching NINA guider graph data...');
      
      // Get guider graph data from NINA API
      const response = await this.makeRequest('/equipment/guider/graph');
      
      // Validate response
      if (!response || !response.Success) {
        throw new Error(response?.Error || 'Failed to fetch guider graph data');
      }

      // Get guider status for connection info
      const guiderStatus = await this.makeRequest('/equipment/guider/info');
      const guider = guiderStatus?.Response || {};

      // Process guide steps with step numbers (no timestamps)
      const guideSteps = (response.Response?.GuideSteps || []).map((step, index) => ({
        ...step,
        stepNumber: index + 1 // Use step number instead of timestamp
      }));

      // Determine if guiding is actively happening
      const hasRecentSteps = guideSteps.length > 0;
      const hasValidRMS = response.Response?.RMS?.Total > 0;
      const isGuidingActive = guider.IsGuiding || (hasRecentSteps && hasValidRMS);

      const result = {
        ...response,
        Response: {
          ...response.Response,
          GuideSteps: guideSteps
        },
        timestamp: Date.now(),
        connected: guider.Connected || false,
        isGuiding: isGuidingActive
      };

      const stepCount = guideSteps.length;
      const rmsText = response.Response?.RMS?.TotalText || 'N/A';
      console.log(`✅ Guider graph data retrieved: ${stepCount} steps, RMS: ${rmsText}, Active: ${isGuidingActive}`);
      return result;

    } catch (error) {
      console.warn('⚠️ NINA guider graph unavailable:', error.message);
      return null; // Return null instead of mock data
    }
  }

  // Get latest image using prepared-image endpoint with web-friendly options
  async getLatestImage(options = {}) {
    try {
      // Default options optimized for web display
      const defaultOptions = {
        resize: true,
        size: '800x600',
        autoPrepare: true,
        quality: 85
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      console.log('📸 Fetching latest image with options:', finalOptions);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (finalOptions.resize !== undefined) params.append('resize', finalOptions.resize);
      if (finalOptions.size) params.append('size', finalOptions.size);
      if (finalOptions.autoPrepare !== undefined) params.append('autoPrepare', finalOptions.autoPrepare);
      if (finalOptions.quality !== undefined) params.append('quality', finalOptions.quality);
      if (finalOptions.scale !== undefined) params.append('scale', finalOptions.scale);
      if (finalOptions.blackClipping !== undefined) params.append('blackClipping', finalOptions.blackClipping);
      if (finalOptions.unlinked !== undefined) params.append('unlinked', finalOptions.unlinked);
      if (finalOptions.debayer !== undefined) params.append('debayer', finalOptions.debayer);
      if (finalOptions.bayerPattern) params.append('bayerPattern', finalOptions.bayerPattern);
      
      const queryString = params.toString();
      const endpoint = `/prepared-image${queryString ? '?' + queryString : ''}`;
      
      console.log(`📸 Fetching prepared image: ${endpoint}`);
      
      const response = await this.makeRequest(endpoint);
      
      if (response && response.Success) {
        console.log('✅ Successfully fetched latest image');
        return {
          Response: response.Response,
          Success: true,
          Error: '',
          StatusCode: 200,
          Type: 'API',
          timestamp: new Date().toISOString()
        };
      } else {
        console.warn('⚠️ Prepared image API returned unsuccessful response:', response);
        return {
          Response: null,
          Success: false,
          Error: response?.Error || 'No prepared image available',
          StatusCode: response?.StatusCode || 404,
          Type: 'API'
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch latest image:', error.message);
      return {
        Response: null,
        Success: false,
        Error: `Failed to fetch image: ${error.message}`,
        StatusCode: 500,
        Type: 'API'
      };
    }
  }

  // Check if image timestamp is relevant (within 30 minutes)
  isImageRelevant(timestamp) {
    try {
      const imageTime = new Date(timestamp);
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));
      
      const isRelevant = imageTime >= thirtyMinutesAgo;
      console.log(`🕐 Image relevance check: ${timestamp} -> ${isRelevant ? 'RELEVANT' : 'TOO OLD'}`);
      
      return isRelevant;
    } catch (error) {
      console.error('❌ Error checking image relevance:', error);
      return false;
    }
  }

  // Get image count from NINA
  async getImageHistoryCount(imageType = 'LIGHT') {
    try {
      const endpoint = `/image-history?count=true&imageType=${imageType}`;
      const response = await this.makeRequest(endpoint);
      
      if (response && response.Success && typeof response.Response === 'number') {
        console.log(`📊 NINA image count: ${response.Response}`);
        return response.Response;
      } else {
        console.warn('⚠️ Invalid image count response:', response);
        return 0;
      }
    } catch (error) {
      console.error('❌ Error getting image count:', error.message);
      return 0;
    }
  }

  // Get image metadata by index from NINA
  async getImageHistoryByIndex(index, imageType = 'LIGHT') {
    try {
      const endpoint = `/image-history?index=${index}&imageType=${imageType}`;
      const response = await this.makeRequest(endpoint);
      
      if (response && response.Success && response.Response) {
        // Response can be an array or single object - normalize to single object
        const imageData = Array.isArray(response.Response) ? response.Response[0] : response.Response;
        console.log(`📸 NINA image metadata [${index}]:`, {
          ExposureTime: imageData.ExposureTime,
          Filter: imageData.Filter,
          Stars: imageData.Stars,
          HFR: imageData.HFR
        });
        return imageData;
      } else {
        console.warn('⚠️ Invalid image metadata response:', response);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting image metadata for index ${index}:`, error.message);
      return null;
    }
  }

  // Get prepared image as array buffer from NINA
  async getPreparedImageArrayBuffer(options = {}) {
    try {
      const axios = require('axios');
      const params = new URLSearchParams({
        autoPrepare: 'true',
        ...options
      });
      
      const url = `${this.fullUrl}/v2/api/prepared-image?${params}`;
      console.log(`📸 Fetching prepared image from: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.timeout,
        headers: {
          'Accept': 'image/jpeg,image/png,image/*'
        }
      });
      
      const contentType = response.headers['content-type'] || 'image/jpeg';
      console.log(`📸 Prepared image received: ${response.data.length} bytes, type: ${contentType}`);
      
      return {
        bytes: response.data,
        contentType: contentType
      };
    } catch (error) {
      console.error('❌ Error getting prepared image:', error.message);
      console.error('❌ Error details:', {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      throw error;
    }
  }

  // Get NINA application logs
  async getNINALogs(lineCount = 25) {
    try {
      const endpoint = `/application/logs?lineCount=${lineCount}`;
      console.log(`📋 Fetching NINA logs: ${lineCount} lines`);
      
      const response = await this.makeRequest(endpoint);
      
      if (response && response.Success && Array.isArray(response.Response)) {
        console.log(`✅ Successfully fetched ${response.Response.length} NINA log entries`);
        return {
          ...response,
          timestamp: new Date().toISOString(),
          lineCount: response.Response.length
        };
      } else {
        console.warn('⚠️ Invalid logs response:', response);
        return {
          Response: [],
          Success: false,
          Error: 'Invalid logs response',
          StatusCode: response?.StatusCode || 500,
          Type: 'API',
          timestamp: new Date().toISOString(),
          lineCount: 0
        };
      }
    } catch (error) {
      console.error('❌ Error getting NINA logs:', error.message);
      
      // Return mock logs for development
      return {
        Response: [
          {
            Line: "142",
            Source: "WebSocketV2.cs",
            Member: "OnClientConnectedAsync",
            Message: "Mock WebSocket connected [::1]:12345",
            Level: "INFO",
            Timestamp: new Date().toISOString()
          },
          {
            Line: "742",
            Source: "CameraVM.cs",
            Member: "Capture",
            Message: "Mock Starting Exposure - Exposure Time: 300s; Filter: OIII; Gain: 200; Offset 1; Binning: 1x1;",
            Level: "INFO",
            Timestamp: new Date(Date.now() - 30000).toISOString()
          }
        ],
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API',
        timestamp: new Date().toISOString(),
        lineCount: 2,
        mockMode: true
      };
    }
  }

  // LiveStack methods
  async getLiveStackOptions() {
    try {
      console.log('📸 Fetching LiveStack available options...');
      const response = await this.makeRequest('/v2/api/livestack/image/available');
      console.log(`✅ LiveStack options: ${response.Response?.length || 0} combinations`);
      return response;
    } catch (error) {
      console.error('❌ LiveStack options error:', error.message);
      
      // Mock data for development
      return {
        Response: [
          { Filter: "RGB", Target: "M 42 Panel 1" },
          { Filter: "L", Target: "M 42 Panel 1" },
          { Filter: "Red", Target: "M 42 Panel 1" },
          { Filter: "Green", Target: "M 42 Panel 1" },
          { Filter: "Blue", Target: "M 42 Panel 1" },
          { Filter: "OIII", Target: "Bubble Nebula" },
          { Filter: "Ha", Target: "Bubble Nebula" },
          { Filter: "RGB", Target: "Lobster Claw Nebula" },
          { Filter: "OIII", Target: "Lobster Claw Nebula" }
        ],
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API',
        mockMode: true
      };
    }
  }

  async getLiveStackInfo(target, filter) {
    try {
      console.log(`📸 Fetching LiveStack info: ${target} - ${filter}`);
      const encodedTarget = encodeURIComponent(target);
      const encodedFilter = encodeURIComponent(filter);
      const response = await this.makeRequest(`/v2/api/livestack/image/${encodedTarget}/${encodedFilter}/info`);
      console.log(`✅ LiveStack info: ${response.Response?.Filter} (${response.Response?.IsMonochrome ? 'Mono' : 'RGB'})`);
      return response;
    } catch (error) {
      console.error('❌ LiveStack info error:', error.message);
      
      // Mock data for development
      const isRGB = filter.toUpperCase() === 'RGB';
      return {
        Response: isRGB ? {
          IsMonochrome: false,
          RedStackCount: 16,
          GreenStackCount: 23,
          BlueStackCount: 30,
          Filter: filter,
          Target: target
        } : {
          IsMonochrome: true,
          StackCount: 25,
          Filter: filter,
          Target: target
        },
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API',
        mockMode: true
      };
    }
  }

  async getLiveStackImage(target, filter) {
    try {
      console.log(`📸 Fetching LiveStack image: ${target} - ${filter}`);
      const encodedTarget = encodeURIComponent(target);
      const encodedFilter = encodeURIComponent(filter);
      const response = await this.makeRequest(`/v2/api/livestack/image/${encodedTarget}/${encodedFilter}?resize=true&scale=0.25`);
      console.log(`✅ LiveStack image: ${response.Response?.length > 0 ? 'loaded' : 'empty'}`);
      return response;
    } catch (error) {
      console.error('❌ LiveStack image error:', error.message);
      
      // Mock data - return a small placeholder base64 image
      const mockImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAwj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      
      return {
        Response: mockImageBase64,
        Success: true,
        Error: '',
        StatusCode: 200,
        Type: 'API',
        mockMode: true
      };
    }
  }

  async getLiveStackImageStream(target, filter) {
    try {
      console.log(`📸 Fetching LiveStack image stream: ${target} - ${filter}`);
      const encodedTarget = encodeURIComponent(target);
      const encodedFilter = encodeURIComponent(filter);
      const url = `${this.fullUrl}/v2/api/livestack/image/${encodedTarget}/${encodedFilter}?resize=true&scale=0.25&stream=true`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/png, image/jpeg, */*'
        }
      });
      
      console.log(`✅ LiveStack image stream: ${response.data.length} bytes`);
      return {
        Success: true,
        imageBuffer: Buffer.from(response.data),
        Error: '',
        StatusCode: 200,
        Type: 'API'
      };
    } catch (error) {
      console.error('❌ LiveStack image stream error:', error.message);
      
      // Create a simple mock PNG image (64x64 gray square)
      const mockPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
        0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40, // 64x64 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x25, 0x0B, 0xE6, // bit depth, color type, etc.
        0x89, 0x00, 0x00, 0x00, 0x09, 0x70, 0x48, 0x59, // End of IHDR
        0x73, 0x00, 0x00, 0x0B, 0x13, 0x00, 0x00, 0x0B, // pHYs chunk
        0x13, 0x01, 0x00, 0x9A, 0x9C, 0x18, 0x00, 0x00, // End of pHYs
        0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, // IDAT chunk start
        0x63, 0x60, 0x18, 0x05, 0x00, 0x00, 0x10, 0x00, // Minimal image data
        0x01, 0x8D, 0xB0, 0x8D, 0xB0, 0x00, 0x00, 0x00, // End of IDAT
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
      ]);
      
      return {
        Success: true,
        imageBuffer: mockPNG,
        Error: '',
        StatusCode: 200,
        Type: 'API',
        mockMode: true
      };
    }
  }
}

module.exports = NINAService;
