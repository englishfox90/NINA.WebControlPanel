// Configuration service module - temporarily disabled
// This module is being refactored to work with SQLite backend

import axios from 'axios';
import { AppConfig } from '../interfaces/config';

// Placeholder service for compilation
export class ConfigService {
  static async getConfig(): Promise<AppConfig> {
    // Return default config for now
    return {
      nina: {
        apiPort: 1888,
        baseUrl: "http://172.26.81.152/",
        timeout: 5000,
        retryAttempts: 3,
        guiderExposureDuration: 2.0
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
  }

  static async setConfig(config: AppConfig): Promise<void> {
    // Placeholder - will implement SQLite integration later
    console.log('Config update placeholder:', config);
  }
}

export default ConfigService;