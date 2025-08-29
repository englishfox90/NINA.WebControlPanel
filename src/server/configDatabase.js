// JavaScript version of ConfigDatabase for Node.js server
const Database = require('better-sqlite3');
const path = require('path');

class ConfigDatabase {
  constructor(dbPath) {
    // Use provided path or default to project root
    this.dbPath = dbPath || path.join(process.cwd(), 'dashboard-config.sqlite');
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Create configuration table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_config_key ON config(key);
      CREATE INDEX IF NOT EXISTS idx_config_category ON config(category);

      CREATE TRIGGER IF NOT EXISTS update_config_timestamp 
      AFTER UPDATE ON config
      BEGIN
        UPDATE config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      -- Create dashboard_widgets table for layout management
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id TEXT PRIMARY KEY,
        component TEXT NOT NULL,
        title TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        w INTEGER NOT NULL,
        h INTEGER NOT NULL,
        minW INTEGER DEFAULT 2,
        minH INTEGER DEFAULT 2,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TRIGGER IF NOT EXISTS update_widgets_timestamp 
      AFTER UPDATE ON dashboard_widgets
      BEGIN
        UPDATE dashboard_widgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Initialize default configuration if empty
    const count = this.db.prepare('SELECT COUNT(*) as count FROM config').get();
    if (count.count === 0) {
      this.initializeDefaultConfig();
    }
    
    // Initialize default widgets if empty
    const widgetCount = this.db.prepare('SELECT COUNT(*) as count FROM dashboard_widgets').get();
    if (widgetCount.count === 0) {
      this.initializeDefaultWidgets();
    }
  }

  initializeDefaultWidgets() {
    const defaultWidgets = [
      { id: 'nina-status', component: 'NINAStatus', title: 'NINA Status', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
      { id: 'system-monitor', component: 'SystemStatusWidget', title: 'System Monitor', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { id: 'scheduler', component: 'SchedulerWidget', title: 'Target Scheduler', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
      { id: 'rtsp-viewer', component: 'RTSPViewer', title: 'Live View', x: 0, y: 8, w: 8, h: 6, minW: 4, minH: 4 },
      { id: 'session-widget', component: 'SessionWidget', title: 'Current Session', x: 12, y: 0, w: 4, h: 15, minW: 3, minH: 10 }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO dashboard_widgets (id, component, title, x, y, w, h, minW, minH)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((widgets) => {
      for (const widget of widgets) {
        stmt.run(widget.id, widget.component, widget.title, widget.x, widget.y, widget.w, widget.h, widget.minW, widget.minH);
      }
    });

    transaction(defaultWidgets);
  }

  initializeDefaultConfig() {
    const defaultConfig = {
      nina: {
        apiPort: 1888,
        baseUrl: "http://172.26.81.152/",
        timeout: 5000,
        retryAttempts: 3
      },
      database: {
        targetSchedulerPath: "./schedulerdb.sqlite",
        backupEnabled: true,
        backupInterval: 24
      },
      streams: {
        liveFeed1: "https://live.starfront.tools/allsky/",
        liveFeed2: "https://live.starfront.tools/b8/",
        liveFeed3: "",
        defaultStream: 1,
        connectionTimeout: 10000
      },
      directories: {
        liveStackDirectory: "D:/Observatory/LiveStacks",
        capturedImagesDirectory: "D:/Observatory/Captured",
        logsDirectory: "./logs",
        tempDirectory: "./temp"
      },
      dashboard: {
        refreshInterval: 5000,
        theme: "dark",
        mobileOptimized: true,
        autoRefresh: true
      },
      notifications: {
        enabled: true,
        emailAlerts: false,
        pushNotifications: true,
        alertThresholds: {
          temperatureWarning: 5,
          temperatureCritical: 15,
          connectionTimeout: 30
        }
      },
      observatory: {
        name: "My Remote Observatory",
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          elevation: 100,
          timezone: "America/New_York"
        }
      },
      layout: {
        widgets: [
          {
            id: "nina-status",
            component: "NINAStatus",
            title: "NINA Status",
            layout: { i: "nina-status", x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }
          },
          {
            id: "system-monitor",
            component: "SystemStatusWidget", 
            title: "System Monitor",
            layout: { i: "system-monitor", x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 }
          },
          {
            id: "scheduler",
            component: "SchedulerWidget",
            title: "Target Scheduler", 
            layout: { i: "scheduler", x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 }
          },
          {
            id: "rtsp-viewer",
            component: "RTSPViewer",
            title: "Live View",
            layout: { i: "rtsp-viewer", x: 0, y: 8, w: 8, h: 6, minW: 4, minH: 4 }
          }
        ]
      },
      advanced: {
        debugMode: false,
        logLevel: "info",
        enableMockData: true,
        corsEnabled: true
      }
    };

    this.setConfig(defaultConfig);
  }

  // Set configuration value
  setConfigValue(key, value, category = 'general') {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO config (key, value, category)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, JSON.stringify(value), category);
  }

  // Get configuration value
  getConfigValue(key, defaultValue) {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key);
    
    if (result) {
      try {
        return JSON.parse(result.value);
      } catch (error) {
        console.error(`Error parsing config value for key ${key}:`, error);
        return defaultValue;
      }
    }
    
    return defaultValue;
  }

  // Set entire configuration object
  setConfig(config) {
    const transaction = this.db.transaction(() => {
      // NINA configuration
      this.setConfigValue('nina.apiPort', config.nina.apiPort, 'nina');
      this.setConfigValue('nina.baseUrl', config.nina.baseUrl, 'nina');
      this.setConfigValue('nina.timeout', config.nina.timeout, 'nina');
      this.setConfigValue('nina.retryAttempts', config.nina.retryAttempts, 'nina');

      // Database configuration
      this.setConfigValue('database.targetSchedulerPath', config.database.targetSchedulerPath, 'database');
      this.setConfigValue('database.backupEnabled', config.database.backupEnabled, 'database');
      this.setConfigValue('database.backupInterval', config.database.backupInterval, 'database');

      // Streams configuration
      this.setConfigValue('streams.liveFeed1', config.streams.liveFeed1, 'streams');
      this.setConfigValue('streams.liveFeed2', config.streams.liveFeed2, 'streams');
      this.setConfigValue('streams.liveFeed3', config.streams.liveFeed3, 'streams');
      this.setConfigValue('streams.defaultStream', config.streams.defaultStream, 'streams');
      this.setConfigValue('streams.connectionTimeout', config.streams.connectionTimeout, 'streams');

      // Directories configuration
      this.setConfigValue('directories.liveStackDirectory', config.directories.liveStackDirectory, 'directories');
      this.setConfigValue('directories.capturedImagesDirectory', config.directories.capturedImagesDirectory, 'directories');
      this.setConfigValue('directories.logsDirectory', config.directories.logsDirectory, 'directories');
      this.setConfigValue('directories.tempDirectory', config.directories.tempDirectory, 'directories');

      // Dashboard configuration
      this.setConfigValue('dashboard.refreshInterval', config.dashboard.refreshInterval, 'dashboard');
      this.setConfigValue('dashboard.theme', config.dashboard.theme, 'dashboard');
      this.setConfigValue('dashboard.mobileOptimized', config.dashboard.mobileOptimized, 'dashboard');
      this.setConfigValue('dashboard.autoRefresh', config.dashboard.autoRefresh, 'dashboard');

      // Notifications configuration
      this.setConfigValue('notifications', config.notifications, 'notifications');

      // Observatory configuration
      this.setConfigValue('observatory', config.observatory, 'observatory');

      // Layout configuration
      if (config.layout) {
        this.setConfigValue('layout', config.layout, 'layout');
      }

      // Advanced configuration
      this.setConfigValue('advanced', config.advanced, 'advanced');
    });

    transaction();
  }

  // Get entire configuration object
  getConfig() {
    return {
      nina: {
        apiPort: this.getConfigValue('nina.apiPort', 1888),
        baseUrl: this.getConfigValue('nina.baseUrl', 'http://172.26.81.152/'),
        timeout: this.getConfigValue('nina.timeout', 5000),
        retryAttempts: this.getConfigValue('nina.retryAttempts', 3)
      },
      database: {
        targetSchedulerPath: this.getConfigValue('database.targetSchedulerPath', './schedulerdb.sqlite'),
        backupEnabled: this.getConfigValue('database.backupEnabled', true),
        backupInterval: this.getConfigValue('database.backupInterval', 24)
      },
      streams: {
        liveFeed1: this.getConfigValue('streams.liveFeed1', 'https://live.starfront.tools/allsky/'),
        liveFeed2: this.getConfigValue('streams.liveFeed2', 'https://live.starfront.tools/b8/'),
        liveFeed3: this.getConfigValue('streams.liveFeed3', ''),
        defaultStream: this.getConfigValue('streams.defaultStream', 1),
        connectionTimeout: this.getConfigValue('streams.connectionTimeout', 10000)
      },
      directories: {
        liveStackDirectory: this.getConfigValue('directories.liveStackDirectory', 'D:/Observatory/LiveStacks'),
        capturedImagesDirectory: this.getConfigValue('directories.capturedImagesDirectory', 'D:/Observatory/Captured'),
        logsDirectory: this.getConfigValue('directories.logsDirectory', './logs'),
        tempDirectory: this.getConfigValue('directories.tempDirectory', './temp')
      },
      dashboard: {
        refreshInterval: this.getConfigValue('dashboard.refreshInterval', 5000),
        theme: this.getConfigValue('dashboard.theme', 'dark'),
        mobileOptimized: this.getConfigValue('dashboard.mobileOptimized', true),
        autoRefresh: this.getConfigValue('dashboard.autoRefresh', true)
      },
      notifications: this.getConfigValue('notifications', {
        enabled: true,
        emailAlerts: false,
        pushNotifications: true,
        alertThresholds: {
          temperatureWarning: 5,
          temperatureCritical: 15,
          connectionTimeout: 30
        }
      }),
      observatory: this.getConfigValue('observatory', {
        name: "My Remote Observatory",
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          elevation: 100,
          timezone: "America/New_York"
        }
      }),
      layout: {
        widgets: this.getWidgets()
      },
      advanced: this.getConfigValue('advanced', {
        debugMode: false,
        logLevel: "info",
        enableMockData: true,
        corsEnabled: true
      })
    };
  }

  // Get all configuration by category
  getConfigByCategory(category) {
    const stmt = this.db.prepare('SELECT key, value FROM config WHERE category = ?');
    const results = stmt.all(category);
    
    const config = {};
    results.forEach(row => {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch (error) {
        console.error(`Error parsing config value for key ${row.key}:`, error);
      }
    });
    
    return config;
  }

  // Widget management methods
  getWidgets() {
    const stmt = this.db.prepare('SELECT * FROM dashboard_widgets WHERE enabled = 1 ORDER BY x, y');
    const widgets = stmt.all();
    
    return widgets.map(widget => ({
      id: widget.id,
      component: widget.component,
      title: widget.title,
      layout: {
        i: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        minW: widget.minW,
        minH: widget.minH
      }
    }));
  }

  addWidget(widget) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dashboard_widgets (id, component, title, x, y, w, h, minW, minH)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(widget.id, widget.component, widget.title, widget.x, widget.y, widget.w, widget.h, widget.minW, widget.minH);
  }

  updateWidget(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = this.db.prepare(`UPDATE dashboard_widgets SET ${fields} WHERE id = ?`);
    const result = stmt.run(...values, id);
    return result;
  }

  removeWidget(id) {
    const stmt = this.db.prepare('UPDATE dashboard_widgets SET enabled = 0 WHERE id = ?');
    stmt.run(id);
  }

  getWidget(id) {
    const stmt = this.db.prepare('SELECT * FROM dashboard_widgets WHERE id = ? AND enabled = 1');
    return stmt.get(id);
  }

  // Close database connection
  close() {
    this.db.close();
  }

  // Get database statistics
  getStats() {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM config');
    const categoriesStmt = this.db.prepare('SELECT DISTINCT category FROM config ORDER BY category');
    const lastUpdateStmt = this.db.prepare('SELECT MAX(updated_at) as lastUpdate FROM config');

    const count = countStmt.get().count;
    const categories = categoriesStmt.all().map(row => row.category);
    const lastUpdate = lastUpdateStmt.get().lastUpdate;

    return {
      totalConfigs: count,
      categories,
      lastUpdate
    };
  }
}

// Singleton instance
let configDbInstance = null;

const getConfigDatabase = (dbPath) => {
  if (!configDbInstance) {
    configDbInstance = new ConfigDatabase(dbPath);
  }
  return configDbInstance;
};

module.exports = { ConfigDatabase, getConfigDatabase };
