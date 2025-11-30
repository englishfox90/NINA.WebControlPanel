#!/usr/bin/env node
// Enhanced development startup with comprehensive logging

const { exec, spawn } = require('child_process');
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
console.log(`📝 Backend logs: ${backendLogPath}`);
console.log(`📝 Frontend logs: ${frontendLogPath}`);
console.log('===========================================================\n');

// Create log streams
const backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
const frontendLogStream = fs.createWriteStream(frontendLogPath, { flags: 'a' });

// Log header
const timestamp = new Date().toISOString();
backendLogStream.write(`\n${'='.repeat(80)}\n`);
backendLogStream.write(`Backend Server Started: ${timestamp}\n`);
backendLogStream.write(`${'='.repeat(80)}\n\n`);

frontendLogStream.write(`\n${'='.repeat(80)}\n`);
frontendLogStream.write(`Frontend Build Started: ${timestamp}\n`);
frontendLogStream.write(`${'='.repeat(80)}\n\n`);

// Start backend server
console.log('🚀 Starting backend server...');
const backend = spawn('node', ['config-server.js'], {
  cwd: path.join(__dirname, 'src', 'server'),
  env: { ...process.env }
});

backend.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(`[BACKEND] ${output}`);
  backendLogStream.write(`[${new Date().toISOString()}] ${output}`);
});

backend.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(`[BACKEND ERROR] ${output}`);
  backendLogStream.write(`[${new Date().toISOString()}] [ERROR] ${output}`);
});

backend.on('error', (error) => {
  const msg = `Backend process error: ${error.message}\n`;
  console.error(msg);
  backendLogStream.write(`[${new Date().toISOString()}] [CRITICAL] ${msg}`);
});

// Wait a bit, then start frontend
setTimeout(() => {
  console.log('🎨 Starting frontend React app...');
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? 'npm.cmd' : 'npm';
  
  const frontend = spawn(npmCommand, ['start'], {
    cwd: path.join(__dirname, 'src', 'client'),
    env: { ...process.env },
    shell: true
  });

  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[FRONTEND] ${output}`);
    frontendLogStream.write(`[${new Date().toISOString()}] ${output}`);
  });

  frontend.stderr.on('data', (data) => {
    const output = data.toString();
    // Don't treat all stderr as errors (webpack uses it for warnings)
    if (output.includes('ERROR') || output.includes('Failed')) {
      process.stderr.write(`[FRONTEND ERROR] ${output}`);
      frontendLogStream.write(`[${new Date().toISOString()}] [ERROR] ${output}`);
    } else {
      process.stdout.write(`[FRONTEND] ${output}`);
      frontendLogStream.write(`[${new Date().toISOString()}] ${output}`);
    }
  });

  frontend.on('error', (error) => {
    const msg = `Frontend process error: ${error.message}\n`;
    console.error(msg);
    frontendLogStream.write(`[${new Date().toISOString()}] [CRITICAL] ${msg}`);
  });

  frontend.on('close', (code) => {
    const msg = `Frontend process exited with code ${code}\n`;
    console.log(msg);
    frontendLogStream.write(`[${new Date().toISOString()}] ${msg}`);
    frontendLogStream.end();
    backend.kill();
    process.exit(code);
  });

}, 3000);

backend.on('close', (code) => {
  const msg = `Backend process exited with code ${code}\n`;
  console.log(msg);
  backendLogStream.write(`[${new Date().toISOString()}] ${msg}`);
  backendLogStream.end();
  process.exit(code);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  backendLogStream.write(`\n[${new Date().toISOString()}] Shutdown initiated by user (SIGINT)\n`);
  frontendLogStream.write(`\n[${new Date().toISOString()}] Shutdown initiated by user (SIGINT)\n`);
  
  backend.kill('SIGINT');
  
  setTimeout(() => {
    backendLogStream.end();
    frontendLogStream.end();
    process.exit(0);
  }, 1000);
});
