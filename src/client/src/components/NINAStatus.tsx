import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Badge } from '@radix-ui/themes';
import { 
  GearIcon, 
  ReloadIcon, 
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';

interface Equipment {
  name: string;
  deviceName: string;
  connected: boolean;
  status: string;
}

interface EquipmentResponse {
  equipment: Equipment[];
  summary: {
    connected: number;
    total: number;
    allConnected: boolean;
    status: string;
  };
  lastUpdate: string;
  mockMode?: boolean;
}

interface NINAStatusProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

const NINAStatus: React.FC<NINAStatusProps> = ({ onRefresh, hideHeader = false }) => {
  const [data, setData] = useState<EquipmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipmentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/nina/equipment');
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
  };

  useEffect(() => {
    fetchEquipmentStatus();
  }, []);

  // Global refresh integration
  useEffect(() => {
    if (onRefresh) {
      const handleGlobalRefresh = () => fetchEquipmentStatus();
      // Listen for global refresh events if needed
    }
  }, [onRefresh]);

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
};

export default NINAStatus;