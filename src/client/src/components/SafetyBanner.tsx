import React, { useState, useEffect, useCallback } from 'react';
import { Callout, Flex, Text, Button } from '@radix-ui/themes';
import { ExclamationTriangleIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { getApiUrl } from '../config/api';
import type { FlatPanelResponse, ObservatoryStatus, SafetyBannerProps } from '../interfaces/weather';

const SafetyBanner: React.FC<SafetyBannerProps> = ({ onDismiss }) => {
  const [status, setStatus] = useState<ObservatoryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchFlatPanelStatus = async (): Promise<FlatPanelResponse | null> => {
    try {
      const response = await fetch(`${getApiUrl('')}nina/flat-panel`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.Response) {
        return data;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching flat panel status:', err);
      return null;
    }
  };

  const fetchSafetyStatus = useCallback(async () => {
    try {
      const currentHour = new Date().getHours();
      const isDaytime = currentHour >= 6 && currentHour < 20;
      
      // For now, assume dome/roof is closed since we don't have a reliable endpoint
      // This should be updated when proper dome/safety monitoring is available
      const roofOpen = false;
      
      // Get flat panel data
      const flatPanelData = await fetchFlatPanelStatus();
      
      setStatus({
        roofOpen,
        flatPanelLightOn: flatPanelData?.Response?.LightOn || false,
        isDaytime
      });
      
    } catch (err) {
      console.error('Error fetching safety status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch safety status');
    }
  }, []);

  useEffect(() => {
    fetchSafetyStatus();
    // Refresh safety status every minute
    const interval = setInterval(fetchSafetyStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchSafetyStatus]);

  // Don't render if dismissed, no status, or error
  if (dismissed || !status || error) {
    return null;
  }

  // Only show banner if there's a critical safety condition
  const showCriticalWarning = status.roofOpen && status.flatPanelLightOn;
  
  if (!showCriticalWarning) {
    return null;
  }

  const handleDismissClick = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Callout.Root color="red" role="alert" style={{ marginBottom: '16px' }}>
      <Callout.Icon>
        <ExclamationTriangleIcon />
      </Callout.Icon>
      <Flex justify="between" align="center" width="100%">
        <Flex direction="column" gap="1">
          <Callout.Text weight="bold">
            🚨 CRITICAL SAFETY WARNING
          </Callout.Text>
          <Text size="2">
            Observatory roof is OPEN with flat panel light ON during {status.isDaytime ? 'daytime' : 'nighttime'}! 
            This creates a serious fire hazard and may damage equipment.
          </Text>
        </Flex>
        <Button 
          size="1" 
          variant="ghost" 
          color="gray"
          onClick={handleDismissClick}
          title="Dismiss this warning"
        >
          <CrossCircledIcon />
        </Button>
      </Flex>
    </Callout.Root>
  );
};

export default SafetyBanner;
