import Database from 'better-sqlite3';
import path from 'path';
import { AppConfig } from '../types/config';

export class ConfigDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Use provided path or default to project root
    this.dbPath = dbPath || path.join(process.cwd(), 'dashboard-config.sqlite');
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase() {
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
    `);

    // Initialize default configuration if empty
    const count = this.db.prepare('SELECT COUNT(*) as count FROM config').get() as { count: number };
    if (count.count === 0) {
      this.initializeDefaultConfig();
    }
  }

  private initializeDefaultConfig() {
    const defaultConfig: AppConfig = {
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
  setConfigValue(key: string, value: any, category: string = 'general'): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO config (key, value, category)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, JSON.stringify(value), category);
  }

  // Get configuration value
  getConfigValue<T>(key: string, defaultValue: T): T {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    
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
  setConfig(config: AppConfig): void {
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

      // Advanced configuration
      this.setConfigValue('advanced', config.advanced, 'advanced');
    });

    transaction();
  }

  // Get entire configuration object
  getConfig(): AppConfig {
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
      advanced: this.getConfigValue('advanced', {
        debugMode: false,
        logLevel: "info",
        enableMockData: true,
        corsEnabled: true
      })
    };
  }

  // Get all configuration by category
  getConfigByCategory(category: string): Record<string, any> {
    const stmt = this.db.prepare('SELECT key, value FROM config WHERE category = ?');
    const results = stmt.all(category) as { key: string; value: string }[];
    
    const config: Record<string, any> = {};
    results.forEach(row => {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch (error) {
        console.error(`Error parsing config value for key ${row.key}:`, error);
      }
    });
    
    return config;
  }

  // Export configuration to JSON file (backup)
  exportToJson(filePath: string): void {
    const config = this.getConfig();
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  }

  // Import configuration from JSON file
  importFromJson(filePath: string): void {
    const fs = require('fs');
    const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.setConfig(configData);
  }

  // Close database connection
  close(): void {
    this.db.close();
  }

  // Get database statistics
  getStats(): { totalConfigs: number; categories: string[]; lastUpdate: string } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM config');
    const categoriesStmt = this.db.prepare('SELECT DISTINCT category FROM config ORDER BY category');
    const lastUpdateStmt = this.db.prepare('SELECT MAX(updated_at) as lastUpdate FROM config');

    const count = (countStmt.get() as { count: number }).count;
    const categories = (categoriesStmt.all() as { category: string }[]).map(row => row.category);
    const lastUpdate = (lastUpdateStmt.get() as { lastUpdate: string }).lastUpdate;

    return {
      totalConfigs: count,
      categories,
      lastUpdate
    };
  }
}

// Singleton instance
let configDbInstance: ConfigDatabase | null = null;

export const getConfigDatabase = (dbPath?: string): ConfigDatabase => {
  if (!configDbInstance) {
    configDbInstance = new ConfigDatabase(dbPath);
  }
  return configDbInstance;
};

export default ConfigDatabase;
