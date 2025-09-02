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

      const result = {
        ...response,
        Response: {
          ...response.Response,
          GuideSteps: guideSteps
        },
        timestamp: Date.now(),
        connected: guider.Connected || false,
        isGuiding: guider.IsGuiding || false
      };

      console.log(`✅ Guider graph data retrieved: ${guideSteps.length} steps, RMS: ${response.Response?.RMS?.TotalText || 'N/A'}`);
      return result;

    } catch (error) {
      console.warn('⚠️ NINA guider graph unavailable:', error.message);
      return null; // Return null instead of mock data
    }
  }
}

module.exports = NINAService;
