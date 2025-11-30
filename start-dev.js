#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const date = new Date().toISOString().split('T')[0];
const backendLogPath = path.join(logsDir, `backend-startup-${date}.log`);
const frontendLogPath = path.join(logsDir, `frontend-startup-${date}.log`);

console.log('🌟 Starting NINA WebControlPanel Development Environment...');
console.log('===========================================================');
console.log(`📝 Logs: ${logsDir}`);
console.log('===========================================================');

// Create log streams
const backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
const frontendLogStream = fs.createWriteStream(frontendLogPath, { flags: 'a' });

// Log header
const timestamp = new Date().toISOString();
backendLogStream.write(`\n${'='.repeat(80)}\n`);
backendLogStream.write(`Backend Server Started: ${timestamp}\n`);
backendLogStream.write(`${'='.repeat(80)}\n\n`);

// Start backend server
console.log('🚀 Starting backend server...');
const backend = exec('node config-server.js', {
  cwd: path.join(__dirname, 'src', 'server')
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`[BACKEND] ${data}`);
  backendLogStream.write(`[${new Date().toISOString()}] ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[BACKEND] ${data}`);
  backendLogStream.write(`[${new Date().toISOString()}] [ERROR] ${data}`);
});

// Wait a bit, then start frontend
setTimeout(() => {
  console.log('🎨 Starting frontend React app...');
  
  frontendLogStream.write(`\n${'='.repeat(80)}\n`);
  frontendLogStream.write(`Frontend Build Started: ${new Date().toISOString()}\n`);
  frontendLogStream.write(`${'='.repeat(80)}\n\n`);
  
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? 'npm.cmd start' : 'npm start';
  const frontend = exec(npmCommand, {
    cwd: path.join(__dirname, 'src', 'client')
  });

  frontend.stdout.on('data', (data) => {
    process.stdout.write(`[FRONTEND] ${data}`);
    frontendLogStream.write(`[${new Date().toISOString()}] ${data}`);
  });

  frontend.stderr.on('data', (data) => {
    // Don't treat all stderr as errors (webpack uses it for warnings)
    if (data.toString().includes('ERROR') || data.toString().includes('Failed')) {
      process.stderr.write(`[FRONTEND ERROR] ${data}`);
      frontendLogStream.write(`[${new Date().toISOString()}] [ERROR] ${data}`);
    } else {
      process.stdout.write(`[FRONTEND] ${data}`);
      frontendLogStream.write(`[${new Date().toISOString()}] ${data}`);
    }
  });

  frontend.on('close', (code) => {
    const msg = `Frontend process exited with code ${code}`;
    console.log(msg);
    frontendLogStream.write(`[${new Date().toISOString()}] ${msg}\n`);
    frontendLogStream.end();
    backend.kill();
    process.exit(code);
  });

}, 3000);

backend.on('close', (code) => {
  const msg = `Backend process exited with code ${code}`;
  console.log(msg);
  backendLogStream.write(`[${new Date().toISOString()}] ${msg}\n`);
  backendLogStream.end();
  process.exit(code);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  backendLogStream.write(`\n[${new Date().toISOString()}] Shutdown initiated by user (SIGINT)\n`);
  frontendLogStream.write(`\n[${new Date().toISOString()}] Shutdown initiated by user (SIGINT)\n`);
  
  backend.kill();
  
  setTimeout(() => {
    backendLogStream.end();
    frontendLogStream.end();
    process.exit(0);
  }, 1000);
});
