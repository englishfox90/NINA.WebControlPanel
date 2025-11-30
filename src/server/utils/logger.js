// Comprehensive logging system for NINA WebControlPanel
// Creates rotating log files with 7-day retention

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(serviceName, logDir = null) {
    this.serviceName = serviceName;
    this.logDir = logDir || path.join(__dirname, '../../../logs');
    this.maxAgeDays = 7;
    this.currentDate = null;
    this.logStream = null;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Clean old logs on initialization
    this.cleanOldLogs();
    
    // Set up log stream
    this.setupLogStream();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFilePath() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${this.serviceName}-${date}.log`);
  }

  setupLogStream() {
    const logPath = this.getLogFilePath();
    const date = new Date().toISOString().split('T')[0];
    
    // Close existing stream if date changed
    if (this.currentDate !== date && this.logStream) {
      this.logStream.end();
    }
    
    // Create new stream
    this.logStream = fs.createWriteStream(logPath, { flags: 'a' });
    this.currentDate = date;
  }

  checkDateRollover() {
    const date = new Date().toISOString().split('T')[0];
    if (this.currentDate !== date) {
      this.setupLogStream();
      this.cleanOldLogs();
    }
  }

  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = this.maxAgeDays * 24 * 60 * 60 * 1000; // 7 days in ms

      files.forEach(file => {
        // Only process log files for this service
        if (file.startsWith(this.serviceName) && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  Deleted old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }
  }

  formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.padEnd(5)}] [${this.serviceName}] ${message}${metaStr}\n`;
  }

  writeLog(level, message, meta = null) {
    this.checkDateRollover();
    
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Write to file
    if (this.logStream) {
      this.logStream.write(formattedMessage);
    }
    
    // Also write to console with colors
    const consoleMessage = `[${level.toUpperCase()}] [${this.serviceName}] ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage, meta || '');
        break;
      case 'WARN':
        console.warn(consoleMessage, meta || '');
        break;
      case 'INFO':
        console.log(consoleMessage, meta || '');
        break;
      case 'DEBUG':
        if (process.env.DEBUG) {
          console.log(consoleMessage, meta || '');
        }
        break;
      default:
        console.log(consoleMessage, meta || '');
    }
  }

  info(message, meta) {
    this.writeLog('INFO', message, meta);
  }

  error(message, meta) {
    this.writeLog('ERROR', message, meta);
  }

  warn(message, meta) {
    this.writeLog('WARN', message, meta);
  }

  debug(message, meta) {
    this.writeLog('DEBUG', message, meta);
  }

  // Log HTTP requests
  request(method, path, statusCode, duration) {
    this.info(`${method} ${path} - ${statusCode} (${duration}ms)`);
  }

  // Log API calls
  api(endpoint, method, status, duration, error = null) {
    const meta = { endpoint, method, status, duration };
    if (error) {
      meta.error = error;
      this.error(`API call failed: ${endpoint}`, meta);
    } else {
      this.info(`API call: ${endpoint}`, meta);
    }
  }

  // Close the log stream
  close() {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// Create singleton instances for different services
let backendLogger = null;
let frontendLogger = null;
let buildLogger = null;

function getBackendLogger() {
  if (!backendLogger) {
    backendLogger = new Logger('backend');
  }
  return backendLogger;
}

function getFrontendLogger() {
  if (!frontendLogger) {
    frontendLogger = new Logger('frontend');
  }
  return frontendLogger;
}

function getBuildLogger() {
  if (!buildLogger) {
    buildLogger = new Logger('build');
  }
  return buildLogger;
}

// Express middleware for request logging
function requestLoggerMiddleware(logger) {
  return (req, res, next) => {
    const start = Date.now();
    
    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.request(req.method, req.path, res.statusCode, duration);
    });
    
    next();
  };
}

module.exports = {
  Logger,
  getBackendLogger,
  getFrontendLogger,
  getBuildLogger,
  requestLoggerMiddleware
};
