/**
 * Pegasus Unity Platform API Interface Definitions
 * Validated against: PPBAdvance (PPBAAYSXQ3A) v2.12.3
 * Last Updated: December 15, 2025
 */

// ==================== Aggregate Report (Primary Data Source) ====================

export interface PegasusAggregateReport {
  status: string;  // "success"
  code: number;    // 200, 400, 401, 403, 404, 500, 501
  message: string; // "Readings report."
  data: {
    uniqueKey: string;  // UUID (e.g., "d003f9bc-6695-4398-9e09-5ccff0bc4b41")
    name: string;       // Device type (e.g., "PPBAdvance")
    message: AggregateReportMessage;
  };
}

export interface AggregateReportMessage {
  messageType: string;  // "AggregateReportPPB"
  
  // Power Metrics
  voltage: number;      // Volts (e.g., 13.2)
  current: number;      // Total Amps (e.g., 0.44)
  quadCurrent: number;  // Quad USB current in Amps (e.g., 0.3)
  power: number;        // Watts (e.g., 5)
  
  // Environmental Metrics
  temperature: number;  // Celsius (e.g., 14.4)
  humidity: number;     // Percentage (e.g., 48)
  dewPoint: number;     // Celsius (e.g., 3.5)
  
  // Operational Status
  isOverCurrent: boolean;
  averageAmps: number;   // Running average (e.g., 0.21)
  ampsPerHour: number;   // Amp-hour consumption (e.g., 0.34)
  wattPerHour: number;   // Watt-hour consumption (e.g., 4.45)
  upTime: string;        // TimeSpan format "HH:MM:SS.mmmmmmm" (e.g., "01:35:28.3530000")
  
  // Dew Heater Hub Status
  dewHubStatus: DewHubStatus;
  
  // Power Hub Status
  powerHubStatus: SwitchState;
  
  // Variable Voltage Port (PPBAdvance only)
  powerVariablePortStatus: SwitchState;
  
  // Dual USB Status (PPBAdvance only)
  ppbA_DualUSB2Status: SwitchState;
}

export interface DewHubStatus {
  messageType: string;  // "DewHubStatusPPB"
  hub: DewPortStatus[];
}

export interface DewPortStatus {
  messageType: string;  // "DewPortStatus"
  current: PortCurrentStatus;
  port: DewPortState;
}

export interface PortCurrentStatus {
  messageType: string;  // "PortCurrentStatus"
  value: number;        // Current in Amps
  isOverCurrent: boolean;
}

export interface DewPortState {
  messageType: string;  // "DewPortState"
  number: number;       // Port number (1-based)
  power: number;        // Power percentage (0-100)
}

export interface SwitchState {
  messageType: string;  // "SwitchState"
  state: string;        // "ON" | "OFF"
}

// ==================== Connected Devices ====================

export interface PegasusConnectedDevicesResponse {
  status: string;  // "success"
  code: number;    // 200
  message: string; // "Connected Devices :1"
  data: PegasusConnectedDevice[];
}

export interface PegasusConnectedDevice {
  uniqueKey: string;   // "d003f9bc-6695-4398-9e09-5ccff0bc4b41"
  name: string;        // "PPBAdvance"
  fullName: string;    // "Pocket PowerBox Advance"
  deviceID: string;    // "PPBAAYSXQ3A"
  firmware: string;    // "2.12.3"
  revision: string;    // "A"
}

// ==================== Telemetry Data ====================

export interface PegasusTelemetryResponse {
  status: string;  // "success"
  code: number;    // 200
  message: string; // "GetTelemetrySessionData"
  data: PegasusTelemetryData[];
}

export interface PegasusTelemetryData {
  deviceType: string;        // "PPBAdvance [PPBAAYSXQ3A]"
  deviceSerialNum: string;   // "PPBAAYSXQ3A"
  upTime: string;            // Hours as decimal (e.g., "0.45")
  averageAmps: string;       // Average amps as string (e.g., "0.2")
  lowestVoltage: string;     // Minimum voltage recorded (e.g., "13.2")
  highestVoltage: string;    // Maximum voltage recorded (e.g., "13.2")
  lostPackets: number;       // Packet loss count
  messageType: string;       // "TelemetryDevice"
}

// ==================== Specific Report Types ====================

export interface PegasusPowerReport {
  status: string;
  code: number;
  message: string;  // "Power Readings report."
  data: {
    uniqueKey: string;
    name: string;
    message: {
      voltage: number;
      current: number;
      power: number;
      messageType: string;  // "PowerReport"
    };
  };
}

export interface PegasusPowerConsumptionReport {
  status: string;
  code: number;
  message: string;  // "Power Consumption Readings report."
  data: {
    uniqueKey: string;
    name: string;
    message: {
      averageAmps: number;
      ampsPerHour: number;
      wattPerHour: number;
      messageType: string;  // "PowerConsumptionReport"
    };
  };
}

// ==================== Widget Props ====================

export interface PegasusPowerWidgetProps {
  widgetId: string;
}

// ==================== Device Types ====================

export type PegasusDeviceType = 
  | 'PPBAdvance' 
  | 'PPB' 
  | 'PPBMicro' 
  | 'UPBv3' 
  | 'UPBv2' 
  | 'SaddlePowerBox';

// ==================== Configuration ====================

export interface PegasusConfig {
  enabled: boolean;
  unityBaseUrl: string;           // Default: "http://localhost:32000"
  deviceType: PegasusDeviceType | null;
  uniqueKey: string;              // UUID from Pegasus Unity
  deviceID: string;               // Serial number (e.g., "PPBAAYSXQ3A")
  deviceName: string;             // Human-readable name (e.g., "Pocket PowerBox Advance")
  firmware: string;               // Firmware version
  refreshInterval: number;        // Default: 5000ms
}

// ==================== Helper Types for Widget ====================

export interface PowerMetrics {
  voltage: number;
  current: number;
  power: number;
  quadCurrent: number;
}

export interface EnvironmentalMetrics {
  temperature: number;
  humidity: number;
  dewPoint: number;
}

export interface ConsumptionMetrics {
  averageAmps: number;
  ampsPerHour: number;
  wattPerHour: number;
  upTime: string;
}

export interface DeviceStatus {
  connected: boolean;
  deviceName: string;
  deviceID: string;
  firmware: string;
  isOverCurrent: boolean;
}
