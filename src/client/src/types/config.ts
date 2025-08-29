// Configuration types for the observatory dashboard

export interface NINAConfig {
  apiPort: number;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface DatabaseConfig {
  targetSchedulerPath: string;
  backupEnabled: boolean;
  backupInterval: number; // hours
}

export interface StreamsConfig {
  liveFeed1: string;
  liveFeed2: string;
  liveFeed3: string;
  defaultStream: number;
  connectionTimeout: number; // milliseconds
}

export interface DirectoriesConfig {
  liveStackDirectory: string;
  capturedImagesDirectory: string;
  logsDirectory: string;
  tempDirectory: string;
}

export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  theme: 'dark' | 'light';
  mobileOptimized: boolean;
  autoRefresh: boolean;
}

export interface NotificationThresholds {
  temperatureWarning: number; // degrees C
  temperatureCritical: number; // degrees C
  connectionTimeout: number; // seconds
}

export interface NotificationsConfig {
  enabled: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
  alertThresholds: NotificationThresholds;
}

export interface ObservatoryLocation {
  latitude: number;
  longitude: number;
  elevation: number; // meters
  timezone: string;
}

export interface ObservatoryConfig {
  name: string;
  location: ObservatoryLocation;
}

export interface AdvancedConfig {
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMockData: boolean;
  corsEnabled: boolean;
}

export interface AppConfig {
  nina: NINAConfig;
  database: DatabaseConfig;
  streams: StreamsConfig;
  directories: DirectoriesConfig;
  dashboard: DashboardConfig;
  notifications: NotificationsConfig;
  observatory: ObservatoryConfig;
  advanced: AdvancedConfig;
}

// Default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  nina: {
    apiPort: 1888,
    baseUrl: "http://localhost",
    timeout: 5000,
    retryAttempts: 3
  },
  database: {
    targetSchedulerPath: "./schedulerdb.sqlite",
    backupEnabled: true,
    backupInterval: 24
  },
  streams: {
    liveFeed1: "rtsp://192.168.1.100:554/stream1",
    liveFeed2: "rtsp://192.168.1.101:554/stream2", 
    liveFeed3: "rtsp://192.168.1.102:554/stream3",
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
