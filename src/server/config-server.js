// Clean Configuration API Server using API Routes
// Organized structure that stays under 500 lines as requested

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

// Import organized components
const APIRoutes = require('./api');
const { getConfigDatabase } = require('./configDatabase');
// const SessionStateManager = require('../services/sessionStateManager'); // DISABLED: Using only new modular system
const UnifiedSessionManager = require('./session/UnifiedSessionManager');
const SessionAPIRoutes = require('./session/SessionAPIRoutes');
const SystemMonitor = require('../services/systemMonitor');
const NINAService = require('../services/ninaService');
const AstronomicalService = require('../services/astronomicalService');

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
    
    // if (sessionStateManager) {
    //   console.log('💥 Destroying SessionStateManager...');
    //   sessionStateManager.destroy();
    // }
    
    if (unifiedSessionManager) {
      console.log('💥 Destroying UnifiedSessionManager...');
      unifiedSessionManager.destroy();
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
  
  // Initialize target scheduler service with database path from config
  const { TargetSchedulerService } = require('../services/targetSchedulerService');
  const schedulerPath = configDatabase.getConfigValue('database.targetSchedulerPath', '../../resources/schedulerdb.sqlite');
  console.log('🔍 Loading Target Scheduler from database config:', schedulerPath);
  
  // Resolve path relative to project root
  const dbPath = path.resolve(__dirname, '../..', schedulerPath);
  console.log('🔍 Resolved Target Scheduler path:', dbPath);
  
  const targetSchedulerService = new TargetSchedulerService(dbPath);
  
  console.log('🔭 NINA Service configured: ' + ninaService.fullUrl);
  
  // Initialize SessionStateManager (legacy support) - DISABLED
  // const sessionStateManager = new SessionStateManager(ninaService);
  // await sessionStateManager.initialize();
  const sessionStateManager = null; // Placeholder to avoid undefined errors
  
  // Initialize UnifiedSessionManager (new architecture)
  const unifiedSessionManager = new UnifiedSessionManager(configDatabase, ninaService);
  console.log('🔧 Created UnifiedSessionManager, starting initialization...');
  await unifiedSessionManager.initialize();
  console.log('✅ UnifiedSessionManager initialization completed');
  
  console.log('✅ Unified session manager initialized (legacy disabled)');
  
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

  // Make session manager available to all routes
  // app.locals.sessionStateManager = sessionStateManager; // Legacy - DISABLED
  app.locals.unifiedSessionManager = unifiedSessionManager; // New
  
  // Initialize API routes with services
  const apiRoutes = new APIRoutes(
    configDatabase,
    systemMonitor,
    ninaService,
    astronomicalService,
    targetSchedulerService,
    null // sessionStateManager - DISABLED: Using unified system only
  );
  
  // Initialize new session API routes
  console.log('🔧 Creating SessionAPIRoutes with unifiedSessionManager:', unifiedSessionManager ? 'VALID' : 'NULL');
  const sessionAPIRoutes = new SessionAPIRoutes(unifiedSessionManager);
  
  // Register all API routes
  apiRoutes.register(app);
  sessionAPIRoutes.register(app);

  // Serve static files from React build
  const buildPath = path.join(__dirname, '..', '..', 'build');
  app.use(express.static(buildPath));

  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server (matching original implementation)
  const wss = new WebSocket.Server({ server });
  const sessionClients = new Set();
  const ninaClients = new Set();
  const unifiedClients = new Set(); // New unified client set

  // Handle WebSocket connections from frontend
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/ws/unified') {
      console.log('🔌 Frontend unified client connected');
      unifiedClients.add(ws);
      
      // Send initial connection status
      ws.send(JSON.stringify({
        type: 'connection',
        data: {
          message: 'Connected to unified event stream',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }));
      
      // Send initial unified session data
      const initialSessionData = unifiedSessionManager.getCurrentSessionData();
      ws.send(JSON.stringify({
        type: 'unifiedSession',
        data: initialSessionData,
        timestamp: new Date().toISOString()
      }));
      
      ws.on('close', () => {
        console.log('❌ Frontend unified client disconnected');
        unifiedClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ Frontend unified WebSocket error:', error);
        unifiedClients.delete(ws);
      });
      
      // Send heartbeat every 20 seconds
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'heartbeat',
            data: { timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString()
          }));
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 20000);
      
    } else if (url.pathname === '/ws/session') {
      console.log('🔌 Frontend session client connected');
      sessionClients.add(ws);
      
      // Send current session state immediately
      ws.send(JSON.stringify({
        type: 'sessionUpdate',
        data: unifiedSessionManager.getCurrentSessionData() // CHANGED: Using unified system instead of legacy
      }));
      
      ws.on('close', () => {
        console.log('❌ Frontend session client disconnected');
        sessionClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ Frontend session WebSocket error:', error);
        sessionClients.delete(ws);
      });
    } else if (url.pathname === '/ws/nina') {
      console.log('� Frontend NINA client connected');
      ninaClients.add(ws);
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to NINA event stream',
        timestamp: new Date().toISOString()
      }));
      
      ws.on('close', () => {
        console.log('❌ Frontend NINA client disconnected');
        ninaClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ Frontend NINA WebSocket error:', error);
        ninaClients.delete(ws);
      });
    }
  });

  // Broadcast session updates to all connected frontend clients (legacy) - DISABLED
  // sessionStateManager.on('sessionUpdate', (sessionState) => {
  //   broadcastSessionUpdate(sessionState);
  // });

  // Broadcast NINA events to all connected frontend clients (legacy) - DISABLED
  // sessionStateManager.on('ninaEvent', (eventType, eventData) => {
  //   broadcastNINAEvent(eventType, eventData);
  // });

  // Broadcast updates from UnifiedSessionManager (new architecture)
  unifiedSessionManager.on('sessionUpdate', (sessionData) => {
    broadcastUnifiedSessionUpdate(sessionData);
  });

  unifiedSessionManager.on('ninaEvent', (eventType, eventData) => {
    broadcastNINAEvent(eventType, eventData);
  });

  // Broadcast NINA events to all connected frontend clients
  const broadcastNINAEvent = (eventType, eventData) => {
    const message = JSON.stringify({
      type: 'nina-event',
      data: {
        Type: eventType,
        Timestamp: new Date().toISOString(),
        Source: 'NINA',
        Data: eventData
      },
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 Broadcasting NINA event to', (ninaClients.size + unifiedClients.size), 'clients:', eventType);
    
    // Broadcast to original NINA clients (legacy support)
    ninaClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        ninaClients.delete(client);
      }
    });

    // Broadcast to unified clients (new architecture)
    unifiedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        unifiedClients.delete(client);
      }
    });
  };

  // Broadcast session updates to unified clients (legacy format)
  const broadcastSessionUpdate = (sessionData) => {
    const message = JSON.stringify({
      type: 'sessionUpdate',
      data: sessionData,
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 Broadcasting session update to', (sessionClients.size + unifiedClients.size), 'clients');
    
    // Broadcast to original session clients (legacy support)
    sessionClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        sessionClients.delete(client);
      }
    });

    // Broadcast to unified clients (new architecture)
    unifiedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        unifiedClients.delete(client);
      }
    });
  };

  // Broadcast unified session updates (new format)
  const broadcastUnifiedSessionUpdate = (sessionData) => {
    const message = JSON.stringify({
      type: 'unifiedSession',
      data: sessionData,
      timestamp: new Date().toISOString()
    });
    
    // Only broadcast to unified clients (new architecture)
    unifiedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        unifiedClients.delete(client);
      }
    });
  };

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
  return { server, wss, sessionStateManager: null, unifiedSessionManager };
}

// Global references for cleanup
let server, wss, sessionStateManager, unifiedSessionManager;

// Initialize server
initializeServer()
  .then((components) => {
    server = components.server;
    wss = components.wss;
    sessionStateManager = components.sessionStateManager;
    unifiedSessionManager = components.unifiedSessionManager;
  })
  .catch((error) => {
    console.error('💥 Failed to initialize server:', error);
    process.exit(1);
  });
