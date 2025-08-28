import { AppConfig, DEFAULT_CONFIG } from '../types/config';

class ConfigService {
  config: AppConfig;
  configKey = 'observatory-dashboard-config';

  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig(): AppConfig {
    try {
      const savedConfig = localStorage.getItem(this.configKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        return this.mergeWithDefaults(parsed);
      }
      return DEFAULT_CONFIG;
    } catch (error) {
      console.warn('Error loading config, using defaults:', error);
      return DEFAULT_CONFIG;
    }
  }

  async loadFromConfigFileAsync(): Promise<void> {
    try {
      const response = await fetch('/config.json');
      if (response.ok) {
        const fileConfig = await response.json();
        this.config = this.mergeWithDefaults(fileConfig);
      }
    } catch (error) {
      console.warn('Could not load config.json, using defaults:', error);
    }
  }

  mergeWithDefaults(partialConfig: Partial<AppConfig>): AppConfig {
    return {
      nina: { ...DEFAULT_CONFIG.nina, ...partialConfig.nina },
      database: { ...DEFAULT_CONFIG.database, ...partialConfig.database },
      streams: { ...DEFAULT_CONFIG.streams, ...partialConfig.streams },
      directories: { ...DEFAULT_CONFIG.directories, ...partialConfig.directories },
      dashboard: { ...DEFAULT_CONFIG.dashboard, ...partialConfig.dashboard },
      notifications: {
        ...DEFAULT_CONFIG.notifications,
        ...partialConfig.notifications,
        alertThresholds: {
          ...DEFAULT_CONFIG.notifications.alertThresholds,
          ...partialConfig.notifications?.alertThresholds
        }
      },
      observatory: {
        ...DEFAULT_CONFIG.observatory,
        ...partialConfig.observatory,
        location: {
          ...DEFAULT_CONFIG.observatory.location,
          ...partialConfig.observatory?.location
        }
      },
      advanced: { ...DEFAULT_CONFIG.advanced, ...partialConfig.advanced }
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  updateConfig(newConfig: AppConfig): void {
    this.config = this.mergeWithDefaults(newConfig);
    this.saveConfig();
  }

  updateSection(section: string, sectionConfig: any): void {
    const configAny: any = this.config;
    this.config = {
      ...this.config,
      [section]: { ...configAny[section], ...sectionConfig }
    };
    this.saveConfig();
  }

  updateValue(section: string, key: string, value: any): void {
    const configAny: any = this.config;
    const currentSection = configAny[section] || {};
    this.config = {
      ...this.config,
      [section]: { ...currentSection, [key]: value }
    };
    this.saveConfig();
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  saveConfig(): void {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving config to localStorage:', error);
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(jsonString: string): boolean {
    try {
      const importedConfig = JSON.parse(jsonString);
      this.config = this.mergeWithDefaults(importedConfig);
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }

  clearConfig(): void {
    localStorage.removeItem(this.configKey);
    this.config = { ...DEFAULT_CONFIG };
  }
}

const configService = new ConfigService();
configService.loadFromConfigFileAsync();

export default configService;
