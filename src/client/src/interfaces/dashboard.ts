import { ReactNode } from 'react';
import type { ImageData } from './equipment';

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

// Component-specific Props
export interface RTSPViewerProps {
  streams: string[];
  isConnected: boolean;
  hideHeader?: boolean;
  stats?: {
    resolution?: string;
    frameRate?: string;
    bitrate?: string;
  }[];
}

export interface ImageViewerProps {
  images?: ImageData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  hideHeader?: boolean;
}

export interface MobileLayoutProps {
  children: ReactNode;
}

// Settings Modal interfaces
export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

// Scheduler Widget interfaces
export interface TargetSchedulerProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}