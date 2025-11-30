#!/usr/bin/env node

// Backend Process Monitor - Detects crashes and restarts automatically
// Addresses the issue where backend exits after ~20 minutes

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BackendMonitor {
  constructor() {
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.backendProcess = null;
    this.startTime = Date.now();
    
    // Setup logging
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    this.monitorLogFile = path.join(logsDir, `backend-monitor-${date}.log`);
    this.backendLogFile = path.join(logsDir, `backend-startup-${date}.log`);
    this.backendLogStream = fs.createWriteStream(this.backendLogFile, { flags: 'a' });
    
    this.log('🚀 Backend Monitor starting...');
    this.backendLogStream.write(`\n${'='.repeat(80)}\n`);
    this.backendLogStream.write(`Backend Started via Monitor: ${new Date().toISOString()}\n`);
    this.backendLogStream.write(`${'='.repeat(80)}\n\n`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.monitorLogFile, logEntry);
  }

  startBackend() {
    this.log(`🔄 Starting backend (attempt ${this.restartCount + 1}/${this.maxRestarts})...`);
    
    this.backendProcess = spawn('node', ['src/server/config-server.js'], {
      cwd: path.join(__dirname, '../../'),
      stdio: ['inherit', 'pipe', 'pipe']
    });

    this.backendProcess.stdout.on('data', (data) => {
      process.stdout.write(`[BACKEND] ${data}`);
      this.backendLogStream.write(`[${new Date().toISOString()}] ${data}`);
    });

    this.backendProcess.stderr.on('data', (data) => {
      process.stderr.write(`[BACKEND ERROR] ${data}`);
      this.backendLogStream.write(`[${new Date().toISOString()}] [ERROR] ${data}`);
    });

    this.backendProcess.on('exit', (code, signal) => {
      const uptime = Date.now() - this.startTime;
      const uptimeMinutes = Math.floor(uptime / 60000);
      
      this.log(`💥 Backend exited with code ${code}, signal ${signal} after ${uptimeMinutes} minutes uptime`);
      
      if (code !== 0 && this.restartCount < this.maxRestarts) {
        this.restartCount++;
        const delay = Math.min(5000 * this.restartCount, 30000); // Exponential backoff
        
        this.log(`⏱️  Restarting in ${delay}ms...`);
        setTimeout(() => {
          this.startTime = Date.now();
          this.startBackend();
        }, delay);
      } else {
        this.log('💀 Max restarts reached or manual shutdown');
        process.exit(code || 0);
      }
    });

    this.backendProcess.on('error', (error) => {
      this.log(`❌ Failed to start backend: ${error.message}`);
      process.exit(1);
    });
  }

  stop() {
    this.log('🛑 Stopping backend monitor...');
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
    }
    if (this.backendLogStream) {
      this.backendLogStream.write(`\n[${new Date().toISOString()}] Backend monitor stopped by user\n`);
      this.backendLogStream.end();
    }
    process.exit(0);
  }
}

const monitor = new BackendMonitor();

// Graceful shutdown
process.on('SIGINT', () => monitor.stop());
process.on('SIGTERM', () => monitor.stop());

// Start monitoring
monitor.startBackend();
