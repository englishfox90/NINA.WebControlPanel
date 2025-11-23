// Unified WebSocket State Interfaces
// TypeScript definitions for the unified state system

/**
 * Equipment status values
 */
export type EquipmentStatus = 
  | 'idle'
  | 'slewing'
  | 'tracking'
  | 'exposing'
  | 'settling'
  | 'error'
  | 'warming'
  | 'cooling'
  | 'calibrating'
  | 'moving'
  | 'disconnected'
  | 'unknown';

/**
 * Equipment types
 */
export type EquipmentType = 
  | 'mount'
  | 'camera'
  | 'filterWheel'
  | 'guider'
  | 'focuser'
  | 'rotator'
  | 'other';

/**
 * Frame types
 */
export type FrameType = 'LIGHT' | 'DARK' | 'BIAS' | 'FLAT' | null;

/**
 * Update kinds for WebSocket messages
 */
export type UpdateKind = 
  | 'session'
  | 'equipment'
  | 'image'
  | 'stack'
  | 'events'
  | 'fullSync'
  | 'heartbeat';

/**
 * Target information
 */
export interface TargetInfo {
  projectName: string | null;
  targetName: string | null;
  ra: number | null;
  dec: number | null;
  panelIndex: number | null;
  rotationDeg: number | null;
  rotation: number | null;
}

/**
 * Image progress
 */
export interface ImageProgress {
  frameIndex: number | null;
  totalFrames: number | null;
}

/**
 * Last captured image
 */
export interface LastImage {
  at: string;
  filePath: string | null;
  stars: number | null;
  hfr: number | null;
}

/**
 * Imaging information
 */
export interface ImagingInfo {
  currentFilter: string | null;
  exposureSeconds: number | null;
  frameType: FrameType;
  sequenceName: string | null;
  progress: ImageProgress | null;
  lastImage: LastImage | null;
}

/**
 * Guiding information
 */
export interface GuidingInfo {
  isGuiding: boolean;
  lastRmsTotal: number | null;
  lastRmsRa: number | null;
  lastRmsDec: number | null;
  lastUpdate: string | null;
}

/**
 * Current session data
 */
export interface CurrentSession {
  isActive: boolean | null;
  startedAt: string | null;
  target: TargetInfo;
  imaging: ImagingInfo;
  guiding: GuidingInfo;
}

/**
 * Equipment device
 */
export interface EquipmentDevice {
  id: string;
  type: EquipmentType;
  name: string;
  connected: boolean;
  status: EquipmentStatus;
  lastChange: string | null;
  details: Record<string, any>;
}

/**
 * Recent event
 */
export interface RecentEvent {
  time: string;
  type: string;
  summary: string;
  meta?: Record<string, any>;
}

/**
 * Unified state object
 */
export interface UnifiedState {
  currentSession: CurrentSession | null;
  equipment: EquipmentDevice[];
  recentEvents: RecentEvent[];
}

/**
 * Changed information in WebSocket message
 */
export interface StateChange {
  path: string;
  summary: string;
  meta?: Record<string, any>;
}

/**
 * Unified WebSocket message envelope
 */
export interface UnifiedWsMessage {
  schemaVersion: 1;
  timestamp: string;
  updateKind: UpdateKind;
  updateReason: string;
  changed: StateChange | null;
  state: UnifiedState;
}

/**
 * Unified state system status
 */
export interface UnifiedStateStatus {
  initialized: boolean;
  seeded: boolean;
  ninaWebSocket: string;
  equipmentCount: number;
  sessionActive: boolean;
  recentEventCount: number;
}
