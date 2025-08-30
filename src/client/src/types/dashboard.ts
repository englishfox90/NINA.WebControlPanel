import { ReactNode } from 'react';

// Dashboard related type definitions
export interface DashboardState {
  ninaStatus: string;
  gearProgress: number;
  rtspFeeds: string[];
  latestImage: string | null;
  isOnline: boolean;
  lastUpdate: string;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
}

export interface DashboardProps {
  state?: DashboardState;
  onRefresh?: () => void;
}

export interface WidgetProps {
  title: string;
  status?: 'online' | 'offline' | 'warning' | 'idle';
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

export interface DataRowProps {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'error';
  unit?: string;
}

export interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  status?: 'success' | 'warning' | 'error';
  showPercentage?: boolean;
}

export interface VideoStreamProps {
  streamUrl?: string;
  title: string;
  isConnected: boolean;
  onReconnect?: () => void;
}

export interface ImageData {
  id: string;
  url: string;
  thumbnail?: string;
  timestamp: string;
  metadata?: {
    exposure?: string;
    filter?: string;
    temperature?: number;
    target?: string;
  };
}

export interface ImageViewerProps {
  images: ImageData[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Time and Astronomical Widget Types
export interface TimeData {
  serverTime: string;
  browserTime: string;
  timeZoneOffset: number;
  isDifferent: boolean;
}

export interface MoonPhase {
  phase: string;
  illumination: number;
  name: string;
}

export interface AstronomicalData {
  sunrise: string;
  sunset: string;
  civilTwilightBegin: string;
  civilTwilightEnd: string;
  nauticalTwilightBegin: string;
  nauticalTwilightEnd: string;
  astronomicalTwilightBegin: string;
  astronomicalTwilightEnd: string;
  currentPhase: 'night' | 'astronomical' | 'nautical' | 'civil' | 'daylight';
  moonPhase: MoonPhase;
  // Multi-day data for 8-hour window handling
  multiDay?: {
    yesterday: {
      date: string;
      sunset?: string;
      civilTwilightEnd?: string;
      nauticalTwilightEnd?: string;
      astronomicalTwilightEnd?: string;
    };
    today: {
      date: string;
      sunrise: string;
      sunset: string;
      civilTwilightBegin: string;
      civilTwilightEnd: string;
      nauticalTwilightBegin: string;
      nauticalTwilightEnd: string;
      astronomicalTwilightBegin: string;
      astronomicalTwilightEnd: string;
    };
    tomorrow: {
      date: string;
      sunrise?: string;
      civilTwilightBegin?: string;
      nauticalTwilightBegin?: string;
      astronomicalTwilightBegin?: string;
    };
  };
}

export interface TimeAstronomicalData {
  time: TimeData;
  astronomical: AstronomicalData;
  lastUpdate: string;
}