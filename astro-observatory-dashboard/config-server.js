#!/usr/bin/env node

// Configuration API Server for SQLite-based configuration management
// This server provides REST API endpoints for the dashboard configuration

const express = require('express');
const cors = require('cors');
const { getConfigDatabase } = require('./configDatabase');
const widgets = require('./dashboardWidgets');
const SystemMonitor = require('./systemMonitor');

const app = express();
const PORT = process.env.CONFIG_API_PORT || 3001;

// Initialize system monitor
const systemMonitor = new SystemMonitor();

// Middleware
app.use(cors());
app.use(express.json());

let configDb;

// Initialize database
try {
  configDb = getConfigDatabase('./dashboard-config.sqlite');
  console.log('✅ Configuration database initialized');
} catch (error) {
  console.error('❌ Failed to initialize configuration database:', error);
  process.exit(1);
}

// Health check endpoint
app.get('/api/config/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get entire configuration
app.get('/api/config', (req, res) => {
  try {
    const config = configDb.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Set entire configuration
app.put('/api/config', (req, res) => {
  try {
    configDb.setConfig(req.body);
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error setting configuration:', error);
    res.status(500).json({ error: 'Failed to set configuration' });
  }
});

// Export configuration to JSON
app.get('/api/config/export', (req, res) => {
  try {
    const config = configDb.getConfig();
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
    configDb.setConfig(req.body);
    res.json({ success: true, message: 'Configuration imported successfully' });
  } catch (error) {
    console.error('Error importing configuration:', error);
    res.status(500).json({ error: 'Failed to import configuration' });
  }
});

// Get database statistics
app.get('/api/config/stats', (req, res) => {
  try {
    const stats = configDb.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting database statistics:', error);
    res.status(500).json({ error: 'Failed to get database statistics' });
  }
});

// Dashboard Widgets API
app.get('/api/dashboard-widgets', (req, res) => {
  try {
    const all = widgets.getWidgets();
    res.json(all);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get widgets' });
  }
});

app.post('/api/dashboard-widgets', (req, res) => {
  try {
    const { type, config, position } = req.body;
    const result = widgets.addWidget(type, config, position);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add widget' });
  }
});

app.put('/api/dashboard-widgets', (req, res) => {
  try {
    const { widgetOrder } = req.body; // [{id, position}, ...]
    widgets.setWidgetOrder(widgetOrder);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update widget order' });
  }
});

app.patch('/api/dashboard-widgets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { config } = req.body;
    widgets.updateWidgetConfig(id, config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update widget config' });
  }
});

app.delete('/api/dashboard-widgets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    widgets.removeWidget(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove widget' });
  }
});

// System Monitor API Endpoints
app.get('/api/system/status', async (req, res) => {
  try {
    const status = await systemMonitor.getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

app.get('/api/system/uptime', async (req, res) => {
  try {
    const uptime = await systemMonitor.getUptimeInfo();
    res.json(uptime);
  } catch (error) {
    console.error('Error getting uptime:', error);
    res.status(500).json({ error: 'Failed to get uptime info' });
  }
});

app.get('/api/system/cpu', async (req, res) => {
  try {
    const cpu = await systemMonitor.getCPUInfo();
    res.json(cpu);
  } catch (error) {
    console.error('Error getting CPU info:', error);
    res.status(500).json({ error: 'Failed to get CPU info' });
  }
});

app.get('/api/system/memory', async (req, res) => {
  try {
    const memory = await systemMonitor.getMemoryInfo();
    res.json(memory);
  } catch (error) {
    console.error('Error getting memory info:', error);
    res.status(500).json({ error: 'Failed to get memory info' });
  }
});

app.get('/api/system/disk', async (req, res) => {
  try {
    const disk = await systemMonitor.getDiskInfo();
    res.json(disk);
  } catch (error) {
    console.error('Error getting disk info:', error);
    res.status(500).json({ error: 'Failed to get disk info' });
  }
});

app.get('/api/system/network', async (req, res) => {
  try {
    const network = await systemMonitor.getNetworkInfo();
    res.json(network);
  } catch (error) {
    console.error('Error getting network info:', error);
    res.status(500).json({ error: 'Failed to get network info' });
  }
});

// Target Scheduler API Endpoints
const { getTargetSchedulerDatabase } = require('./targetSchedulerService');

let targetSchedulerDb;

// Initialize Target Scheduler database
try {
  // Get the scheduler database path from configuration database
  const schedulerPath = configDb.getConfigValue('database.targetSchedulerPath', '../schedulerdb.sqlite');
  const resolvedPath = require('path').resolve(__dirname, schedulerPath);
  console.log(`🔍 Loading Target Scheduler from database config: ${schedulerPath}`);
  console.log(`🔍 Resolved Target Scheduler path: ${resolvedPath}`);
  targetSchedulerDb = getTargetSchedulerDatabase(resolvedPath);
  console.log('✅ Target Scheduler database initialized from database configuration');
} catch (error) {
  console.error('⚠️ Target Scheduler database not available:', error.message);
  targetSchedulerDb = null;
}

// Get scheduler progress overview
app.get('/api/scheduler/progress', async (req, res) => {
  try {
    if (!targetSchedulerDb) {
      return res.status(503).json({ error: 'Target Scheduler database not available' });
    }

    const projects = targetSchedulerDb.getProjectProgress();
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
    if (!targetSchedulerDb) {
      return res.status(503).json({ error: 'Target Scheduler database not available' });
    }

    const projectId = parseInt(req.params.id);
    const project = targetSchedulerDb.getProjectDetails(projectId);
    
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
    if (!targetSchedulerDb) {
      return res.status(503).json({ error: 'Target Scheduler database not available' });
    }

    const status = targetSchedulerDb.getSchedulerStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// Get recent imaging activity
app.get('/api/scheduler/activity', async (req, res) => {
  try {
    if (!targetSchedulerDb) {
      return res.status(503).json({ error: 'Target Scheduler database not available' });
    }

    const days = parseInt(req.query.days) || 7;
    const activity = targetSchedulerDb.getRecentActivity(days);
    res.json({ activity, days });
  } catch (error) {
    console.error('Error getting scheduler activity:', error);
    res.status(500).json({ error: 'Failed to get scheduler activity' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Configuration API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/config/health`);
  console.log(`⚙️  Configuration endpoint: http://localhost:${PORT}/api/config`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM signal, shutting down gracefully...');
  server.close(() => {
    if (configDb && configDb.close) {
      configDb.close();
    }
    console.log('✅ Configuration API server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT signal, shutting down gracefully...');
  server.close(() => {
    if (configDb && configDb.close) {
      configDb.close();
    }
    console.log('✅ Configuration API server closed');
    process.exit(0);
  });
});
