// Test WebSocket logger with DEBUG enabled from start
process.env.DEBUG = 'true';

const wsLogger = require('../../src/server/utils/WebSocketEventLogger');

console.log('🧪 Testing WebSocketEventLogger with DEBUG enabled...');
console.log(`📊 Current environment DEBUG: ${process.env.DEBUG}`);
console.log(`📊 Logger enabled: ${wsLogger.isEnabled}`);

// Test a log call - should work when DEBUG is enabled
try {
  wsLogger.log('TEST', 'LOGGING_TEST', { message: 'This should appear in log file when DEBUG enabled' });
  console.log('📝 Log method call succeeded');
} catch (error) {
  console.log(`📝 Log method call failed: ${error.message}`);
}

console.log('✅ Test complete');

// Check if log file was created
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '..', '..', 'src', 'logs', 'websocket-events.log');
const logExists = fs.existsSync(logFile);

console.log(`📁 Log file created: ${logExists ? 'YES (✅ SUCCESS)' : 'NO (❌ FAILED)'}`);

if (logExists) {
  const stats = fs.statSync(logFile);
  console.log(`📊 Log file size: ${stats.size} bytes`);
}
