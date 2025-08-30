import React, { useState, useEffect, useCallback } from 'react';
import { Callout, Flex, Text, Button } from '@radix-ui/themes';
import { ExclamationTriangleIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { getApiUrl } from '../config/api';
import { useNINAEvent } from '../services/ninaWebSocket';

interface FlatPanelResponse {
  Response: {
    CoverState: string;
    LocalizedCoverState: string;
    LocalizedLightOnState: string;
    LightOn: boolean;
    Brightness: number;
    SupportsOpenClose: boolean;
    MinBrightness: number;
    MaxBrightness: number;
    SupportsOnOff: boolean;
    SupportedActions: string[];
    Connected: boolean;
    Name: string;
    DisplayName: string;
    Description: string;
    DriverInfo: string;
    DriverVersion: string;
    DeviceId: string;
  };
  Error: string;
  StatusCode: number;
  Success: boolean;
  Type: string;
}

interface ObservatoryStatus {
  roofOpen: boolean;
  flatPanelLightOn: boolean;
  isDaytime: boolean;
}

interface SafetyBannerProps {
  onDismiss?: () => void;
}

const SafetyBanner: React.FC<SafetyBannerProps> = ({ onDismiss }) => {
  const [status, setStatus] = useState<ObservatoryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Separate function to fetch just flat panel status
  const fetchFlatPanelStatus = async (): Promise<FlatPanelResponse | null> => {
    try {
      const flatPanelResponse = await fetch(getApiUrl('nina/flat-panel'));
      if (!flatPanelResponse.ok) {
        throw new Error(`HTTP ${flatPanelResponse.status}: ${flatPanelResponse.statusText}`);
      }
      return await flatPanelResponse.json();
    } catch (err) {
      console.error('Error fetching flat panel status:', err);
      return null;
    }
  };

  const fetchSafetyStatus = async () => {
    try {
      setError(null);
      
      // Fetch flat panel status
      const flatPanelData = await fetchFlatPanelStatus();
      if (!flatPanelData) {
        throw new Error('Failed to fetch flat panel status');
      }
      
      // Fetch astronomical data to determine if it's daytime
      const timeResponse = await fetch(getApiUrl('time/astronomical'));
      if (!timeResponse.ok) {
        throw new Error(`HTTP ${timeResponse.status}: ${timeResponse.statusText}`);
      }
      const timeData = await timeResponse.json();
      
      // Determine if roof is open - check multiple indicators
      // Note: You may need to adjust this logic based on your actual observatory setup
      const coverState = flatPanelData.Response.CoverState?.toLowerCase() || '';
      const roofOpen = coverState.includes('open') || 
                       coverState.includes('opened') ||
                       coverState.includes('uncover') ||
                       coverState === 'notpresent' || // Some flat panels show this when roof is open
                       (flatPanelData.Response.SupportsOpenClose && coverState === 'unknown');
      
      // Check if it's currently daytime
      const now = new Date();
      const sunrise = new Date(timeData.sunrise);
      const sunset = new Date(timeData.sunset);
      const isDaytime = now >= sunrise && now <= sunset;
      
      setStatus({
        roofOpen,
        flatPanelLightOn: flatPanelData.Response.LightOn,
        isDaytime
      });
      
    } catch (err) {
      console.error('Error fetching safety status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch safety status');
    }
  };

  /* WebSocket Event Handlers for Real-time Safety Monitoring
   * 
   * FLAT-LIGHT-TOGGLED: Indicates the flat panel light state changed but 
   *                      doesn't include the new state in the payload. 
   *                      We must call /equipment/flatdevice/info to get current state.
   * 
   * SAFETY-CHANGED: Includes the current safety state in the WebSocket response.
   *                 Contains { isSafe: boolean, reasons: string[] } in event.Data
   */
  const handleFlatLightToggled = useCallback(async (event: any) => {
    console.log('🔍 Flat panel light toggled event received:', event.Data);
    
    // FLAT-LIGHT-TOGGLED doesn't include the current state, so we need to fetch it
    // This is critical for safety - we must know the actual current state
    console.log('🔍 Fetching current flat panel state after toggle event...');
    
    try {
      const flatPanelData = await fetchFlatPanelStatus();
      if (flatPanelData && status) {
        // Update only the flat panel light state, keep other status unchanged
        setStatus(prevStatus => prevStatus ? {
          ...prevStatus,
          flatPanelLightOn: flatPanelData.Response.LightOn
        } : null);
        console.log('✅ Updated flat panel light state:', flatPanelData.Response.LightOn);
      } else {
        // Fall back to full refresh if we can't get flat panel data or no existing status
        console.warn('⚠️ Falling back to full safety status refresh');
        fetchSafetyStatus();
      }
    } catch (err) {
      console.error('❌ Error fetching flat panel status after toggle, doing full refresh:', err);
      fetchSafetyStatus();
    }
    
    // Reset dismissal when there's a new event
    setDismissed(false);
  }, [status]);

  const handleSafetyChanged = useCallback((event: any) => {
    console.log('⚠️ Safety status changed event received:', event.Data);
    
    // SAFETY-CHANGED includes the current safety state in the WebSocket response
    // The event.Data should contain: { isSafe: boolean, reasons: string[] }
    if (event.Data && typeof event.Data.isSafe === 'boolean') {
      console.log('🛡️ Safety state from WebSocket:', event.Data.isSafe ? 'SAFE' : 'UNSAFE');
      if (event.Data.reasons && Array.isArray(event.Data.reasons)) {
        console.log('🔍 Safety reasons:', event.Data.reasons);
      }
      // We could update safety state directly here, but let's fetch fresh data to be sure
      // This ensures we have the complete current state including flat panel and roof status
    }
    
    // Refresh safety status to get complete current state
    fetchSafetyStatus();
    // Reset dismissal when there's a new safety event  
    setDismissed(false);
  }, []);

  // Subscribe to NINA WebSocket events for real-time monitoring
  useNINAEvent('FLAT-LIGHT-TOGGLED', handleFlatLightToggled);
  useNINAEvent('SAFETY-CHANGED', handleSafetyChanged);

  useEffect(() => {
    fetchSafetyStatus();
    
    // Check every 60 seconds (reduced from 30s since we have real-time events now)
    const interval = setInterval(fetchSafetyStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Don't show if dismissed or no data
  if (dismissed || !status || error) {
    return null;
  }

  // Show critical warning: Roof open AND flat panel light on
  const showCriticalWarning = status.roofOpen && status.flatPanelLightOn;
  
  // Show info banner: Flat panel on during daytime with roof closed (this is OK)
  const showInfoBanner = !status.roofOpen && status.flatPanelLightOn && status.isDaytime;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (showCriticalWarning) {
    return (
      <Callout.Root color="red" className="safety-warning-pulse" style={{ margin: '1rem' }}>
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Flex justify="between" align="center" width="100%">
          <Flex direction="column" gap="1">
            <Callout.Text weight="bold" size="3">
              ⚠️ CRITICAL SAFETY WARNING ⚠️
            </Callout.Text>
            <Callout.Text>
              ROOF IS OPEN and FLAT PANEL LIGHT IS ON! This can damage your equipment. 
              Please turn off the flat panel light immediately or close the roof.
            </Callout.Text>
          </Flex>
          <Button variant="ghost" onClick={handleDismiss} size="1">
            <CrossCircledIcon />
          </Button>
        </Flex>
      </Callout.Root>
    );
  }

  if (showInfoBanner) {
    return (
      <Callout.Root color="blue" style={{ margin: '1rem' }}>
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Flex justify="between" align="center" width="100%">
          <Flex direction="column" gap="1">
            <Callout.Text weight="bold">
              Flat Panel Active (Daytime - Safe)
            </Callout.Text>
            <Callout.Text>
              Flat panel light is on during daytime with roof closed. This is normal for calibration.
            </Callout.Text>
          </Flex>
          <Button variant="ghost" onClick={handleDismiss} size="1">
            <CrossCircledIcon />
          </Button>
        </Flex>
      </Callout.Root>
    );
  }

  return null;
};

export default SafetyBanner;
