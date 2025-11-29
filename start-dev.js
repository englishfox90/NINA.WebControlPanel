#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🌟 Starting NINA WebControlPanel Development Environment...');
console.log('===========================================================');

// Start backend server
console.log('🚀 Starting backend server...');
const backend = exec('node config-server.js', {
  cwd: path.join(__dirname, 'src', 'server')
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`[BACKEND] ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[BACKEND] ${data}`);
});

// Wait a bit, then start frontend
setTimeout(() => {
  console.log('🎨 Starting frontend React app...');
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? 'npm.cmd start' : 'npm start';
  const frontend = exec(npmCommand, {
    cwd: path.join(__dirname, 'src', 'client')
  });

  frontend.stdout.on('data', (data) => {
    process.stdout.write(`[FRONTEND] ${data}`);
  });

  frontend.stderr.on('data', (data) => {
    process.stderr.write(`[FRONTEND] ${data}`);
  });

  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    backend.kill();
    process.exit(code);
  });

}, 3000);

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  backend.kill();
  process.exit(0);
});
