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