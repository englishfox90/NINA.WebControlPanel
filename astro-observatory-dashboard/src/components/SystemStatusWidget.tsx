import React, { useState, useEffect } from 'react';
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

interface SystemStatus {
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

const SystemStatusWidget: React.FC = () => {
  const [systemData, setSystemData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSystemStatus = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/system/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setSystemData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
      console.error('Error fetching system status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    // Update every 5 seconds
    const interval = setInterval(fetchSystemStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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
          <Flex align="center" gap="2">
            <DesktopIcon />
            <Text size="3" weight="medium">System Status</Text>
          </Flex>
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
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
          <Flex align="center" gap="2">
            <DesktopIcon />
            <Text size="3" weight="medium">System Status</Text>
          </Flex>
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
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

        {/* System Info */}
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

        <Separator />

        {/* Uptime */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <ClockIcon width="14" height="14" color="var(--gray-9)" />
            <Text size="2">Uptime</Text>
          </Flex>
          <Text size="2" weight="medium">
            {systemData.uptime.system.formatted}
          </Text>
        </Flex>

        {/* CPU */}
        <Box>
          <Flex justify="between" align="center" mb="2">
            <Flex align="center" gap="2">
              <ActivityLogIcon width="14" height="14" color="var(--gray-9)" />
              <Text size="2">CPU</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Text size="2" weight="medium">{systemData.cpu.usage}%</Text>
              {systemData.cpu.temperature && (
                <Text size="1" color="gray">
                  {systemData.cpu.temperature}°C
                </Text>
              )}
            </Flex>
          </Flex>
          <Progress value={systemData.cpu.usage} size="2" />
          <Text size="1" color="gray" mt="1">
            {systemData.cpu.cores} cores • {systemData.cpu.model}
          </Text>
        </Box>

        {/* Memory */}
        <Box>
          <Flex justify="between" align="center" mb="2">
            <Text size="2">Memory</Text>
            <Text size="2" weight="medium">
              {systemData.memory.used.toFixed(1)}GB / {systemData.memory.total.toFixed(1)}GB
            </Text>
          </Flex>
          <Progress 
            value={systemData.memory.usagePercent} 
            size="2"
            color={systemData.memory.usagePercent > 85 ? 'red' : systemData.memory.usagePercent > 70 ? 'orange' : 'blue'}
          />
          <Text size="1" color="gray" mt="1">
            {systemData.memory.usagePercent}% used • {systemData.memory.free.toFixed(1)}GB free
          </Text>
        </Box>

        {/* Disk Space */}
        {systemData.disk.main && (
          <Box>
            <Flex justify="between" align="center" mb="2">
              <Flex align="center" gap="2">
                <ArchiveIcon width="14" height="14" color="var(--gray-9)" />
                <Text size="2">Storage</Text>
              </Flex>
              <Text size="2" weight="medium">
                {systemData.disk.main.used.toFixed(1)}GB / {systemData.disk.main.total.toFixed(1)}GB
              </Text>
            </Flex>
            <Progress 
              value={systemData.disk.main.usagePercent} 
              size="2"
              color={systemData.disk.main.usagePercent > 85 ? 'red' : systemData.disk.main.usagePercent > 70 ? 'orange' : 'green'}
            />
            <Text size="1" color="gray" mt="1">
              {systemData.disk.main.usagePercent}% used • {systemData.disk.main.free.toFixed(1)}GB free
            </Text>
          </Box>
        )}

        {/* Network */}
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
              ↓ {formatBytes(systemData.network.rx_sec)}/s
            </Text>
            <Text size="1" color="gray">
              {systemData.network.interface}
            </Text>
            <Text size="1" color="gray">
              ↑ {formatBytes(systemData.network.tx_sec)}/s
            </Text>
          </Flex>
        </Box>

      </Flex>
    </Card>
  );
};

export default SystemStatusWidget;
