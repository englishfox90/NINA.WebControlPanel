// Main API routes manager - organized modular architecture
const ConfigRoutes = require('./config');
const SystemRoutes = require('./system');
const SchedulerRoutes = require('./scheduler');
const AstronomicalRoutes = require('./astronomical');
const NINARoutes = require('./nina');
const DashboardRoutes = require('./dashboard');

class APIRoutes {
  constructor(configDatabase, systemMonitor, ninaService, astronomicalService, targetSchedulerService, sessionStateManager) {
    this.configDatabase = configDatabase;
    this.systemMonitor = systemMonitor;
    this.ninaService = ninaService;
    this.astronomicalService = astronomicalService;
    this.targetSchedulerService = targetSchedulerService;
    this.sessionStateManager = sessionStateManager;
    
    // Initialize Target Scheduler database
    try {
      const { getTargetSchedulerDatabase } = require('../../services/targetSchedulerService');
      const path = require('path');
      const schedulerPath = configDatabase.getConfigValue('database.targetSchedulerPath', '../../resources/schedulerdb.sqlite');
      const resolvedPath = path.resolve(__dirname, '..', schedulerPath);
      console.log(`🔍 Loading Target Scheduler from database config: ${schedulerPath}`);
      console.log(`🔍 Resolved Target Scheduler path: ${resolvedPath}`);
      this.targetSchedulerDb = getTargetSchedulerDatabase(resolvedPath);
      console.log('✅ Target Scheduler database initialized from database configuration');
    } catch (error) {
      console.error('⚠️ Target Scheduler database not available:', error.message);
      this.targetSchedulerDb = null;
    }
    
    // Initialize route modules
    this.configRoutes = new ConfigRoutes(configDatabase);
    this.systemRoutes = new SystemRoutes(systemMonitor);
    this.schedulerRoutes = new SchedulerRoutes(this.targetSchedulerDb);
    this.astronomicalRoutes = new AstronomicalRoutes(astronomicalService, configDatabase);
    this.ninaRoutes = new NINARoutes(ninaService, sessionStateManager);
    this.dashboardRoutes = new DashboardRoutes(configDatabase);
    
    console.log('🔧 Modular API Routes initialized with all services');
  }

  // Register all API routes on the Express app
  register(app) {
    console.log('📋 Registering API routes...');
    
    this.configRoutes.register(app);
    console.log('✅ Configuration routes registered');
    
    this.systemRoutes.register(app);
    console.log('✅ System monitoring routes registered');
    
    this.schedulerRoutes.register(app);
    console.log('✅ Scheduler routes registered');
    
    this.astronomicalRoutes.register(app);
    console.log('✅ Astronomical routes registered');
    
    this.ninaRoutes.register(app);
    console.log('✅ NINA integration routes registered');
    
    this.dashboardRoutes.register(app);
    console.log('✅ Dashboard management routes registered');
    
    console.log('🎯 All API routes registered successfully');
  }
}

module.exports = APIRoutes;
