/**
 * System monitoring interfaces
 */

// System Resource Information
export interface SystemCPU {
  usage: number;
  temperature: number | null;
  cores: number;
  model: string;
  speed: number;
}

export interface SystemMemory {
  total: number;
  used: number;
  free: number;
  available: number;
  usagePercent: number;
  cached?: number;
  buffers?: number;
}

export interface SystemDisk {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  usagePercent: number;
  mountpoint: string;
}

export interface SystemNetwork {
  interface: string;
  rx: number;
  tx: number;
  rxSpeed: number;
  txSpeed: number;
  isUp: boolean;
}

export interface SystemProcess {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  state: string;
}

export interface SystemStatus {
  cpu: SystemCPU;
  memory: SystemMemory;
  disks: SystemDisk[];
  network: SystemNetwork[];
  processes: SystemProcess[];
  uptime: number;
  loadAverage: number[];
  platform: string;
  hostname: string;
  lastUpdate: string;
}

// API-specific system status interface (matches actual API response structure)
export interface SystemStatusAPI {
  timestamp: string;
  uptime: {
    system: { seconds: number; formatted: string };
    process: { seconds: number; formatted: string };
  };
  cpu: {
    model: string;
    cores: number;
    usage: number;
    temperature: number | null;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    main: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
      filesystem: string;
    };
  };
  network: {
    interface: string;
    ip: string;
    rx_sec: number;
    tx_sec: number;
  };
  os: {
    platform: string;
    distro: string;
    hostname: string;
  };
  status: {
    status: 'healthy' | 'warning' | 'critical';
    warnings: string[];
  };
}

export interface SystemStatusProps {
  hideHeader?: boolean;
}

// Astronomical Time Information
export interface AstronomicalTime {
  timezone: string;
  localTime: string;
  utcTime: string;
  julianDate: number;
  localSiderealTime: string;
  
  sun: {
    rise: string | null;
    set: string | null;
    civilTwilightStart: string | null;
    civilTwilightEnd: string | null;
    nauticalTwilightStart: string | null;
    nauticalTwilightEnd: string | null;
    astronomicalTwilightStart: string | null;
    astronomicalTwilightEnd: string | null;
    altitude: number;
    azimuth: number;
    phase: 'day' | 'civil-twilight' | 'nautical-twilight' | 'astronomical-twilight' | 'night';
  };
  
  moon: {
    rise: string | null;
    set: string | null;
    phase: number; // 0-1, 0 = new moon, 0.5 = full moon
    phaseName: string;
    illumination: number; // 0-100%
    altitude: number;
    azimuth: number;
  };
}

// Target Scheduler Information
export interface SchedulerTarget {
  id: number;
  name: string;
  project: string;
  ra: number;
  dec: number;
  raString: string;
  decString: string;
  rotation: number | null;
  priority: number;
  isActive: boolean;
  completionPercent: number;
  estimatedTime: number;
  remainingTime: number;
  nextObservationTime: string | null;
}

export interface SchedulerProgress {
  currentTarget: SchedulerTarget | null;
  upcomingTargets: SchedulerTarget[];
  completedTargets: SchedulerTarget[];
  totalProgress: number;
  sessionTimeRemaining: number;
  nextTargetChange: string | null;
}

// Weather Data
export interface WeatherData {
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGust: number | null;
  dewPoint: number | null;
  cloudCover: number | null;
  skyTemperature: number | null;
  skyBrightness: number | null;
  skyQuality: number | null;
  starFWHM: number | null;
  rainRate: number | null;
  isSafe: boolean;
  conditions: string;
}

// Time and Astronomical Widget Types (moved from dashboard.ts)
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

export interface AstronomicalDataAPI {
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
  astronomical: AstronomicalDataAPI;
  lastUpdate: string;
}

// TimeAstronomicalWidget specific interfaces
export interface TimeAstronomicalWidgetProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

export interface TimePhase {
  name: string;
  start: Date;
  end: Date;
  color: string;
  description: string;
  // Store the real phase times for tooltip display
  realStart: Date;
  realEnd: Date;
}
