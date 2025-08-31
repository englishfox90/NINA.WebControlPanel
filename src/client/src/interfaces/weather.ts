/**
 * Weather-related interfaces for NINA Web Control Panel
 */

// Weather Widget interfaces
export interface WeatherResponse {
  Response: {
    AveragePeriod: number;
    CloudCover: number;
    DewPoint: number;
    Humidity: number;
    Pressure: number;
    RainRate: string;
    SkyBrightness: string;
    SkyQuality: string;
    SkyTemperature: string;
    StarFWHM: string;
    Temperature: number;
    WindDirection: number;
    WindGust: string;
    WindSpeed: number;
    SupportedActions: string[];
    Connected: boolean;
    Name: string;
    DisplayName: string;
    Description: string;
    DriverInfo: string;
    DriverVersion: string;
    DeviceId: string;
  };
  Error: string;
  StatusCode: number;
  Success: boolean;
  Type: string;
}

export interface WeatherWidgetProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

// Safety Banner interfaces
export interface FlatPanelResponse {
  Response: {
    CoverState: string;
    LocalizedCoverState: string;
    LocalizedLightOnState: string;
    LightOn: boolean;
    Brightness: number;
    SupportsOpenClose: boolean;
    MinBrightness: number;
    MaxBrightness: number;
    Connected: boolean;
    Info: {
      Name: string;
      Description: string;
      DriverInfo: string;
      DriverVersion: string;
    };
    DeviceId: string;
  };
  Error: string;
  StatusCode: number;
  Success: boolean;
  Type: string;
}

export interface ObservatoryStatus {
  roofOpen: boolean;
  flatPanelLightOn: boolean;
  isDaytime: boolean;
}

export interface SafetyBannerProps {
  onDismiss?: () => void;
}
