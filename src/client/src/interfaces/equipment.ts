/**
 * NINA Equipment and Status interfaces
 * Extracted to reduce component file sizes
 */

/**
 * Equipment and NINA integration interfaces
 */
import { NINAEvent } from './nina';

// Basic equipment information
export interface EquipmentInfo {
  name: string;
  connected: boolean;
  temperature?: number | null;
  status?: string;
  lastUpdate?: string;
}

export interface CameraInfo extends EquipmentInfo {
  temperature: number | null;
  coolerOn: boolean;
  gain: number;
  exposureTime: number;
  imageFormat: string;
}

export interface MountInfo extends EquipmentInfo {
  tracking: boolean;
  position: {
    ra: string;
    dec: string;
    altitude: number;
    azimuth: number;
  };
  parked: boolean;
  slewing: boolean;
}

export interface FilterWheelInfo extends EquipmentInfo {
  position: number;
  filterName: string;
  filters: string[];
}

export interface FocuserInfo extends EquipmentInfo {
  position: number;
  temperature: number | null;
  moving: boolean;
}

export interface GuiderInfo extends EquipmentInfo {
  state: 'Stopped' | 'Starting' | 'Guiding' | 'Dithering' | 'Paused';
  rmsError: {
    ra: number;
    dec: number;
    total: number;
  };
  pixelScale: number;
}

export interface WeatherInfo extends EquipmentInfo {
  cloudCover: number | null;
  dewPoint: number | null;
  humidity: number | null;
  pressure: number | null;
  rainRate: number | null;
  skyBrightness: number | null;
  skyQuality: number | null;
  skyTemperature: number | null;
  starFWHM: number | null;
  temperature: number | null;
  windDirection: number | null;
  windGust: number | null;
  windSpeed: number | null;
}

export interface SafetyMonitorInfo extends EquipmentInfo {
  isSafe: boolean;
}

export interface FlatPanelInfo extends EquipmentInfo {
  brightness: number;
  lightOn: boolean;
  coverOpen: boolean;
}

export interface RotatorInfo extends EquipmentInfo {
  position: number;
  mechanicalPosition: number;
  moving: boolean;
  reverse: boolean;
}

// Combined Equipment Status
export interface NINAEquipmentStatus {
  camera: CameraInfo | null;
  mount: MountInfo | null;
  filterWheel: FilterWheelInfo | null;
  focuser: FocuserInfo | null;
  guider: GuiderInfo | null;
  weather: WeatherInfo | null;
  safetyMonitor: SafetyMonitorInfo | null;
  flatPanel: FlatPanelInfo | null;
  rotator: RotatorInfo | null;
}

// NINA API Response Types
export interface NINAApiResponse<T = any> {
  Success: boolean;
  Response: T;
  Error?: string;
  StatusCode?: number;
}

// NINA Event Types
export type EquipmentEventType = 
  | 'CAMERA-CONNECTED'
  | 'CAMERA-DISCONNECTED'
  | 'MOUNT-CONNECTED'
  | 'MOUNT-DISCONNECTED'
  | 'FILTERWHEEL-CONNECTED'
  | 'FILTERWHEEL-DISCONNECTED'
  | 'FOCUSER-CONNECTED'
  | 'FOCUSER-DISCONNECTED'
  | 'GUIDER-CONNECTED'
  | 'GUIDER-DISCONNECTED'
  | 'ROTATOR-CONNECTED'
  | 'ROTATOR-DISCONNECTED'
  | 'WEATHER-CONNECTED'
  | 'WEATHER-DISCONNECTED'
  | 'FLAT-PANEL-CONNECTED'
  | 'FLAT-PANEL-DISCONNECTED'
  | 'SAFETY-MONITOR-CONNECTED'
  | 'SAFETY-MONITOR-DISCONNECTED';

export interface EquipmentEvent extends NINAEvent {
  Type: EquipmentEventType;
  Data: {
    DeviceId?: string;
    DeviceName?: string;
    Connected?: boolean;
  };
}

// Sequence and Imaging Events
export interface SequenceEvent extends NINAEvent {
  Type: 'SEQUENCE-STARTING' | 'SEQUENCE-FINISHED' | 'SEQUENCE-PAUSED' | 'SEQUENCE-RESUMED';
  Data: {
    SequenceName?: string;
    ProjectName?: string;
    TargetName?: string;
  };
}

export interface ImageEvent extends NINAEvent {
  Type: 'IMAGE-SAVE' | 'IMAGE-FAILED';
  Data: {
    FileName?: string;
    FilePath?: string;
    Filter?: string;
    ExposureTime?: number;
    Temperature?: number;
  };
}

// Image Viewer Interfaces
export interface ImageHistoryItem {
  Date: string;
  Filter: string;
  ExposureTime: number;
  ImageType: string;
  CameraName: string;
  Temperature: number;
  Gain: number;
  Offset: number;
  Mean?: number;
  StDev?: number;
  HFR?: number;
  Stars?: number;
  Median?: number;
  TelescopeName?: string;
  FocalLength?: number;
  IsBayered?: boolean;
  RmsText?: string;
}

export interface ImageData {
  Success: boolean;
  Response: string; // Base64 encoded image
  StatusCode: number;
  Error: string | null;
}

// NINA Connection Status
export interface NinaConnectionStatus {
  connected: boolean;
  message: string;
  mockMode?: boolean;
}
