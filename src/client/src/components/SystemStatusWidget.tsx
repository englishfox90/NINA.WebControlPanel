import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, Flex, Box, Text, Badge, Progress, Separator } from '@radix-ui/themes';
import { 
  DesktopIcon, 
  ClockIcon, 
  ActivityLogIcon,
  ArchiveIcon,
  GlobeIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ReloadIcon
} from '@radix-ui/react-icons';
import { getApiUrl } from '../config/api';
import { SystemStatusAPI, SystemStatusProps } from '../interfaces/system';

const SystemStatusWidget: React.FC<SystemStatusProps> = memo(({ hideHeader = false }) => {
  const [systemData, setSystemData] = useState<SystemStatusAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchSystemStatus = useCallback(async (useLite = false) => {
    try {
      setError(null);
      // Use lite endpoint for performance, full endpoint every 5th call or initial load
      const endpoint = useLite ? 'system/status/lite' : 'system/status';
      console.log(`🔍 SystemStatusWidget fetching: ${endpoint} (useLite: ${useLite})`);
      const response = await fetch(getApiUrl(endpoint));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const newData = await response.json();
      
      // Merge data strategy: if using lite API, preserve existing full data fields
      if (useLite) {
        setSystemData(prevData => {
          if (!prevData) return newData; // No existing data, use new data
          return {
            ...prevData, // Keep existing full data (os, uptime, disk, network)
            ...newData,  // Update with new lite data (cpu, memory, status, timestamp)
            // Ensure we keep the full structure intact
            cpu: newData.cpu || prevData.cpu,
            memory: newData.memory || prevData.memory,
            status: newData.status || prevData.status
          };
        });
      } else {
        // Full data replacement
        setSystemData(newData);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
      console.error('Error fetching system status:', err);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies to prevent infinite loops

  useEffect(() => {
    console.log('🚀 SystemStatusWidget useEffect mounting');
    // Initial load: always fetch full data
    fetchSystemStatus(false);
    
    // Set up interval with progressive loading strategy
    const interval = setInterval(() => {
      setRefreshCount(prev => {
        const newCount = prev + 1;
        // Every 5th call (or first call), fetch full data
        const shouldUseFull = newCount % 5 === 0;
        console.log(`⏰ SystemStatusWidget interval tick ${newCount}, shouldUseFull: ${shouldUseFull}, useLite: ${!shouldUseFull}`);
        fetchSystemStatus(!shouldUseFull); // useLite = !shouldUseFull (lite on most calls, full every 5th)
        return newCount;
      });
    }, 45000); // 45 seconds interval
    
    return () => {
      console.log('🧹 SystemStatusWidget useEffect cleanup');
      clearInterval(interval);
    };
  }, []); // Empty dependency to prevent infinite loops

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircledIcon />;
      case 'warning': return <ExclamationTriangleIcon />;
      case 'critical': return <CrossCircledIcon />;
      default: return <ActivityLogIcon />;
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <DesktopIcon />
              <Text size="3" weight="medium">System Status</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ReloadIcon className="loading-spinner" />
              <Text size="2" color="gray">Loading system information...</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <DesktopIcon />
              <Text size="3" weight="medium">System Status</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ExclamationTriangleIcon color="red" width="24" height="24" />
              <Text size="2" color="red">Failed to load system data</Text>
              <Text size="1" color="gray">{error}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (!systemData) return null;

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        {/* Header */}
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <DesktopIcon />
              <Text size="3" weight="medium">System Status</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Badge color={getStatusColor(systemData.status.status)} size="2">
                {getStatusIcon(systemData.status.status)}
                {systemData.status.status.toUpperCase()}
              </Badge>
            </Flex>
          </Flex>
        )}

        {/* Status badge for grid layout */}
        {hideHeader && (
          <Flex justify="center">
            <Badge color={getStatusColor(systemData.status.status)} size="2">
              {getStatusIcon(systemData.status.status)}
              {systemData.status.status.toUpperCase()}
            </Badge>
          </Flex>
        )}

        {/* Warnings */}
        {systemData.status.warnings.length > 0 && (
          <Box p="2" style={{ backgroundColor: 'var(--amber-2)', borderRadius: 'var(--radius-2)', border: '1px solid var(--amber-6)' }}>
            <Flex direction="column" gap="1">
              {systemData.status.warnings.map((warning, index) => (
                <Flex key={index} align="center" gap="2">
                  <ExclamationTriangleIcon color="var(--amber-9)" width="14" height="14" />
                  <Text size="1" color="orange">{warning}</Text>
                </Flex>
              ))}
            </Flex>
          </Box>
        )}

        {/* System Info - Only show if OS data is available */}
        {systemData.os && (
          <Box>
            <Flex justify="between" mb="2">
              <Text size="2" weight="medium" color="gray">
                {systemData.os.distro} ({systemData.os.platform})
              </Text>
              <Text size="1" color="gray">
                {systemData.os.hostname}
              </Text>
            </Flex>
          </Box>
        )}

        <Separator />

        {/* Uptime - Only show if uptime data is available */}
        {systemData.uptime && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <ClockIcon width="14" height="14" color="var(--gray-9)" />
              <Text size="2">Uptime</Text>
            </Flex>
            <Text size="2" weight="medium">
              {systemData.uptime.system.formatted}
            </Text>
          </Flex>
        )}

        {/* CPU */}
        <Box>
          <Flex justify="between" align="center" mb="2">
            <Flex align="center" gap="2">
              <ActivityLogIcon width="14" height="14" color="var(--gray-9)" />
              <Text size="2">CPU</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Text size="2" weight="medium">{systemData.cpu?.usage ?? 0}%</Text>
              {systemData.cpu?.temperature && (
                <Text size="1" color="gray">
                  {systemData.cpu.temperature}°C
                </Text>
              )}
            </Flex>
          </Flex>
          <Progress value={systemData.cpu?.usage ?? 0} size="2" />
          <Text size="1" color="gray" mt="1">
            {systemData.cpu?.cores ?? 'N/A'} cores • {systemData.cpu?.model ?? 'Unknown CPU'}
          </Text>
        </Box>

        {/* Memory */}
        <Box>
          <Flex justify="between" align="center" mb="2">
            <Text size="2">Memory</Text>
            <Text size="2" weight="medium">
              {systemData.memory?.used?.toFixed?.(1) ?? 'N/A'}GB / {systemData.memory?.total?.toFixed?.(1) ?? 'N/A'}GB
            </Text>
          </Flex>
          <Progress 
            value={systemData.memory?.usagePercent ?? 0} 
            size="2"
            color={(systemData.memory?.usagePercent ?? 0) > 85 ? 'red' : (systemData.memory?.usagePercent ?? 0) > 70 ? 'orange' : 'blue'}
          />
          <Text size="1" color="gray" mt="1">
            {systemData.memory?.usagePercent ?? 0}% used • {systemData.memory?.free?.toFixed?.(1) ?? 'N/A'}GB free
          </Text>
        </Box>

        {/* Disk Space - Only show if disk data is available */}
        {systemData.disk && systemData.disk.main && (
          <>
            <Separator />
            <Box>
              <Flex justify="between" align="center" mb="2">
                <Flex align="center" gap="2">
                  <ArchiveIcon width="14" height="14" color="var(--gray-9)" />
                  <Text size="2">Storage</Text>
                </Flex>
                <Text size="2" weight="medium">
                  {systemData.disk.main.used?.toFixed?.(1) ?? 'N/A'}GB / {systemData.disk.main.total?.toFixed?.(1) ?? 'N/A'}GB
                </Text>
              </Flex>
              <Progress 
                value={systemData.disk.main.usagePercent ?? 0} 
                size="2"
                color={(systemData.disk.main.usagePercent ?? 0) > 85 ? 'red' : (systemData.disk.main.usagePercent ?? 0) > 70 ? 'orange' : 'green'}
              />
              <Text size="1" color="gray" mt="1">
                {systemData.disk.main.usagePercent ?? 0}% used • {systemData.disk.main.free?.toFixed?.(1) ?? 'N/A'}GB free
              </Text>
            </Box>
          </>
        )}

        {/* Network - Only show if network data is available */}
        {systemData.network && (
          <>
            <Separator />
            <Box>
              <Flex justify="between" align="center" mb="2">
                <Flex align="center" gap="2">
                  <GlobeIcon width="14" height="14" color="var(--gray-9)" />
                  <Text size="2">Network</Text>
                </Flex>
                <Text size="2" weight="medium">
                  {systemData.network.ip}
                </Text>
              </Flex>
              <Flex justify="between">
                <Text size="1" color="gray">
                  {typeof systemData.network.rx_sec === 'number' ? `↓ ${formatBytes(systemData.network.rx_sec)}/s` : 'Interface'}
                </Text>
                <Text size="1" color="gray">
                  {systemData.network.interface}
                </Text>
                <Text size="1" color="gray">
                  {typeof systemData.network.tx_sec === 'number' ? `↑ ${formatBytes(systemData.network.tx_sec)}/s` : 'Active'}
                </Text>
              </Flex>
            </Box>
          </>
        )}

      </Flex>
    </Card>
  );
});

export default SystemStatusWidget;

