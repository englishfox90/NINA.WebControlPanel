/**
 * Pegasus Unity Platform API Service
 * Frontend service for calling Pegasus API endpoints
 * Last Updated: December 15, 2025
 */

import type {
  PegasusAggregateReport,
  PegasusConnectedDevicesResponse,
  PegasusTelemetryResponse,
  PegasusPowerReport,
  PegasusPowerConsumptionReport,
  PegasusConnectedDevice
} from '../interfaces/pegasus';

const API_BASE = '/api/pegasus';

/**
 * Check if Pegasus Unity Platform is running and responsive
 */
export async function checkPegasusStatus(): Promise<{
  available: boolean;
  connected: boolean;
  deviceCount: number;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/status`);
    return await response.json();
  } catch (error) {
    return {
      available: false,
      connected: false,
      deviceCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get list of connected Pegasus power devices
 */
export async function getConnectedDevices(): Promise<{
  status: string;
  devices: PegasusConnectedDevice[];
  totalCount: number;
  error?: string;
}> {
  const response = await fetch(`${API_BASE}/devices`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get aggregate report for a specific device (all data in one call)
 */
export async function getDeviceReport(
  deviceType: string,
  uniqueKey: string
): Promise<PegasusAggregateReport> {
  const response = await fetch(
    `${API_BASE}/report?deviceType=${encodeURIComponent(deviceType)}&uniqueKey=${encodeURIComponent(uniqueKey)}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get power metrics only (lighter payload)
 */
export async function getPowerMetrics(
  deviceType: string,
  uniqueKey: string
): Promise<PegasusPowerReport> {
  const response = await fetch(
    `${API_BASE}/power?deviceType=${encodeURIComponent(deviceType)}&uniqueKey=${encodeURIComponent(uniqueKey)}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get power consumption metrics
 */
export async function getPowerConsumption(
  deviceType: string,
  uniqueKey: string
): Promise<PegasusPowerConsumptionReport> {
  const response = await fetch(
    `${API_BASE}/consumption?deviceType=${encodeURIComponent(deviceType)}&uniqueKey=${encodeURIComponent(uniqueKey)}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get telemetry data for session monitoring
 */
export async function getTelemetryData(): Promise<PegasusTelemetryResponse> {
  const response = await fetch(`${API_BASE}/telemetry`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return await response.json();
}
