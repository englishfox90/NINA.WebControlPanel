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