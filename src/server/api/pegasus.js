/**
 * Pegasus Unity Platform API Proxy Endpoints
 * Proxies requests to Pegasus Unity Platform running on localhost:32000
 * Last Updated: December 15, 2025
 */

const express = require('express');
const router = express.Router();

/**
 * Check if Pegasus Unity Platform is running
 * GET /api/pegasus/status
 */
router.get('/status', async (req, res) => {
  try {
    const { ConfigDatabase } = require('../configDatabase');
    const configDb = new ConfigDatabase();
    const config = configDb.getConfig();
    
    const baseUrl = config['pegasus.unityBaseUrl'] || 'http://localhost:32000';
    
    const response = await fetch(`${baseUrl}/Server/DeviceManager/Connected`);
    
    if (!response.ok) {
      return res.json({
        available: false,
        error: `Pegasus Unity not responding (HTTP ${response.status})`
      });
    }
    
    const result = await response.json();
    
    res.json({
      available: result.status === 'success',
      connected: result.status === 'success',
      deviceCount: result.data?.length || 0,
      message: result.message
    });
  } catch (error) {
    res.json({
      available: false,
      connected: false,
      error: error.message || 'Failed to connect to Pegasus Unity Platform'
    });
  }
});

/**
 * Get list of connected Pegasus devices
 * GET /api/pegasus/devices
 */
router.get('/devices', async (req, res) => {
  try {
    const { ConfigDatabase } = require('../configDatabase');
    const configDb = new ConfigDatabase();
    const config = configDb.getConfig();
    
    const baseUrl = config['pegasus.unityBaseUrl'] || 'http://localhost:32000';
    
    const response = await fetch(`${baseUrl}/Server/DeviceManager/Connected`);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Pegasus Unity returned HTTP ${response.status}`
      });
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      return res.status(500).json({
        error: result.message || 'Failed to get connected devices'
      });
    }
    
    // Filter for power devices only
    const powerDeviceTypes = ['PPBAdvance', 'PPB', 'PPBMicro', 'UPBv3', 'UPBv2', 'SaddlePowerBox'];
    const powerDevices = result.data.filter(device => 
      powerDeviceTypes.includes(device.name)
    );
    
    res.json({
      status: 'success',
      devices: powerDevices,
      totalCount: powerDevices.length
    });
  } catch (error) {
    console.error('Error fetching Pegasus devices:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch devices'
    });
  }
});

/**
 * Get aggregate report for a specific device (all data)
 * GET /api/pegasus/report
 * Query params: deviceType, uniqueKey
 */
router.get('/report', async (req, res) => {
  try {
    const { deviceType, uniqueKey } = req.query;
    
    if (!deviceType || !uniqueKey) {
      return res.status(400).json({
        error: 'Missing required parameters: deviceType and uniqueKey'
      });
    }
    
    const { ConfigDatabase } = require('../configDatabase');
    const configDb = new ConfigDatabase();
    const config = configDb.getConfig();
    
    const baseUrl = config['pegasus.unityBaseUrl'] || 'http://localhost:32000';
    const url = `${baseUrl}/Driver/${deviceType}/Report?DriverUniqueKey=${uniqueKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch report: HTTP ${response.status}`
      });
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      return res.status(500).json({
        error: result.message || 'Failed to get power report'
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching Pegasus report:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch report'
    });
  }
});

/**
 * Get power metrics only (lighter payload)
 * GET /api/pegasus/power
 * Query params: deviceType, uniqueKey
 */
router.get('/power', async (req, res) => {
  try {
    const { deviceType, uniqueKey } = req.query;
    
    if (!deviceType || !uniqueKey) {
      return res.status(400).json({
        error: 'Missing required parameters: deviceType and uniqueKey'
      });
    }
    
    const { ConfigDatabase } = require('../configDatabase');
    const configDb = new ConfigDatabase();
    const config = configDb.getConfig();
    
    const baseUrl = config['pegasus.unityBaseUrl'] || 'http://localhost:32000';
    const url = `${baseUrl}/Driver/${deviceType}/Report/Power?DriverUniqueKey=${uniqueKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch power data: HTTP ${response.status}`
      });
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error fetching Pegasus power data:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch power data'
    });
  }
});

/**
 * Get power consumption metrics
 * GET /api/pegasus/consumption
 * Query params: deviceType, uniqueKey
 */
router.get('/consumption', async (req, res) => {
  try {
    const { deviceType, uniqueKey } = req.query;
    
    if (!deviceType || !uniqueKey) {
      return res.status(400).json({
        error: 'Missing required parameters: deviceType and uniqueKey'
      });
    }
    
    const { ConfigDatabase } = require('../configDatabase');
    const configDb = new ConfigDatabase();
    const config = configDb.getConfig();
    
    const baseUrl = config['pegasus.unityBaseUrl'] || 'http://localhost:32000';
    const url = `${baseUrl}/Driver/${deviceType}/Report/PowerConsumption?DriverUniqueKey=${uniqueKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch consumption data: HTTP ${response.status}`
      });
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error fetching Pegasus consumption data:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch consumption data'
    });
  }
});

/**
 * Get telemetry data for session monitoring
 * GET /api/pegasus/telemetry
 */
router.get('/telemetry', async (req, res) => {
  try {
    const { ConfigDatabase } = require('../configDatabase');
    const configDb = new ConfigDatabase();
    const config = configDb.getConfig();
    
    const baseUrl = config['pegasus.unityBaseUrl'] || 'http://localhost:32000';
    
    const response = await fetch(`${baseUrl}/Server/TelemetryDevices`);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch telemetry: HTTP ${response.status}`
      });
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error fetching Pegasus telemetry:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch telemetry'
    });
  }
});

module.exports = router;
