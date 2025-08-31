// System Health Monitor - Continuous monitoring for long-running deployments
// Monitors system resources, database health, and application performance

const fs = require('fs');
const path = require('path');
const { getConfigDatabase } = require('../../src/server/configDatabase');
const SystemMonitor = require('../../src/services/systemMonitor');

class HealthMonitor {
  constructor() {
    this.systemMonitor = new SystemMonitor();
    this.checkInterval = 60000; // 1 minute
    this.logsDir = path.join(__dirname, '../../logs');
    this.healthLogPath = path.join(this.logsDir, 'health.log');
    this.alertThresholds = {
      cpu: 90,      // CPU usage percentage
      memory: 85,   // Memory usage percentage
      disk: 90,     // Disk usage percentage
      temperature: 85  // CPU temperature (Celsius)
    };
    this.alerts = new Map();
  }

  start() {
    console.log('🏥 Starting System Health Monitor...');
    console.log(`📊 Monitoring interval: ${this.checkInterval / 1000} seconds`);
    console.log('📝 Health logs:', this.healthLogPath);
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up recurring health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    const health = {
      timestamp,
      system: await this.checkSystemHealth(),
      application: await this.checkApplicationHealth(),
      database: await this.checkDatabaseHealth(),
      network: await this.checkNetworkHealth()
    };

    // Calculate overall health score
    health.overall = this.calculateOverallHealth(health);
    
    // Log health data
    this.logHealth(health);
    
    // Check for alerts
    this.processAlerts(health);
    
    return health;
  }

  async checkSystemHealth() {
    try {
      const [cpu, memory, disk] = await Promise.all([
        this.systemMonitor.getCPUInfo(),
        this.systemMonitor.getMemoryInfo(),
        this.systemMonitor.getDiskInfo()
      ]);

      return {
        cpu: {
          usage: cpu.usage,
          temperature: cpu.temperature,
          status: cpu.usage < this.alertThresholds.cpu ? 'healthy' : 'critical'
        },
        memory: {
          usage: memory.usagePercent,
          available: memory.freeGB,
          status: memory.usagePercent < this.alertThresholds.memory ? 'healthy' : 'critical'
        },
        disk: disk.map(d => ({
          mount: d.mount,
          usage: Math.round((d.used / d.size) * 100),
          available: d.available,
          status: (d.used / d.size * 100) < this.alertThresholds.disk ? 'healthy' : 'warning'
        }))
      };
    } catch (error) {
      return { error: error.message, status: 'error' };
    }
  }

  async checkApplicationHealth() {
    try {
      // Check if the web server is responding
      const fetch = require('axios');
      const startTime = Date.now();
      
      try {
        await fetch.get('http://localhost:3001/api/system/status', { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        
        return {
          webserver: {
            status: 'healthy',
            responseTime: responseTime,
            port: 3001
          },
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        };
      } catch (error) {
        return {
          webserver: {
            status: 'critical',
            error: error.message,
            port: 3001
          },
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        };
      }
    } catch (error) {
      return { error: error.message, status: 'error' };
    }
  }

  async checkDatabaseHealth() {
    try {
      const configDb = getConfigDatabase();
      
      // Test configuration database
      const stats = configDb.getStats();
      const config = configDb.getConfig();
      
      const health = {
        configuration: {
          status: 'healthy',
          totalConfigs: stats.totalConfigs,
          categories: stats.categories.length,
          lastUpdate: stats.lastUpdate
        }
      };

      // Test target scheduler database if configured
      if (config.database.targetSchedulerPath && 
          !config.database.targetSchedulerPath.startsWith('http')) {
        
        const schedulerPath = path.isAbsolute(config.database.targetSchedulerPath) ?
          config.database.targetSchedulerPath :
          path.join(__dirname, '../../', config.database.targetSchedulerPath);
          
        if (fs.existsSync(schedulerPath)) {
          const Database = require('better-sqlite3');
          const testDb = new Database(schedulerPath, { readonly: true });
          
          try {
            const projectCount = testDb.prepare('SELECT COUNT(*) as count FROM project').get();
            const imageCount = testDb.prepare('SELECT COUNT(*) as count FROM acquiredimage').get();
            
            health.scheduler = {
              status: 'healthy',
              projects: projectCount.count,
              images: imageCount.count,
              path: schedulerPath
            };
          } catch (error) {
            health.scheduler = {
              status: 'warning',
              error: error.message,
              path: schedulerPath
            };
          } finally {
            testDb.close();
          }
        } else {
          health.scheduler = {
            status: 'warning',
            error: 'Database file not found',
            path: schedulerPath
          };
        }
      }

      return health;
    } catch (error) {
      return { error: error.message, status: 'error' };
    }
  }

  async checkNetworkHealth() {
    try {
      const configDb = getConfigDatabase();
      const config = configDb.getConfig();
      
      const networkTests = [];
      
      // Test NINA connection
      if (config.nina.baseUrl) {
        networkTests.push(this.testEndpoint(
          'NINA API',
          `${config.nina.baseUrl}:${config.nina.apiPort}/api/info`,
          config.nina.timeout
        ));
      }
      
      // Test stream URLs
      if (config.streams.liveFeed1) {
        networkTests.push(this.testEndpoint('Stream 1', config.streams.liveFeed1, 3000));
      }
      
      const results = await Promise.allSettled(networkTests);
      
      return {
        tests: results.map((result, index) => ({
          name: networkTests[index]?.name || `Test ${index}`,
          status: result.status === 'fulfilled' ? result.value.status : 'failed',
          responseTime: result.status === 'fulfilled' ? result.value.responseTime : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      };
    } catch (error) {
      return { error: error.message, status: 'error' };
    }
  }

  async testEndpoint(name, url, timeout = 5000) {
    const fetch = require('axios');
    const startTime = Date.now();
    
    try {
      await fetch.head(url, { timeout });
      return {
        name,
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        name,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  calculateOverallHealth(health) {
    let score = 100;
    let issues = [];

    // System health scoring
    if (health.system.cpu && health.system.cpu.status === 'critical') {
      score -= 30;
      issues.push('High CPU usage');
    }
    
    if (health.system.memory && health.system.memory.status === 'critical') {
      score -= 25;
      issues.push('High memory usage');
    }

    // Application health scoring
    if (health.application.webserver && health.application.webserver.status === 'critical') {
      score -= 40;
      issues.push('Web server not responding');
    }

    // Database health scoring
    if (health.database.configuration && health.database.configuration.status !== 'healthy') {
      score -= 20;
      issues.push('Database issues');
    }

    // Network health scoring
    if (health.network.tests) {
      const failedTests = health.network.tests.filter(t => t.status === 'failed');
      if (failedTests.length > 0) {
        score -= Math.min(failedTests.length * 10, 20);
        issues.push(`${failedTests.length} network test(s) failed`);
      }
    }

    return {
      score: Math.max(score, 0),
      status: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor',
      issues
    };
  }

  logHealth(health) {
    const logEntry = {
      timestamp: health.timestamp,
      overall: health.overall.score,
      status: health.overall.status,
      issues: health.overall.issues.length,
      cpu: health.system.cpu?.usage || 'N/A',
      memory: health.system.memory?.usage || 'N/A',
      webserver: health.application.webserver?.status || 'N/A'
    };

    const logLine = `${health.timestamp} | Health: ${health.overall.score}% (${health.overall.status}) | CPU: ${logEntry.cpu}% | Memory: ${logEntry.memory}% | WebServer: ${logEntry.webserver}${health.overall.issues.length > 0 ? ' | Issues: ' + health.overall.issues.join(', ') : ''}\n`;
    
    fs.appendFileSync(this.healthLogPath, logLine);
  }

  processAlerts(health) {
    const now = Date.now();
    
    // CPU alerts
    if (health.system.cpu && health.system.cpu.usage > this.alertThresholds.cpu) {
      this.triggerAlert('high_cpu', `CPU usage is ${health.system.cpu.usage}%`, now);
    } else {
      this.clearAlert('high_cpu');
    }

    // Memory alerts
    if (health.system.memory && health.system.memory.usage > this.alertThresholds.memory) {
      this.triggerAlert('high_memory', `Memory usage is ${health.system.memory.usage}%`, now);
    } else {
      this.clearAlert('high_memory');
    }

    // Web server alerts
    if (health.application.webserver && health.application.webserver.status === 'critical') {
      this.triggerAlert('webserver_down', 'Web server is not responding', now);
    } else {
      this.clearAlert('webserver_down');
    }
  }

  triggerAlert(type, message, timestamp) {
    if (!this.alerts.has(type)) {
      console.log(`🚨 ALERT: ${message}`);
      this.alerts.set(type, { message, firstSeen: timestamp, count: 1 });
    } else {
      const alert = this.alerts.get(type);
      alert.count++;
      alert.lastSeen = timestamp;
    }
  }

  clearAlert(type) {
    if (this.alerts.has(type)) {
      const alert = this.alerts.get(type);
      console.log(`✅ RESOLVED: ${alert.message}`);
      this.alerts.delete(type);
    }
  }

  stop() {
    console.log('🛑 Stopping System Health Monitor...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Final health check
    this.performHealthCheck().then((health) => {
      console.log('📊 Final health score:', health.overall.score + '%');
      process.exit(0);
    });
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new HealthMonitor();
  monitor.start();
}

module.exports = HealthMonitor;
