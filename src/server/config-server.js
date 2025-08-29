#!/usr/bin/env node

// Configuration API Server for SQLite-based configuration management
// This server provides REST API endpoints for the dashboard configuration

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { getConfigDatabase } = require('./configDatabase');
const SystemMonitor = require('../services/systemMonitor');
const NINAService = require('../services/ninaService');
const SessionStateManager = require('../services/sessionStateManager');

const app = express();
const server = http.createServer(app);
const PORT = process.env.CONFIG_API_PORT || 3001;

// Initialize system monitor and NINA service
const systemMonitor = new SystemMonitor();
const ninaService = new NINAService();
const sessionStateManager = new SessionStateManager(ninaService);

// Listen for session state updates and broadcast to connected clients
console.log('[DEBUG] Setting up sessionUpdate event listener');
sessionStateManager.on('sessionUpdate', (sessionState) => {
  console.log('[BACKEND] 📡 Broadcasting session update to', sessionClients.size, 'clients');
  const message = JSON.stringify({
    type: 'sessionUpdate',
    data: sessionState
  });
  
  // Broadcast to all connected WebSocket clients
  sessionClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});
console.log('[DEBUG] Event listener setup complete');

// WebSocket server for session state updates
const wss = new WebSocket.Server({ server });
const sessionClients = new Set();

// Handle WebSocket connections from frontend
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/ws/session') {
    console.log('🔌 Frontend session client connected');
    sessionClients.add(ws);
    
    // Send current session state immediately
    ws.send(JSON.stringify({
      type: 'sessionUpdate',
      data: sessionStateManager.getSessionState()
    }));
    
    ws.on('close', () => {
      console.log('❌ Frontend session client disconnected');
      sessionClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('❌ Frontend session WebSocket error:', error);
      sessionClients.delete(ws);
    });
  }
});

// Broadcast session updates to all connected frontend clients
sessionStateManager.on('sessionUpdate', (sessionState) => {
  const message = JSON.stringify({
    type: 'sessionUpdate',
    data: sessionState
  });
  
  sessionClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    } else {
      sessionClients.delete(client);
    }
  });
});

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

// Dashboard Widgets API (using ConfigDatabase)
app.get('/api/dashboard-widgets', (req, res) => {
  try {
    const widgets = configDb.getWidgets();
    res.json(widgets);
  } catch (error) {
    console.error('Error getting widgets:', error);
    res.status(500).json({ error: 'Failed to get widgets' });
  }
});

app.post('/api/dashboard-widgets', (req, res) => {
  try {
    const widget = req.body;
    configDb.addWidget(widget);
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
        configDb.updateWidget(widget.id, {
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
    
    configDb.updateWidget(id, validUpdates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating widget:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

app.delete('/api/dashboard-widgets/:id', (req, res) => {
  try {
    const id = req.params.id;
    configDb.removeWidget(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing widget:', error);
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

// NINA API Endpoints
// Equipment status and NINA system information

// Get NINA equipment status
app.get('/api/nina/equipment', async (req, res) => {
  try {
    const equipmentStatus = await ninaService.getEquipmentStatus();
    res.json(equipmentStatus);
  } catch (error) {
    console.error('Error getting NINA equipment status:', error);
    res.status(500).json({ 
      error: 'Failed to get NINA equipment status',
      details: error.message,
      mockMode: true,
      equipment: await ninaService.getMockEquipmentStatus()
    });
  }
});

// Get NINA connection status
app.get('/api/nina/status', async (req, res) => {
  try {
    const status = await ninaService.getConnectionStatus();
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

// Get NINA session data (image history + camera info + optional image)
app.get('/api/nina/session', async (req, res) => {
  try {
    const includeImage = req.query.includeImage === 'true';
    const sessionData = await ninaService.getSessionData(includeImage);
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
    const history = await ninaService.getImageHistory(all, imageType);
    res.json(history);
  } catch (error) {
    console.error('Error getting NINA image history:', error);
    res.status(500).json({ 
      error: 'Failed to get NINA image history',
      details: error.message 
    });
  }
});

// Get NINA camera info
app.get('/api/nina/camera', async (req, res) => {
  try {
    const cameraInfo = await ninaService.getCameraInfo();
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
    const eventHistory = await ninaService.getEventHistory();
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
    const sessionState = sessionStateManager.getSessionState();
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
    const sessionState = await sessionStateManager.refreshSessionState();
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

// Target Scheduler API Endpoints
const { getTargetSchedulerDatabase } = require('../services/targetSchedulerService');

let targetSchedulerDb;

// Initialize Target Scheduler database
try {
  // Get the scheduler database path from configuration database
  const schedulerPath = configDb.getConfigValue('database.targetSchedulerPath', '../../resources/schedulerdb.sqlite');
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
server.listen(PORT, () => {
  console.log(`🚀 Configuration API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/config/health`);
  console.log(`⚙️  Configuration endpoint: http://localhost:${PORT}/api/config`);
  console.log(`📡 Session WebSocket available at ws://localhost:${PORT}/ws/session`);
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
