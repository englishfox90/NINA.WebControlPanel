// Clean Configuration API Server using API Routes
// Organized structure that stays under 500 lines as requested

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

// Import organized components
const APIRoutes = require('../../src/server/api-routes');
const { getConfigDatabase } = require('../../src/server/configDatabase');
const SessionStateManager = require('../../src/services/sessionStateManager.fixed');
const SystemMonitor = require('../../src/services/systemMonitor');
const NINAService = require('../../src/services/ninaService');
const AstronomicalService = require('../../src/services/astronomicalService');

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
    if (wss) {
      console.log('✅ WebSocket server closed');
      wss.close();
    }
    
    if (server) {
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }
    
    if (sessionStateManager) {
      console.log('💥 Destroying SessionStateManager...');
      sessionStateManager.destroy();
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
  
  // Initialize target scheduler service
  const { TargetSchedulerService } = require('../../src/services/targetSchedulerService');
  const dbPath = path.join(__dirname, '../../resources/schedulerdb.sqlite');
  const targetSchedulerService = new TargetSchedulerService(dbPath);
  
  console.log('🔭 NINA Service configured: ' + ninaService.fullUrl);
  
  // Initialize Express app
  const app = express();
  const PORT = process.env.CONFIG_API_PORT || 3001;

  // Middleware
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }));
  
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

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    clientTracking: true,
    maxClients: 100
  });

  // Initialize SessionStateManager with WebSocket
  const sessionStateManager = new SessionStateManager(ninaService);
  await sessionStateManager.initialize();

  // WebSocket connection handling
  const sessionClients = new Set();
  const ninaClients = new Set();

  wss.on('connection', (ws, req) => {
    const clientIP = req.connection.remoteAddress;
    const url = req.url;
    
    console.log(`🔌 New WebSocket connection from ${clientIP} to ${url}`);
    
    if (url.startsWith('/ws/nina')) {
      console.log(`🔌 Frontend NINA client connected from ${clientIP}`);
      ninaClients.add(ws);
      
      ws.on('close', () => {
        console.log(`📡 NINA client disconnected (${clientIP})`);
        ninaClients.delete(ws);
      });
    } else if (url.startsWith('/ws/session')) {
      console.log(`📡 Session client connected from ${clientIP}`);
      sessionClients.add(ws);
      
      ws.on('close', () => {
        console.log(`📡 Session client disconnected (${clientIP})`);
        sessionClients.delete(ws);
      });
    }

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error from ${clientIP}:`, error.message);
    });
  });

  // Enhanced event listeners setup
  if (sessionStateManager) {
    // Session state change events
    sessionStateManager.on('sessionStateChanged', (stateData) => {
      const message = {
        type: 'sessionStateChanged',
        data: stateData,
        timestamp: new Date().toISOString()
      };
      
      sessionClients.forEach(client => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error('❌ Error broadcasting session state:', error);
          sessionClients.delete(client);
        }
      });
    });
    
    // NINA event forwarding
    sessionStateManager.on('ninaEvent', (eventData) => {
      const message = {
        type: 'ninaEvent',
        data: eventData,
        timestamp: new Date().toISOString()
      };
      
      ninaClients.forEach(client => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error('❌ Error broadcasting NINA event:', error);
          ninaClients.delete(client);
        }
      });
    });
  }

  // Start server
  server.listen(PORT, () => {
    console.log('✅ All services initialized successfully');
    console.log('✅ Event listeners set up successfully');
    console.log(`🚀 Enhanced Configuration API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Configuration endpoint: http://localhost:${PORT}/api/config`);
    console.log(`📡 Session WebSocket available at ws://localhost:${PORT}/ws/session`);
    console.log(`🔧 NINA WebSocket available at ws://localhost:${PORT}/ws/nina`);
    console.log(`👥 Max WebSocket clients: 100`);
  });

  // Return server components for cleanup
  return { server, wss, sessionStateManager };
}

// Global references for cleanup
let server, wss, sessionStateManager;

// Initialize server
initializeServer()
  .then((components) => {
    server = components.server;
    wss = components.wss;
    sessionStateManager = components.sessionStateManager;
  })
  .catch((error) => {
    console.error('💥 Failed to initialize server:', error);
    process.exit(1);
  });
