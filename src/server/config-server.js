// Clean Configuration API Server using API Routes
// Organized structure that stays under 500 lines as requested

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// Import organized components
const APIRoutes = require('./api');
const { getConfigDatabase } = require('./configDatabase');
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
    if (server) {
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }
    
    // if (sessionStateManager) {
    //   console.log('💥 Destroying SessionStateManager...');
    //   sessionStateManager.destroy();
    // }
    

    
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

  // Start server
  server.listen(PORT, () => {
    console.log('✅ All services initialized successfully');
    console.log('✅ Event listeners set up successfully');
    console.log(`🚀 Enhanced Configuration API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Configuration endpoint: http://localhost:${PORT}/api/config`);

  });

  // Return server components for cleanup
  return { server };
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

