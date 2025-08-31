#!/usr/bin/env node

// Process Management Enhancement for Long-running Operations
// This service ensures the NINA WebControlPanel backend runs reliably for days

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ProcessManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.configPath = path.join(this.projectRoot, 'src', 'server');
    this.logDir = path.join(this.projectRoot, 'logs');
    this.pidFile = path.join(this.projectRoot, 'nina-webcontrol.pid');
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Start the backend server with proper logging and restart capability
  startServer() {
    console.log('🚀 Starting NINA WebControlPanel Backend Server...');
    
    // Use process.execPath to get the current Node.js executable path
    const nodeExecutable = process.execPath;
    const serverScript = path.join(this.configPath, 'config-server.js');
    
    // Verify the server script exists
    if (!fs.existsSync(serverScript)) {
      console.error(`❌ Server script not found: ${serverScript}`);
      return null;
    }
    
    console.log(`   Node executable: ${nodeExecutable}`);
    console.log(`   Server script: ${serverScript}`);
    
    // Set production environment variables
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      BUILD_DIR: path.join(this.projectRoot, 'build')
    };
    
    console.log(`   Environment: NODE_ENV=${env.NODE_ENV}, BUILD_DIR=${env.BUILD_DIR}`);
    
    const serverProcess = spawn(nodeExecutable, [serverScript], {
      cwd: this.configPath,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env
    });

    // Handle spawn errors
    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server process:', error.message);
      return null;
    });

    // Write PID for management
    fs.writeFileSync(this.pidFile, serverProcess.pid.toString());
    console.log(`   Process ID: ${serverProcess.pid}`);

    // Set up logging
    const logFile = path.join(this.logDir, `server-${new Date().toISOString().split('T')[0]}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    serverProcess.stdout.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [STDOUT] ${data}`;
      logStream.write(logEntry);
      console.log(data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [STDERR] ${data}`;
      logStream.write(logEntry);
      console.error(data.toString().trim());
    });

    serverProcess.on('exit', (code, signal) => {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [EXIT] Process exited with code ${code}, signal ${signal}\n`;
      logStream.write(logEntry);
      logStream.close();
      
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }

      // Auto-restart on unexpected exit
      if (code !== 0) {
        console.log('💥 Server crashed, restarting in 5 seconds...');
        setTimeout(() => this.startServer(), 5000);
      }
    });

    // Graceful shutdown handlers
    process.on('SIGINT', () => this.stopServer());
    process.on('SIGTERM', () => this.stopServer());

    console.log('✅ Server process started successfully');
    return serverProcess;
  }

  // Stop the server gracefully
  stopServer() {
    if (fs.existsSync(this.pidFile)) {
      const pid = fs.readFileSync(this.pidFile, 'utf8');
      try {
        process.kill(parseInt(pid), 'SIGTERM');
        console.log('✅ Server stopped gracefully');
      } catch (error) {
        console.log('⚠️ Server already stopped or permission denied');
      }
      fs.unlinkSync(this.pidFile);
    }
  }

  // Check if server is running
  isRunning() {
    if (!fs.existsSync(this.pidFile)) {
      return false;
    }
    
    const pid = fs.readFileSync(this.pidFile, 'utf8');
    try {
      process.kill(parseInt(pid), 0); // Check if process exists
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get server status and health metrics
  getStatus() {
    const isRunning = this.isRunning();
    const uptime = isRunning ? this.getUptime() : 0;
    const memoryUsage = process.memoryUsage();

    return {
      running: isRunning,
      uptime: uptime,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
      },
      platform: os.platform(),
      nodeVersion: process.version
    };
  }

  getUptime() {
    if (!fs.existsSync(this.pidFile)) return 0;
    
    const stats = fs.statSync(this.pidFile);
    const startTime = stats.mtime.getTime();
    return Date.now() - startTime;
  }
}

// CLI Interface
if (require.main === module) {
  const pm = new ProcessManager();
  const command = process.argv[2] || 'start';

  switch (command) {
    case 'start':
      if (pm.isRunning()) {
        console.log('✅ Server is already running');
        console.log(pm.getStatus());
      } else {
        pm.startServer();
      }
      break;
      
    case 'stop':
      pm.stopServer();
      break;
      
    case 'restart':
      pm.stopServer();
      setTimeout(() => pm.startServer(), 2000);
      break;
      
    case 'status':
      console.log(pm.getStatus());
      break;
      
    default:
      console.log('Usage: node process-manager.js [start|stop|restart|status]');
  }
}

module.exports = ProcessManager;
