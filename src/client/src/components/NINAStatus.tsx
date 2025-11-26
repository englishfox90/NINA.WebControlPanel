import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Flex, Text, Badge, Skeleton } from '@radix-ui/themes';
import { 
  GearIcon, 
  ReloadIcon, 
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';
import { getApiUrl } from '../config/api';
import type { Equipment, EquipmentResponse, NINAStatusProps } from '../interfaces/nina';
import { useUnifiedState } from '../contexts/UnifiedStateContext';

// Fixed equipment types that will always be displayed
// These names MUST match the backend ninaService.js equipment names exactly
const EQUIPMENT_TYPES = [
  'Camera',
  'Filter Wheel',
  'Focuser',
  'Rotator',
  'Mount',
  'Guider',
  'Switch',
  'Flat Panel',
  'Weather',
  'Dome',
  'Safety Monitor'
];

const NINAStatus: React.FC<NINAStatusProps> = ({ onRefresh, hideHeader = false }) => {
  const [data, setData] = useState<EquipmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen to unified state for equipment events
  const { lastUpdate } = useUnifiedState();
  const lastEquipmentUpdate = useRef<string | null>(null);

  const fetchEquipmentStatus = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch(getApiUrl('nina/equipment'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching NINA equipment status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment status');
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEquipmentStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchEquipmentStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchEquipmentStatus]);

  // Listen for equipment events from unified state WebSocket
  useEffect(() => {
    if (lastUpdate?.updateKind === 'equipment' && 
        lastUpdate?.timestamp !== lastEquipmentUpdate.current) {
      
      lastEquipmentUpdate.current = lastUpdate.timestamp;
      const equipmentId = lastUpdate.changed?.meta?.equipmentId || 'unknown';
      const status = lastUpdate.changed?.meta?.status || lastUpdate.updateReason;
      
      console.log(`🔧 Equipment event detected: ${equipmentId} - ${status}`);
      
      // Refresh equipment status
      setRefreshing(true);
      fetchEquipmentStatus();
    }
  }, [lastUpdate, fetchEquipmentStatus]);

  // Loading state (initial load only)
  if (loading && !data) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <GearIcon />
              <Text size="3" weight="medium">Equipment Status</Text>
            </Flex>
          )}
          <Flex direction="column" gap="3">
            {EQUIPMENT_TYPES.map((type, index) => (
              <Flex key={index} justify="between" align="center">
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Skeleton><Text size="2">{type}</Text></Skeleton>
                  <Skeleton><Text size="1">Loading device...</Text></Skeleton>
                </Flex>
                <Skeleton><Badge size="1">Connected</Badge></Skeleton>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Card>
    );
  }

  // Error state  
  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <GearIcon />
              <Text size="3" weight="medium">Equipment Status</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ExclamationTriangleIcon color="red" width="24" height="24" />
              <Text size="2" color="red">Failed to load equipment status</Text>
              <Text size="1" color="gray">{error}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <GearIcon />
              <Text size="3" weight="medium">Equipment Status</Text>
            </Flex>
            <Badge 
              color={data.summary.allConnected ? 'green' : 'orange'} 
              size="2"
            >
              {data.summary.allConnected ? (
                <CheckCircledIcon width="12" height="12" />
              ) : (
                <ExclamationTriangleIcon width="12" height="12" />
              )}
              {data.summary.status}
            </Badge>
          </Flex>
        )}

        {/* Summary for grid layout */}
        {hideHeader && (
          <Flex justify="center">
            <Badge 
              color={data.summary.allConnected ? 'green' : 'orange'} 
              size="2"
            >
              {data.summary.allConnected ? (
                <CheckCircledIcon width="12" height="12" />
              ) : (
                <ExclamationTriangleIcon width="12" height="12" />
              )}
              {data.summary.status}
            </Badge>
          </Flex>
        )}

        {/* Equipment List */}
        <Flex direction="column" gap="3">
          {EQUIPMENT_TYPES.map((equipmentType, index) => {
            // Find matching equipment from data
            const equipment = data.equipment.find(e => e.name === equipmentType);
            
            return (
              <Flex key={index} justify="between" align="center">
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text size="2" weight="medium">{equipmentType}</Text>
                  {refreshing ? (
                    <Skeleton><Text size="1">Updating...</Text></Skeleton>
                  ) : (
                    <Text size="1" color="gray">
                      {equipment?.deviceName || 'Not configured'}
                    </Text>
                  )}
                </Flex>
                {refreshing ? (
                  <Skeleton><Badge size="1">Connected</Badge></Skeleton>
                ) : (
                  <Badge 
                    color={equipment?.connected ? 'green' : 'red'} 
                    size="1"
                  >
                    {equipment?.connected ? (
                      <CheckCircledIcon width="12" height="12" />
                    ) : (
                      <CrossCircledIcon width="12" height="12" />
                    )}
                    {equipment?.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                )}
              </Flex>
            );
          })}
        </Flex>
      </Flex>
    </Card>
  );
};

export default NINAStatus;
