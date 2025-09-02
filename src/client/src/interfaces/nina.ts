import type { EquipmentInfo } from './equipment';

export interface NINAStatus {
  isConnected: boolean;
  isRunning: boolean;
  progress: number; // Percentage of completion
  error?: string; // Optional error message
}

export interface NINASettings {
  exposureTime: number; // in seconds
  gain: number; // Camera gain
  temperature: number; // Camera temperature
}

export interface NINAData {
  status: NINAStatus;
  settings: NINASettings;
  lastImageUrl?: string; // URL of the last captured image
}

export interface NINAStatusResponse {
  status: string;
  isConnected: boolean;
  isRunning: boolean;
  progress: number;
  currentTarget?: string;
  sequenceProgress?: {
    current: number;
    total: number;
  };
  equipment?: {
    camera: {
      connected: boolean;
      temperature: number;
    };
    mount: {
      connected: boolean;
      tracking: boolean;
    };
    filterWheel: {
      connected: boolean;
      position: number;
      filter: string;
    };
  };
}

export interface NINAApiError {
  error: string;
  code: number;
  timestamp: string;
}

// NINA Event Types for WebSocket integration
export interface NINAEvent {
  Event: string;
  Time: string;
  [key: string]: any;
}

export interface NINAEventResponse {
  Response: NINAEvent | NINAEvent[];
  Error: string;
  StatusCode: number;
  Success: boolean;
  Type: string;
}

export interface NINATargetEvent extends NINAEvent {
  TargetName: string;
  ProjectName: string;
  TargetEndTime: string;
  Rotation: number;
  Coordinates: {
    RA: number;
    Dec: number;
    RAString: string;
    DecString: string;
    Epoch: string;
    RADegrees: number;
  };
}

export interface NINAFilterEvent extends NINAEvent {
  Previous: { Name: string; Id: number };
  New: { Name: string; Id: number };
}

export interface NINASafetyEvent extends NINAEvent {
  IsSafe: boolean;
}

export interface NINAImageEvent extends NINAEvent {
  ImageStatistics?: {
    ExposureTime: number;
    Index: number;
    Filter: string;
    RmsText: string;
    Temperature: number;
    CameraName: string;
    Gain: number;
    Offset: number;
    Date: string;
    TelescopeName: string;
    FocalLength: number;
    StDev: number;
    Mean: number;
    Median: number;
    Stars: number;
    HFR: number;
    IsBayered: boolean;
  };
}

// NINA Status Widget Interfaces
export interface Equipment extends EquipmentInfo {
  deviceName: string;
  // name, connected, status are already in EquipmentInfo
}

export interface EquipmentResponse {
  equipment: Equipment[];
  summary: {
    connected: number;
    total: number;
    allConnected: boolean;
    status: string;
  };
  lastUpdate: string;
  mockMode?: boolean;
}

export interface NINAStatusProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

// Guider Graph Widget Interfaces
export interface GuideStep {
  Id: number;                    // Step ID
  IdOffsetLeft: number;         // Left offset
  IdOffsetRight: number;        // Right offset
  RADistanceRaw: number;        // Raw RA distance
  RADistanceRawDisplay: number; // Display RA distance
  RADuration: number;           // RA correction duration
  DECDistanceRaw: number;       // Raw Dec distance
  DECDistanceRawDisplay: number;// Display Dec distance
  DECDuration: number;          // Dec correction duration
  Dither: string;              // Dither event marker
  timestamp?: number;           // Computed timestamp for chart
}

export interface GuiderRMSStats {
  RA: number;           // RA RMS error
  Dec: number;          // Dec RMS error  
  Total: number;        // Total RMS
  RAText: string;       // Formatted RA RMS
  DecText: string;      // Formatted Dec RMS
  TotalText: string;    // Formatted total RMS
  PeakRAText: string;   // Peak RA error text
  PeakDecText: string;  // Peak Dec error text
  Scale: number;        // Pixel scale
  PeakRA: number;       // Peak RA error
  PeakDec: number;      // Peak Dec error
  DataPoints: number;   // Number of data points
}

export interface GuiderGraphResponse {
  Response: {
    RMS: GuiderRMSStats;
    Interval: number;       // Guide interval (seconds)
    MaxY: number;          // Chart max Y axis
    MinY: number;          // Chart min Y axis
    MaxDurationY: number;  // Max duration Y axis
    MinDurationY: number;  // Min duration Y axis
    GuideSteps: GuideStep[]; // Array of guide steps
    HistorySize: number;   // Number of steps stored
    PixelScale: number;    // Arcsec per pixel
    Scale: number;         // Chart scale
  };
  Error: string;
  StatusCode: number;
  Success: boolean;
  Type: string;
}

export interface GuiderGraphData extends GuiderGraphResponse {
  timestamp: number;     // Add fetch timestamp
  connected: boolean;    // Guider connection status
  isGuiding: boolean;    // Active guiding status
}

export interface GuiderGraphWidgetProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}