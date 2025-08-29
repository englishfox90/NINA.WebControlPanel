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