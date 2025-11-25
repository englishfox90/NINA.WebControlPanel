// Clean Configuration API Server using API Routes
// Organized structure that stays under 500 lines as requested

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

// Import organized components
const APIRoutes = require('./api');
const { getConfigDatabase } = require('./configDatabase');
const SystemMonitor = require('../services/systemMonitor');
const NINAService = require('../services/ninaService');
const AstronomicalService = require('../services/astronomicalService');
const UnifiedStateSystem = require('../services/unifiedState');

// Enhanced error handling setup
process.on('uncaughtException', (error) => {
  console.error('🚨 CRITICAL: Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  console.log('⚠️ Attempting graceful recovery...');
  
  setTimeout(() => {
    console.error('💀 Exiting due to uncaught exception');
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 CRITICAL: Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  
  console.log('⚠️ Continuing execution after unhandled rejection');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT signal, shutting down gracefully...');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM signal, shutting down gracefully...');
  gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    if (server) {
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }
    
    // Shutdown unified state system
    if (global.unifiedStateSystem) {
      console.log('🛑 Stopping unified state system...');
      global.unifiedStateSystem.stop();
    }

    
    console.log('✅ Configuration API server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

async function initializeServer() {
  console.log('🔧 Initializing services...');
  
  // Initialize database
  const configDatabase = await getConfigDatabase();
  
  // Initialize all services
  const systemMonitor = new SystemMonitor();
  const ninaService = new NINAService();
  const astronomicalService = new AstronomicalService();
  
  // Initialize unified state system
  console.log('🌐 Initializing Unified State System...');
  const unifiedStateSystem = new UnifiedStateSystem(ninaService);
  global.unifiedStateSystem = unifiedStateSystem; // Make globally accessible for shutdown
  
  // Initialize target scheduler service with database path from config
  const { TargetSchedulerService } = require('../services/targetSchedulerService');
  const schedulerPath = configDatabase.getConfigValue('database.targetSchedulerPath', '../../resources/schedulerdb.sqlite');
  console.log('🔍 Loading Target Scheduler from database config:', schedulerPath);
  
  // Resolve path relative to project root
  const dbPath = path.resolve(__dirname, '../..', schedulerPath);
  console.log('🔍 Resolved Target Scheduler path:', dbPath);
  
  const targetSchedulerService = new TargetSchedulerService(dbPath);
  
  console.log('🔭 NINA Service configured: ' + ninaService.fullUrl);
  // Initialize Express app
  const app = express();
  const PORT = process.env.CONFIG_API_PORT || 3001;

  // Middleware
  app.use(cors());
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  });

  // Initialize API routes with services
  const apiRoutes = new APIRoutes(
    configDatabase,
    systemMonitor,
    ninaService,
    astronomicalService,
    targetSchedulerService
  );
  
  // Register all API routes
  apiRoutes.register(app);

  // Add unified state API endpoint
  app.get('/api/state', (req, res) => {
    try {
      const state = unifiedStateSystem.getState();
      res.json(state);
    } catch (error) {
      console.error('❌ Error fetching unified state:', error);
      res.status(500).json({ error: 'Failed to fetch state' });
    }
  });

  // Add unified state status endpoint
  app.get('/api/state/status', (req, res) => {
    try {
      const status = unifiedStateSystem.getStatus();
      res.json(status);
    } catch (error) {
      console.error('❌ Error fetching state status:', error);
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  // Serve local camera image file (updates externally every 30 seconds)
  app.get('/api/camera/local', (req, res) => {
    try {
      // Get the local camera path from config
      const db = getConfigDatabase();
      const config = db.getConfig();
      const localCameraPath = config?.streams?.localCameraPath || 'C:\\Astrophotography\\AllSkEye\\AllSkEye\\LatestImage\\Latest_image.jpg';
      
      // Check if file exists
      if (!fs.existsSync(localCameraPath)) {
        console.error(`❌ Local camera image not found at: ${localCameraPath}`);
        return res.status(404).json({ 
          error: 'Local camera image not found',
          path: localCameraPath,
          message: 'Please check the file path in Settings > Live Feeds > Local Camera Path'
        });
      }

      // Get file stats to check if it's being updated
      const stats = fs.statSync(localCameraPath);
      const fileAge = Date.now() - stats.mtimeMs;
      
      // Set cache headers to prevent caching (image updates every 30s)
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('X-File-Age', Math.floor(fileAge / 1000)); // Age in seconds
      
      console.log(`📷 Serving local camera image: ${localCameraPath} (${Math.floor(fileAge / 1000)}s old)`);
      
      // Send the file
      res.sendFile(path.resolve(localCameraPath));
    } catch (error) {
      console.error('❌ Error serving local camera image:', error);
      res.status(500).json({ 
        error: 'Failed to serve local camera image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve static files from React build
  const buildPath = path.join(__dirname, '..', '..', 'build');
  app.use(express.static(buildPath));

  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server
  const wss = new WebSocket.Server({ server });
  
  console.log('🔌 WebSocket server created');

  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('✅ Client connected to unified state WebSocket');

    // Send initial full sync
    try {
      const fullSync = {
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        updateKind: 'fullSync',
        updateReason: 'initial-state',
        changed: null,
        state: unifiedStateSystem.getState()
      };
      
      ws.send(JSON.stringify(fullSync));
      console.log('📤 Sent initial state to client');
    } catch (error) {
      console.error('❌ Error sending initial state:', error);
    }

    // Subscribe to state changes
    const unsubscribe = unifiedStateSystem.subscribe((message) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      } catch (error) {
        console.error('❌ Error sending state update to client:', error);
      }
    });

    // Handle client disconnection
    ws.on('close', () => {
      console.log('🔌 Client disconnected from unified state WebSocket');
      unsubscribe();
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Optional: Handle heartbeat
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        // Ignore parse errors
      }
    });
  });

  // Start unified state system
  console.log('🚀 Starting unified state system...');
  await unifiedStateSystem.start();

  // Start server
  server.listen(PORT, () => {
    console.log('✅ All services initialized successfully');
    console.log('✅ Event listeners set up successfully');
    console.log(`🚀 Enhanced Configuration API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Configuration endpoint: http://localhost:${PORT}/api/config`);
    console.log(`🌐 Unified state endpoint: http://localhost:${PORT}/api/state`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  });

  // Return server components for cleanup
  return { server, wss, unifiedStateSystem };
}

// Global references for cleanup
let server;

// Initialize server
initializeServer()
  .then((components) => {
    server = components.server;
  })
  .catch((error) => {
    console.error('💥 Failed to initialize server:', error);
    process.exit(1);
  });

