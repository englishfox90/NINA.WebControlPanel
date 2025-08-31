// System monitoring API routes
const express = require('express');

class SystemRoutes {
  constructor(systemMonitor) {
    this.systemMonitor = systemMonitor;
  }

  register(app) {
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

    // CPU information
    app.get('/api/system/cpu', async (req, res) => {
      try {
        const cpu = await this.systemMonitor.getCPUInfo();
        res.json(cpu);
      } catch (error) {
        console.error('Error getting CPU info:', error);
        res.status(500).json({ error: 'Failed to get CPU information' });
      }
    });

    // Memory information
    app.get('/api/system/memory', async (req, res) => {
      try {
        const memory = await this.systemMonitor.getMemoryInfo();
        res.json(memory);
      } catch (error) {
        console.error('Error getting memory info:', error);
        res.status(500).json({ error: 'Failed to get memory information' });
      }
    });

    // Disk information
    app.get('/api/system/disk', async (req, res) => {
      try {
        const disk = await this.systemMonitor.getDiskInfo();
        res.json(disk);
      } catch (error) {
        console.error('Error getting disk info:', error);
        res.status(500).json({ error: 'Failed to get disk information' });
      }
    });

    // Network information
    app.get('/api/system/network', async (req, res) => {
      try {
        const network = await this.systemMonitor.getNetworkInfo();
        res.json(network);
      } catch (error) {
        console.error('Error getting network info:', error);
        res.status(500).json({ error: 'Failed to get network information' });
      }
    });

    // Uptime information
    app.get('/api/system/uptime', async (req, res) => {
      try {
        const uptime = await this.systemMonitor.getUptimeInfo();
        res.json(uptime);
      } catch (error) {
        console.error('Error getting uptime info:', error);
        res.status(500).json({ error: 'Failed to get uptime information' });
      }
    });
  }
}

module.exports = SystemRoutes;
