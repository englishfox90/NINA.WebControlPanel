import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, Flex, Text, Badge } from '@radix-ui/themes';
import { 
  GearIcon, 
  ReloadIcon, 
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';
import { useNINAStatusWebSocket } from '../hooks/useUnifiedWebSocket';
import { getApiUrl } from '../config/api';
import type { Equipment, EquipmentResponse, NINAStatusProps } from '../interfaces/nina';

const NINAStatus: React.FC<NINAStatusProps> = memo(({ onRefresh, hideHeader = false }) => {
  const [data, setData] = useState<EquipmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastWebSocketUpdate, setLastWebSocketUpdate] = useState<string>('');

  // Use enhanced unified WebSocket for equipment events
  const { 
    connected: wsConnected, 
    onWidgetEvent,
    lastEvent 
  } = useNINAStatusWebSocket();

  const fetchEquipmentStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('nina/equipment'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching NINA equipment status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment status');
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket event handler for equipment changes
  const handleEquipmentEvent = useCallback((event: any) => {
    console.log('Equipment event received:', event.Type, event.Data);
    setLastWebSocketUpdate(event.Timestamp);
    
    // Update equipment status efficiently based on WebSocket event
    if (event.Type && (event.Type.endsWith('-CONNECTED') || event.Type.endsWith('-DISCONNECTED'))) {
      const isConnected = event.Type.endsWith('-CONNECTED');
      const equipmentType = event.Type.replace('-CONNECTED', '').replace('-DISCONNECTED', '');
      
      console.log(`Equipment ${equipmentType} ${isConnected ? 'connected' : 'disconnected'}, updating locally...`);
      
      // Update the local data efficiently instead of full refresh
      setData(currentData => {
        if (!currentData || !currentData.equipment || !Array.isArray(currentData.equipment)) {
          console.warn('❌ Equipment data is not available or not an array, skipping local update');
          return currentData;
        }
        
        // Find and update the specific equipment
        const updatedEquipment = currentData.equipment.map(eq => {
          // Match by equipment type (FOCUSER, CAMERA, MOUNT, etc.)
          if (eq.name.toUpperCase().includes(equipmentType) || 
              equipmentType.includes(eq.name.toUpperCase())) {
            return {
              ...eq,
              connected: isConnected,
              status: isConnected ? 'Connected' : 'Disconnected'
            };
          }
          return eq;
        });
        
        // Recalculate summary
        const connectedCount = updatedEquipment.filter(eq => eq.connected).length;
        const totalCount = updatedEquipment.length;
        const allConnected = connectedCount === totalCount;
        
        return {
          ...currentData,
          equipment: updatedEquipment,
          summary: {
            connected: connectedCount,
            total: totalCount,
            allConnected,
            status: allConnected ? 'All Connected' : `${connectedCount}/${totalCount} Connected`
          },
          lastUpdate: new Date().toISOString()
        };
      });
    }
  }, []);

  // Subscribe to equipment change WebSocket events using enhanced system
  useEffect(() => {
    const unsubscribeWidget = onWidgetEvent(handleEquipmentEvent);
    
    return () => {
      unsubscribeWidget();
    };
  }, [onWidgetEvent, handleEquipmentEvent]);

  useEffect(() => {
    fetchEquipmentStatus();
  }, [fetchEquipmentStatus]);

  // Global refresh integration
  useEffect(() => {
    if (onRefresh) {
      const handleGlobalRefresh = () => fetchEquipmentStatus();
      // Listen for global refresh events if needed
    }
  }, [onRefresh, fetchEquipmentStatus]);

  // Loading state
  if (loading) {
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
              <ReloadIcon className="loading-spinner" />
              <Text size="2" color="gray">Loading equipment status...</Text>
            </Flex>
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
              {lastWebSocketUpdate && (
                <Badge variant="soft" color="blue" size="1">
                  WebSocket Live
                </Badge>
              )}
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
          {data.equipment.map((equipment, index) => (
            <Flex key={index} justify="between" align="center">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">{equipment.name}</Text>
                <Text size="1" color="gray">{equipment.deviceName}</Text>
              </Flex>
              <Badge 
                color={equipment.connected ? 'green' : 'red'} 
                size="1"
              >
                {equipment.connected ? (
                  <CheckCircledIcon width="12" height="12" />
                ) : (
                  <CrossCircledIcon width="12" height="12" />
                )}
                {equipment.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
});

export default NINAStatus;
