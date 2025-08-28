#!/usr/bin/env node

// Configuration API Server for SQLite-based configuration management
// This server provides REST API endpoints for the dashboard configuration

const express = require('express');
const cors = require('cors');
const { getConfigDatabase } = require('./configDatabase');
const widgets = require('./dashboardWidgets');

const app = express();
const PORT = process.env.CONFIG_API_PORT || 3001;

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
