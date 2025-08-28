import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  Button, 
  Box, 
  Flex, 
  Text, 
  Select, 
  Switch, 
  Heading,
  Separator
} from '@radix-ui/themes';
import { 
  Cross2Icon, 
  GearIcon, 
  ReloadIcon,
  CheckIcon
} from '@radix-ui/react-icons';
import configService from '../services/configService';
import { AppConfig } from '../types/config';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AppConfig>(configService.getConfig());
  const [hasChanges, setHasChanges] = useState(false);

  // Consistent input styling that matches Radix theme
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--gray-7)',
    borderRadius: 'var(--radius-2)',
    fontSize: '14px',
    backgroundColor: 'var(--color-panel-solid)',
    color: 'var(--gray-12)',
    fontFamily: 'inherit'
  };

  useEffect(() => {
    if (isOpen) {
      setConfig(configService.getConfig());
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    configService.updateConfig(config);
    setHasChanges(false);
    onClose();
    // Force a page reload to apply new settings
    window.location.reload();
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      configService.resetToDefaults();
      setConfig(configService.getConfig());
      setHasChanges(false);
    }
  };

  const updateConfig = (section: string, key: string, value: any) => {
    const configAny: any = config;
    const currentSection = configAny[section] || {};
    const newConfig = {
      ...config,
      [section]: {
        ...currentSection,
        [key]: value
      }
    };
    setConfig(newConfig);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="600px" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <GearIcon width="20" height="20" />
            <Dialog.Title>
              <Heading size="6">Observatory Settings</Heading>
            </Dialog.Title>
          </Flex>
          <Dialog.Close>
            <Button variant="ghost" size="2">
              <Cross2Icon width="16" height="16" />
            </Button>
          </Dialog.Close>
        </Flex>

        <Text size="2" color="gray" mb="4">
          Configure the most commonly used settings. Changes are saved to browser storage.
        </Text>

        <Separator mb="4" />

        {/* Settings Content */}
        <Flex direction="column" gap="6">
          
          {/* NINA Connection Section */}
          <Box>
            <Heading size="4" mb="3">NINA Connection</Heading>
            <Flex direction="column" gap="3">
              <Box>
                <Text size="2" weight="medium" mb="2">API Port</Text>
                <input
                  type="number"
                  value={config.nina.apiPort.toString()}
                  onChange={(e) => updateConfig('nina', 'apiPort', parseInt(e.target.value) || 1888)}
                  placeholder="1888"
                  style={inputStyle}
                />
                <Text size="1" color="gray" mt="1">Port where NINA API is running (default: 1888)</Text>
              </Box>
              
              <Box>
                <Text size="2" weight="medium" mb="2">Base URL</Text>
                <input
                  type="text"
                  value={config.nina.baseUrl}
                  onChange={(e) => updateConfig('nina', 'baseUrl', e.target.value)}
                  placeholder="http://localhost"
                  style={inputStyle}
                />
                <Text size="1" color="gray" mt="1">Base URL for NINA API connection</Text>
              </Box>
            </Flex>
          </Box>

          {/* Video Streams Section */}
          <Box>
            <Heading size="4" mb="3">Video Streams</Heading>
            <Flex direction="column" gap="3">
              <Box>
                <Text size="2" weight="medium" mb="2">Primary Camera Feed</Text>
                <input
                  type="text"
                  value={config.streams.liveFeed1}
                  onChange={(e) => updateConfig('streams', 'liveFeed1', e.target.value)}
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  style={inputStyle}
                />
                <Text size="1" color="gray" mt="1">RTSP URL for main camera feed</Text>
              </Box>
              
              <Box>
                <Text size="2" weight="medium" mb="2">Secondary Camera Feed</Text>
                <input
                  type="text"
                  value={config.streams.liveFeed2}
                  onChange={(e) => updateConfig('streams', 'liveFeed2', e.target.value)}
                  placeholder="rtsp://192.168.1.101:554/stream2"
                  style={inputStyle}
                />
                <Text size="1" color="gray" mt="1">RTSP URL for secondary camera feed</Text>
              </Box>
            </Flex>
          </Box>

          {/* Dashboard Settings Section */}
          <Box>
            <Heading size="4" mb="3">Dashboard Preferences</Heading>
            <Flex direction="column" gap="3">
              <Box>
                <Text size="2" weight="medium" mb="2">Refresh Interval</Text>
                <Select.Root
                  value={config.dashboard.refreshInterval.toString()}
                  onValueChange={(value) => updateConfig('dashboard', 'refreshInterval', parseInt(value))}
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="1000">1 second (High CPU)</Select.Item>
                    <Select.Item value="2000">2 seconds</Select.Item>
                    <Select.Item value="5000">5 seconds (Recommended)</Select.Item>
                    <Select.Item value="10000">10 seconds</Select.Item>
                    <Select.Item value="30000">30 seconds</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Text size="1" color="gray" mt="1">How often to refresh dashboard data</Text>
              </Box>

              <Flex align="center" justify="between" py="2">
                <Box>
                  <Text size="2" weight="medium">Auto Refresh</Text>
                  <Text size="1" color="gray">Automatically refresh data at set intervals</Text>
                </Box>
                <Switch
                  checked={config.dashboard.autoRefresh}
                  onCheckedChange={(checked) => updateConfig('dashboard', 'autoRefresh', checked)}
                />
              </Flex>

              <Flex align="center" justify="between" py="2">
                <Box>
                  <Text size="2" weight="medium">Mobile Optimized</Text>
                  <Text size="1" color="gray">Enable mobile-specific optimizations</Text>
                </Box>
                <Switch
                  checked={config.dashboard.mobileOptimized}
                  onCheckedChange={(checked) => updateConfig('dashboard', 'mobileOptimized', checked)}
                />
              </Flex>
            </Flex>
          </Box>

          {/* Observatory Info Section */}
          <Box>
            <Heading size="4" mb="3">Observatory Information</Heading>
            <Flex direction="column" gap="3">
              <Box>
                <Text size="2" weight="medium" mb="2">Observatory Name</Text>
                <input
                  type="text"
                  value={config.observatory.name}
                  onChange={(e) => updateConfig('observatory', 'name', e.target.value)}
                  placeholder="My Remote Observatory"
                  style={inputStyle}
                />
                <Text size="1" color="gray" mt="1">Name of your observatory</Text>
              </Box>
            </Flex>
          </Box>

          {/* Development Settings Section */}
          <Box>
            <Heading size="4" mb="3">Development</Heading>
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between" py="2">
                <Box>
                  <Text size="2" weight="medium">Enable Mock Data</Text>
                  <Text size="1" color="gray">Use mock data when NINA API is not available</Text>
                </Box>
                <Switch
                  checked={config.advanced.enableMockData}
                  onCheckedChange={(checked) => updateConfig('advanced', 'enableMockData', checked)}
                />
              </Flex>

              <Flex align="center" justify="between" py="2">
                <Box>
                  <Text size="2" weight="medium">Debug Mode</Text>
                  <Text size="1" color="gray">Enable detailed logging in browser console</Text>
                </Box>
                <Switch
                  checked={config.advanced.debugMode}
                  onCheckedChange={(checked) => updateConfig('advanced', 'debugMode', checked)}
                />
              </Flex>
            </Flex>
          </Box>

        </Flex>

        <Separator mt="6" mb="4" />

        {/* Footer Actions */}
        <Flex justify="between" align="center">
          <Button variant="soft" color="orange" onClick={handleReset}>
            <ReloadIcon width="16" height="16" />
            Reset to Defaults
          </Button>
          
          <Flex gap="3">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              disabled={!hasChanges}
              onClick={handleSave}
              style={{ opacity: hasChanges ? 1 : 0.5 }}
            >
              <CheckIcon width="16" height="16" />
              Save Changes
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default Settings;