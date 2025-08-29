import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Flex,
  Text,
  Button,
  Box,
  Tabs,
  Card,
  Separator,
  Callout,
  Spinner,
  TextField,
  Badge
} from '@radix-ui/themes';
import {
  GearIcon,
  Cross2Icon,
  CheckIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  FileTextIcon
} from '@radix-ui/react-icons';

// TypeScript declarations for File System Access API
declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
      excludeAcceptAllOption?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
  }
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ConfigData {
  nina: {
    baseUrl: string;
    apiPort: number;
    timeout: number;
    retryAttempts: number;
  };
  database: {
    targetSchedulerPath: string;
    backupEnabled: boolean;
    backupInterval: number;
  };
  streams: {
    liveFeed1: string;
    liveFeed2: string;
    liveFeed3: string;
    defaultStream: number;
    connectionTimeout: number;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [browserSupportsFilePicker, setBrowserSupportsFilePicker] = useState(false);

  // Check browser support on mount
  useEffect(() => {
    setBrowserSupportsFilePicker(!!window.showOpenFilePicker);
  }, []);

  // Load configuration on open
  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/config');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status}`);
      }
      
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.status}`);
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      console.error('Error saving configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;
    
    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const openDirectoryPicker = async (configPath: string) => {
    try {
      // Check if File System Access API is supported
      if (!window.showOpenFilePicker) {
        alert('File picker is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser, or enter the path manually.');
        return;
      }

      // Configure file picker for SQLite database files
      const filePickerOptions = {
        multiple: false,
        types: [
          {
            description: "SQLite Database Files",
            accept: { 
              "application/x-sqlite3": [".sqlite", ".db", ".sqlite3"]
            }
          }
        ],
        excludeAcceptAllOption: false
      };

      // Show file picker
      const [fileHandle] = await window.showOpenFilePicker(filePickerOptions);
      
      // Get the file to access its name
      const file = await fileHandle.getFile();
      
      // For security reasons, browsers don't provide full file paths,
      // but we can use the file name and suggest a common path structure
      const fileName = file.name;
      
      // For database paths, suggest a typical path structure
      if (configPath === 'database.targetSchedulerPath') {
        // Use the actual filename, but suggest user may need to adjust the directory
        const suggestedPath = `./resources/${fileName}`;
        updateConfig(configPath, suggestedPath);
        
        // Show helpful message
        alert(`Selected: ${fileName}\n\nPath set to: ${suggestedPath}\n\nNote: You may need to adjust the directory path to match your actual file location.`);
      }
      
    } catch (err: any) {
      // User cancelled or error occurred
      if (err.name !== 'AbortError') {
        console.error('Error opening file picker:', err);
        alert('Error opening file picker. Please enter the path manually.');
      }
    }
  };

  if (loading) {
    return (
      <Dialog.Root open={open} onOpenChange={onClose}>
        <Dialog.Content style={{ maxWidth: '600px' }}>
          <Dialog.Title>
            <Flex align="center" gap="2">
              <GearIcon />
              Settings
            </Flex>
          </Dialog.Title>
          
          <Flex justify="center" align="center" py="6">
            <Spinner size="3" />
          </Flex>
          
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    );
  }

  if (error && !config) {
    return (
      <Dialog.Root open={open} onOpenChange={onClose}>
        <Dialog.Content style={{ maxWidth: '600px' }}>
          <Dialog.Title>
            <Flex align="center" gap="2">
              <GearIcon />
              Settings
            </Flex>
          </Dialog.Title>
          
          <Callout.Root color="red" mt="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
          
          <Flex gap="3" mt="4" justify="end">
            <Button onClick={fetchConfig} variant="soft">
              Retry
            </Button>
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '700px', maxHeight: '80vh' }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <GearIcon />
            Observatory Settings
          </Flex>
        </Dialog.Title>
        
        <Dialog.Description>
          Configure your NINA connection, database paths, and live feed settings.
        </Dialog.Description>

        {success && (
          <Callout.Root color="green" mt="4">
            <Callout.Icon>
              <CheckIcon />
            </Callout.Icon>
            <Callout.Text>Settings saved successfully!</Callout.Text>
          </Callout.Root>
        )}

        {error && (
          <Callout.Root color="red" mt="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Box style={{ maxHeight: '500px', overflowY: 'auto' }} mt="4">
          <Tabs.Root defaultValue="nina">
            <Tabs.List>
              <Tabs.Trigger value="nina">NINA Connection</Tabs.Trigger>
              <Tabs.Trigger value="database">Database</Tabs.Trigger>
              <Tabs.Trigger value="streams">Live Feeds</Tabs.Trigger>
            </Tabs.List>

            {/* NINA Connection Tab */}
            <Tabs.Content value="nina">
              <Box pt="4">
                <Card>
                  <Box p="4">
                    <Flex direction="column" gap="4">
                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          NINA Host URL
                        </Text>
                        <input
                          type="text"
                          value={config?.nina.baseUrl || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('nina.baseUrl', e.target.value)}
                          placeholder="http://192.168.1.100/"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--gray-6)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--gray-12)'
                          }}
                        />
                        <Text size="1" color="gray" mt="1">
                          The base URL where NINA is running
                        </Text>
                      </Box>

                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          NINA API Port
                        </Text>
                        <input
                          type="number"
                          value={config?.nina.apiPort?.toString() || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('nina.apiPort', parseInt(e.target.value) || 1888)}
                          placeholder="1888"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--gray-6)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--gray-12)'
                          }}
                        />
                        <Callout.Root size="1" mt="2">
                          <Callout.Icon>
                            <InfoCircledIcon />
                          </Callout.Icon>
                          <Callout.Text>
                            The NINA Advanced API Plugin must be installed and activated for this to work.
                          </Callout.Text>
                        </Callout.Root>
                      </Box>

                      <Separator />

                      <Flex gap="4">
                        <Box style={{ flex: 1 }}>
                          <Text as="label" size="2" weight="medium" mb="1">
                            Connection Timeout (ms)
                          </Text>
                          <input
                            type="number"
                            value={config?.nina.timeout?.toString() || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('nina.timeout', parseInt(e.target.value) || 5000)}
                            placeholder="5000"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--gray-6)',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: 'var(--color-background)',
                              color: 'var(--gray-12)'
                            }}
                          />
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Text as="label" size="2" weight="medium" mb="1">
                            Retry Attempts
                          </Text>
                          <input
                            type="number"
                            value={config?.nina.retryAttempts?.toString() || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('nina.retryAttempts', parseInt(e.target.value) || 3)}
                            placeholder="3"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--gray-6)',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: 'var(--color-background)',
                              color: 'var(--gray-12)'
                            }}
                          />
                        </Box>
                      </Flex>
                    </Flex>
                  </Box>
                </Card>
              </Box>
            </Tabs.Content>

            {/* Database Tab */}
            <Tabs.Content value="database">
              <Box pt="4">
                <Card>
                  <Box p="4">
                    <Flex direction="column" gap="4">
                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          Target Scheduler Database Path
                        </Text>
                        <Flex gap="2">
                          <TextField.Root
                            value={config?.database.targetSchedulerPath || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('database.targetSchedulerPath', e.target.value)}
                            placeholder="D:/Observatory/schedulerdb.sqlite"
                            style={{ flex: 1 }}
                          />
                          <Button 
                            variant="outline" 
                            onClick={() => openDirectoryPicker('database.targetSchedulerPath')}
                            disabled={!browserSupportsFilePicker}
                          >
                            <FileTextIcon />
                            Browse Files
                          </Button>
                        </Flex>
                        <Callout.Root size="1" mt="2" color={browserSupportsFilePicker ? "blue" : "orange"}>
                          <Callout.Icon>
                            <InfoCircledIcon />
                          </Callout.Icon>
                          <Callout.Text>
                            {browserSupportsFilePicker 
                              ? "Path to your NINA Target Scheduler database file" 
                              : "File picker requires Chrome/Edge browser. Please enter file path manually in other browsers."
                            }
                          </Callout.Text>
                        </Callout.Root>
                      </Box>
                    </Flex>
                  </Box>
                </Card>
              </Box>
            </Tabs.Content>

            {/* Live Feeds Tab */}
            <Tabs.Content value="streams">
              <Box pt="4">
                <Card>
                  <Box p="4">
                    <Flex direction="column" gap="4">
                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          Live Feed 1 URL
                        </Text>
                        <TextField.Root
                          value={config?.streams.liveFeed1 || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('streams.liveFeed1', e.target.value)}
                          placeholder="https://example.com/stream1"
                        />
                        <Text size="1" color="gray" mt="1">
                          Primary live video stream URL
                        </Text>
                      </Box>

                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          Live Feed 2 URL
                        </Text>
                        <TextField.Root
                          value={config?.streams.liveFeed2 || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('streams.liveFeed2', e.target.value)}
                          placeholder="https://example.com/stream2"
                        />
                        <Text size="1" color="gray" mt="1">
                          Secondary live video stream URL
                        </Text>
                      </Box>

                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          Live Feed 3 URL
                        </Text>
                        <TextField.Root
                          value={config?.streams.liveFeed3 || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('streams.liveFeed3', e.target.value)}
                          placeholder="https://example.com/stream3"
                        />
                        <Text size="1" color="gray" mt="1">
                          Optional third live video stream URL
                        </Text>
                      </Box>

                      <Separator />

                      <Box>
                        <Text as="label" size="2" weight="medium" mb="1">
                          Connection Timeout (ms)
                        </Text>
                        <TextField.Root
                          type="number"
                          value={config?.streams.connectionTimeout?.toString() || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('streams.connectionTimeout', parseInt(e.target.value) || 10000)}
                          placeholder="10000"
                        />
                        <Text size="1" color="gray" mt="1">
                          Timeout for stream connections
                        </Text>
                      </Box>
                    </Flex>
                  </Box>
                </Card>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Box>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={saving}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={saveConfig} disabled={saving || !config}>
            {saving && <Spinner size="1" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SettingsModal;
