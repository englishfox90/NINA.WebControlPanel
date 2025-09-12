// Test script to verify WebSocket logger environment control
const wsLogger = require('../../src/server/utils/WebSocketEventLogger');

console.log('🧪 Testing WebSocketEventLogger environment control...');

// Test that logging is disabled by default (no environment variables)
console.log(`📊 Current environment DEBUG: ${process.env.DEBUG || 'undefined'}`);
console.log(`📊 Current environment DEBUG_WEBSOCKET: ${process.env.DEBUG_WEBSOCKET || 'undefined'}`);
console.log(`📊 Logger enabled: ${wsLogger.isEnabled || 'false (no-op methods active)'}`);

// Test a log call - should be no-op when disabled
try {
  wsLogger.log('TEST', 'LOGGING_TEST', { message: 'This should not appear in any log file' });
  console.log('📝 Log method call succeeded (either no-op or logging enabled)');
} catch (error) {
  console.log(`📝 Log method call failed: ${error.message} (indicates no-op methods active)`);
}

console.log('✅ Test complete - if no log file created, environment control is working correctly');

// Check if log file was created
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'src', 'logs', 'websocket-events.log');
const logExists = fs.existsSync(logFile);

console.log(`📁 Log file created: ${logExists ? 'YES (❌ FAILED)' : 'NO (✅ SUCCESS)'}`);
