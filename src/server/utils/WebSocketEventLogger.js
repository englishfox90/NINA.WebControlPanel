// Enhanced WebSocket Event Logger
// Logs all WebSocket events and their processing journey through the system

const fs = require('fs');
const path = require('path');

class WebSocketEventLogger {
  constructor() {
    this.logFile = path.join(__dirname, '../../logs/websocket-events.log');
    this.ensureLogDirectory();
    
    // Clear previous log on startup
    this.clearLog();
    this.log('SYSTEM', 'WebSocketEventLogger initialized', { timestamp: new Date().toISOString() });
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

    const logLine = JSON.stringify(logEntry, null, 2) + '\n---\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine);
      
      // Also log to console for immediate visibility
      const shortMsg = `[${stage}] ${action} at ${caller.file}:${caller.line}`;
      if (data.eventType || data.Event) {
        console.log(`🔍 ${shortMsg} - Event: ${data.eventType || data.Event}`);
      } else {
        console.log(`🔍 ${shortMsg}`);
      }
    } catch (error) {
      console.error('❌ Failed to write WebSocket event log:', error);
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
    
    return { file: 'unknown', line: 'unknown' };
  }

  // Helper methods for common log patterns
  logEventReceived(source, event) {
    this.log(source, 'RECEIVED', {
      eventType: event?.Event || event?.Response?.Event,
      Type: event?.Type,
      Success: event?.Success,
      hasImageStatistics: !!event?.Response?.ImageStatistics,
      rawEventKeys: Object.keys(event || {})
    });
  }

  logEventForwarded(source, event) {
    this.log(source, 'FORWARDED', {
      eventType: event?.Event || event?.Response?.Event,
      to: 'next_component'
    });
  }

  logEventProcessed(source, event, result) {
    this.log(source, 'PROCESSED', {
      eventType: event?.eventType || event?.Event,
      result,
      stateChanged: result?.stateChanged
    });
  }

  logEventIgnored(source, event, reason) {
    this.log(source, 'IGNORED', {
      eventType: event?.Event || event?.Response?.Event,
      reason
    });
  }

  logError(source, error, context = {}) {
    this.log(source, 'ERROR', {
      error: error.message,
      stack: error.stack,
      context
    });
  }
}

// Create singleton instance
const wsLogger = new WebSocketEventLogger();

module.exports = wsLogger;
