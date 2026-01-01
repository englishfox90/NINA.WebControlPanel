import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, Flex, Box, Text, Badge, Separator, Button } from '@radix-ui/themes';
import {
  LightningBoltIcon,
  ActivityLogIcon,
  ReloadIcon,
  CrossCircledIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  TimerIcon
} from '@radix-ui/react-icons';
import { getDeviceReport, checkPegasusStatus } from '../services/pegasusApi';
import type { PegasusPowerWidgetProps, AggregateReportMessage } from '../interfaces/pegasus';
import { getApiUrl } from '../config/api';
import type { ConfigData } from '../interfaces/config';

const PegasusPowerWidget: React.FC<PegasusPowerWidgetProps> = memo(({ widgetId }) => {
  const [reportData, setReportData] = useState<AggregateReportMessage | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ type: string; uniqueKey: string; name: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Auto-detect connected power device
  const detectDevice = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('pegasus/devices'));
      if (!response.ok) {
        throw new Error('Pegasus Unity Platform not responding');
      }
      
      const result = await response.json();
      
      if (result.devices && result.devices.length > 0) {
        // Use the first power device found
        const device = result.devices[0];
        setDeviceInfo({
          type: device.name,
          uniqueKey: device.uniqueKey,
          name: device.fullName,
          id: device.deviceID
        });
        return device;
      } else {
        throw new Error('No Pegasus power devices found');
      }
    } catch (err) {
      console.error('Error detecting Pegasus device:', err);
      throw err;
    }
  }, []);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('config'));
      if (!response.ok) throw new Error('Failed to fetch configuration');
      const data = await response.json();
      setConfig(data);
      return data;
    } catch (err) {
      console.error('Error fetching config:', err);
      return null;
    }
  }, []);

  // Fetch device report
  const fetchDeviceReport = useCallback(async () => {
    try {
      setError(null);

      // Get latest config
      const currentConfig = config || await fetchConfig();
      if (!currentConfig) {
        throw new Error('Configuration not available');
      }

      // Check if Pegasus is enabled (nested object access)
      const pegasusEnabled = currentConfig.pegasus?.enabled === true;

      if (!pegasusEnabled) {
        setError('Pegasus Unity integration not enabled. Configure in Settings > Power Devices.');
        setLoading(false);
        return;
      }

      // Auto-detect device if not already detected
      let device = deviceInfo;
      if (!device) {
        device = await detectDevice();
        if (!device) {
          throw new Error('No power device detected');
        }
      }

      // Check if Pegasus Unity is running
      const status = await checkPegasusStatus();
      setIsConnected(status.connected);

      if (!status.connected) {
        throw new Error('Pegasus Unity Platform not running on localhost:32000');
      }

      // Fetch device report using auto-detected device
      const report = await getDeviceReport(device.type || device.name, device.uniqueKey);
      
      if (report.status !== 'success') {
        throw new Error(report.message || 'Failed to fetch device report');
      }

      setReportData(report.data.message);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch power data');
      setLoading(false);
      setIsConnected(false);
      console.error('Error fetching Pegasus report:', err);
    }
  }, [config, deviceInfo, fetchConfig, detectDevice]);

  // Initial load and polling
  useEffect(() => {
    fetchDeviceReport();

    // Get refresh interval from config (default 5000ms)
    const interval = setInterval(() => {
      fetchDeviceReport();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDeviceReport]);

  // Circular gauge component (inspired by Pegasus Unity but with our Radix style)
  const CircularGauge = ({ value, max, label, unit, color, size = 120 }: {
    value: number;
    max: number;
    label: string;
    unit: string;
    color: string;
    size?: number;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color mapping to Radix colors
    const colorMap: { [key: string]: string } = {
      green: 'var(--green-9)',
      blue: 'var(--blue-9)',
      orange: 'var(--orange-9)',
      red: 'var(--red-9)',
      yellow: 'var(--yellow-9)',
      cyan: 'var(--cyan-9)',
      gray: 'var(--gray-9)'
    };

    const strokeColor = colorMap[color] || colorMap.blue;

    return (
      <Flex direction="column" align="center" gap="2" style={{ minWidth: `${size}px` }}>
        <Box position="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="var(--gray-6)"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={strokeColor}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          {/* Center text */}
          <Flex
            position="absolute"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            align="center"
            justify="center"
            direction="column"
          >
            <Text size="6" weight="bold">{value.toFixed(1)}</Text>
            <Text size="1" color="gray">{unit}</Text>
          </Flex>
        </Box>
        <Text size="2" color="gray" weight="medium">{label}</Text>
      </Flex>
    );
  };

  // Format uptime from TimeSpan format
  const formatUptime = (upTime: string): string => {
    if (!upTime) return 'N/A';
    const parts = upTime.split(':');
    if (parts.length >= 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      return `${hours}h ${minutes}m`;
    }
    return upTime;
  };

  // Get voltage color based on value
  const getVoltageColor = (voltage: number): string => {
    if (voltage < 11) return 'red';
    if (voltage < 11.5) return 'orange';
    if (voltage > 13) return 'orange';
    return 'green';
  };

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <LightningBoltIcon width="20" height="20" />
            <Text size="4" weight="bold">Pegasus Power</Text>
          </Flex>
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <ReloadIcon className="spin" width="24" height="24" />
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (error || !reportData) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2" justify="between">
            {/* <Flex align="center" gap="2">
              <LightningBoltIcon width="20" height="20" />
              <Text size="4" weight="bold">Pegasus Power</Text>
            </Flex> */}
            <Button size="1" variant="soft" onClick={() => fetchDeviceReport()}>
              <ReloadIcon />
            </Button>
          </Flex>
          <Flex align="center" justify="center" direction="column" gap="3" style={{ minHeight: '200px' }}>
            <CrossCircledIcon width="32" height="32" color="var(--red-9)" />
            <Text size="2" color="red">{error || 'No data available'}</Text>
            <Text size="1" color="gray">
              {!isConnected && 'Pegasus Unity Platform may not be running'}
            </Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        {/* Header */}
        <Flex align="center" gap="2">
          <LightningBoltIcon width="20" height="20" />
          <Text size="4" weight="bold">Pegasus Power</Text>
          <Badge color={isConnected ? 'green' : 'gray'} size="1">
            {isConnected ? <CheckCircledIcon /> : <CrossCircledIcon />}
            {deviceInfo?.name || 'Auto-detecting...'}
          </Badge>
        </Flex>

        <Separator size="4" />

        {/* Power Metrics - Circular Gauges */}
        <Box>
          <Text size="2" weight="bold" color="gray" mb="3">Power Metrics</Text>
          <Flex gap="4" wrap="wrap" justify="center">
            <CircularGauge
              value={reportData.voltage}
              max={15}
              label="Voltage"
              unit="V"
              color={getVoltageColor(reportData.voltage)}
              size={110}
            />
            <CircularGauge
              value={reportData.current}
              max={config?.pegasus?.maxCurrent || 10}
              label="Current"
              unit="A"
              color="blue"
              size={110}
            />
            <CircularGauge
              value={reportData.power}
              max={15 * (config?.pegasus?.maxCurrent || 10)}
              label="Power"
              unit="W"
              color="yellow"
              size={110}
            />
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Environmental Metrics */}
        <Box>
          <Text size="2" weight="bold" color="gray" mb="3">Environmental</Text>
          <Flex gap="4" wrap="wrap" justify="between">
            <Flex direction="column" align="center" gap="1">
              <Text size="5" weight="bold" color="cyan">{reportData.temperature.toFixed(1)}°C</Text>
              <Text size="1" color="gray">Temperature</Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <Text size="5" weight="bold" color="blue">{reportData.humidity}%</Text>
              <Text size="1" color="gray">Humidity</Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <Text size="5" weight="bold" color="orange">{reportData.dewPoint.toFixed(1)}°C</Text>
              <Text size="1" color="gray">Dew Point</Text>
            </Flex>
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Power Consumption */}
        <Box>
          <Text size="2" weight="bold" color="gray" mb="3">Power Consumption</Text>
          <Flex gap="4" wrap="wrap" justify="between">
            <Flex direction="column" align="center" gap="1">
              <Text size="4" weight="bold">{reportData.averageAmps.toFixed(2)} A</Text>
              <Text size="1" color="gray">Avg Current</Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <Text size="4" weight="bold">{reportData.wattPerHour.toFixed(2)} Wh</Text>
              <Text size="1" color="gray">Energy Used</Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <Text size="4" weight="bold">{reportData.ampsPerHour.toFixed(2)} Ah</Text>
              <Text size="1" color="gray">Charge Used</Text>
            </Flex>
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Device Status */}
        <Flex gap="3" wrap="wrap" justify="between" align="center">
          <Flex gap="2" align="center">
            <TimerIcon />
            <Text size="2" color="gray">Uptime: {formatUptime(reportData.upTime)}</Text>
          </Flex>
          
          {/* Port Status Badges */}
          <Flex gap="2" wrap="wrap">
            <Badge color={reportData.powerHubStatus.state === 'ON' ? 'green' : 'gray'} size="1">
              Power Hub: {reportData.powerHubStatus.state}
            </Badge>
            
            {reportData.powerVariablePortStatus && (
              <Badge color={reportData.powerVariablePortStatus.state === 'ON' ? 'green' : 'gray'} size="1">
                Var Port: {reportData.powerVariablePortStatus.state}
              </Badge>
            )}
            
            {reportData.ppbA_DualUSB2Status && (
              <Badge color={reportData.ppbA_DualUSB2Status.state === 'ON' ? 'green' : 'gray'} size="1">
                USB2: {reportData.ppbA_DualUSB2Status.state}
              </Badge>
            )}
            
            {reportData.isOverCurrent && (
              <Badge color="red" size="1">
                <ExclamationTriangleIcon /> OVER CURRENT
              </Badge>
            )}
          </Flex>
        </Flex>

        {/* Dew Heater Ports (if available) */}
        {reportData.dewHubStatus?.hub && reportData.dewHubStatus.hub.length > 0 && (
          <>
            <Separator size="4" />
            <Box>
              <Text size="2" weight="bold" color="gray" mb="2">Dew Heater Ports</Text>
              <Flex gap="2" wrap="wrap">
                {reportData.dewHubStatus.hub.map((port, index) => (
                  <Badge
                    key={index}
                    color={port.port.power > 0 ? 'blue' : 'gray'}
                    size="2"
                  >
                    Port {port.port.number}: {port.port.power}% ({port.current.value.toFixed(2)}A)
                  </Badge>
                ))}
              </Flex>
            </Box>
          </>
        )}
      </Flex>
    </Card>
  );
});

PegasusPowerWidget.displayName = 'PegasusPowerWidget';

export default PegasusPowerWidget;
