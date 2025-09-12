// Enhanced WebSocket Event Logger
// Logs all WebSocket events and their processing journey through the system
// Only active when DEBUG environment variables are set

const fs = require('fs');
const path = require('path');

class WebSocketEventLogger {
  constructor() {
    // Check if logging is enabled via environment variables
    this.isEnabled = this.checkLoggingEnabled();
    
    if (!this.isEnabled) {
      // Create a no-op logger that does nothing
      this.createNoOpMethods();
      return;
    }
    
    this.logFile = path.join(__dirname, '../../logs/websocket-events.log');
    this.ensureLogDirectory();
    
    // Clear previous log on startup
    this.clearLog();
    this.log('SYSTEM', 'WebSocketEventLogger initialized', { 
      timestamp: new Date().toISOString(),
      debugLevel: process.env.DEBUG_WEBSOCKET || process.env.DEBUG || 'basic'
    });
  }

  checkLoggingEnabled() {
    // Enable logging if any of these environment variables are set
    return !!(
      process.env.DEBUG ||                    // General debug
      process.env.DEBUG_WEBSOCKET ||          // WebSocket specific debug
      process.env.NODE_ENV === 'debug' ||     // Debug environment
      process.env.WS_DEBUG                    // WebSocket debug shorthand
    );
  }

  createNoOpMethods() {
    // Create no-op methods when logging is disabled
    this.log = () => {};
    this.logEventReceived = () => {};
    this.logEventProcessed = () => {};
    this.logEventIgnored = () => {};
    this.logEventError = () => {};
    this.logNormalized = () => {};
    this.logForwarded = () => {};
    this.logStateChanged = () => {};
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  clearLog() {
    try {
      fs.writeFileSync(this.logFile, '');
    } catch (error) {
      console.error('❌ Failed to clear WebSocket event log:', error);
    }
  }

  log(stage, action, data = {}) {
    // If logging is disabled, this method is already a no-op from createNoOpMethods()
    if (!this.isEnabled) return;
    
    const timestamp = new Date().toISOString();
    const caller = this.getCallerInfo();
    
    const logEntry = {
      timestamp,
      stage, // 'WS_CLIENT', 'INITIALIZER', 'EVENT_HANDLER', 'NORMALIZER', 'FSM', 'SYSTEM'
      action, // 'RECEIVED', 'FORWARDED', 'NORMALIZED', 'PROCESSED', 'IGNORED', 'ERROR'
      file: caller.file,
      line: caller.line,
      data
    };

    // Log to file
    const logLine = JSON.stringify(logEntry, null, 2) + '\n---\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine);
      
      // Console logging based on debug level
      const debugLevel = process.env.DEBUG_WEBSOCKET || process.env.DEBUG || 'basic';
      const shouldLogToConsole = debugLevel === 'verbose' || debugLevel === 'all';
      
      if (shouldLogToConsole || action === 'ERROR') {
        // Always log errors to console, log others only in verbose mode
        const shortMsg = `[${stage}] ${action} at ${caller.file}:${caller.line}`;
        if (data.eventType || data.Event) {
          console.log(`🔍 ${shortMsg} - Event: ${data.eventType || data.Event}`);
        } else {
          console.log(`🔍 ${shortMsg}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to write to WebSocket event log:', error);
    }
  }

  getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    
    // Look for the first non-logger line
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes('WebSocketEventLogger')) {
        const match = line.match(/at\s+(?:.*\s+\()?([^)]+):(\d+):\d+\)?/);
        if (match) {
          return {
            file: path.basename(match[1]),
            line: match[2]
          };
        }
      }
    }
    
    return {
      file: 'unknown',
      line: '0'
    };
  }

  // Convenience methods for common logging patterns
  logEventReceived(source, event) {
    this.log('WS_CLIENT', 'RECEIVED', {
      source,
      eventType: event.eventType || event.Event,
      hasImageStatistics: !!event.ImageStatistics,
      rawEventKeys: Object.keys(event)
    });
  }

  logEventForwarded(source, event) {
    this.log('WS_CLIENT', 'FORWARDED', {
      eventType: event.eventType || event.Event,
      to: 'next_component'
    });
  }

  logEventProcessed(source, event, result) {
    this.log('EVENT_HANDLER', 'PROCESSED', {
      eventType: event.eventType || event.Event,
      result,
      stateChanged: result?.stateChanged || false
    });
  }

  logEventIgnored(source, event, reason) {
    this.log('EVENT_HANDLER', 'IGNORED', {
      eventType: event.eventType || event.Event,
      reason
    });
  }

  logError(source, error, context = {}) {
    this.log('SYSTEM', 'ERROR', {
      source,
      error: error.message,
      context
    });
  }
}

// Create and export singleton instance
const wsLogger = new WebSocketEventLogger();
module.exports = wsLogger;
