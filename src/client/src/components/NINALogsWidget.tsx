/**
 * NINA Logs Widget
 * Displays the latest NINA application logs with configurable line count and manual refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Flex, 
  Text, 
  Button, 
  Badge,
  ScrollArea,
  Separator,
  Select,
  Spinner,
  Callout
} from '@radix-ui/themes';
import { 
  ActivityLogIcon, 
  ReloadIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon
} from '@radix-ui/react-icons';

interface LogEntry {
  Line: string;
  Source: string;
  Member: string;
  Message: string;
  Level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE';
  Timestamp: string;
}

interface LogsResponse {
  Response: LogEntry[];
  Success: boolean;
  Error: string | null;
  StatusCode: number;
  Type: string;
  timestamp: string;
  lineCount: number;
  mockMode?: boolean;
}

interface NINALogsWidgetProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

const NINALogsWidget: React.FC<NINALogsWidgetProps> = ({ 
  onRefresh, 
  hideHeader = false 
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState<string>('25');
  const [lastRefresh, setLastRefresh] = useState<string>('');

  // Available line count options
  const lineCountOptions = ['10', '25', '50', '100'];

  // Fetch logs from API
  const fetchLogs = useCallback(async (count: string = lineCount) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📋 Fetching NINA logs: ${count} lines`);
      
      const response = await fetch(`/api/nina/logs?lineCount=${count}`);
      const data: LogsResponse = await response.json();
      
      if (data.Success && Array.isArray(data.Response)) {
        setLogs(data.Response);
        setLastRefresh(new Date().toLocaleTimeString());
        console.log(`✅ Loaded ${data.Response.length} log entries`);
      } else {
        throw new Error(data.Error || 'Failed to fetch logs');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error fetching NINA logs:', errorMsg);
      setError(errorMsg);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [lineCount]);

  // Handle refresh button click
  const handleRefresh = async () => {
    await fetchLogs();
    onRefresh?.();
  };

  // Handle line count change
  const handleLineCountChange = (newCount: string) => {
    setLineCount(newCount);
    fetchLogs(newCount);
  };

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchLogs();
    
    // Set up auto-refresh every minute
    const interval = setInterval(() => {
      fetchLogs();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Get log level color and icon
  const getLogLevelProps = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return { 
          color: 'red' as const, 
          icon: <CrossCircledIcon />,
          variant: 'solid' as const 
        };
      case 'WARN':
        return { 
          color: 'orange' as const, 
          icon: <ExclamationTriangleIcon />,
          variant: 'soft' as const 
        };
      case 'INFO':
        return { 
          color: 'blue' as const, 
          icon: <InfoCircledIcon />,
          variant: 'soft' as const 
        };
      case 'DEBUG':
        return { 
          color: 'gray' as const, 
          icon: <ActivityLogIcon />,
          variant: 'outline' as const 
        };
      case 'TRACE':
        return { 
          color: 'gray' as const, 
          icon: <ActivityLogIcon />,
          variant: 'outline' as const 
        };
      default:
        return { 
          color: 'gray' as const, 
          icon: <ActivityLogIcon />,
          variant: 'outline' as const 
        };
    }
  };

  // Format timestamp as relative time (X minutes/hours ago)
  const formatRelativeTime = (timestamp: string) => {
    try {
      const now = new Date();
      
      // NINA is in UTC-6 (America/Chicago), browser is in UTC-7
      // NINA timestamps are 1 hour ahead of local time
      // Format: 2025-11-21T23:44:33.7240
      let logTime: Date;
      
      // Parse the NINA timestamp directly (it's in Chicago time)
      const ninaTime = new Date(timestamp);
      
      // NINA is UTC-6, adjust by 1 hour to match local UTC-7 time
      // Subtract 1 hour (3600000 ms) from NINA time to get local equivalent
      logTime = new Date(ninaTime.getTime() - (1 * 60 * 60 * 1000));
      
      // Calculate difference in milliseconds
      const diffMs = now.getTime() - logTime.getTime();
      const diffMinutes = Math.floor(Math.abs(diffMs) / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      // Debug logging for troubleshooting
      if (diffMinutes > 60) {
        console.log('Timestamp debug:', {
          original: timestamp,
          parsed: logTime.toISOString(),
          now: now.toISOString(),
          diffMs,
          diffMinutes
        });
      }

      // Handle negative differences (future timestamps - clock skew)
      if (diffMs < 0) {
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `in ${diffMinutes}m`;
        if (diffHours < 24) return `in ${diffHours}h`;
        return `in ${diffDays}d`;
      }

      // Handle positive differences (past timestamps)
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (error) {
      console.error('Error parsing timestamp:', timestamp, error);
      // Fallback: show the raw timestamp
      try {
        return new Date(timestamp).toLocaleTimeString();
      } catch {
        return timestamp;
      }
    }
  };

  // No truncation - show full messages
  const formatMessage = (message: string) => {
    return message; // Show full message without truncation
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header - Only show when not hidden */}
        {!hideHeader && (
          <Flex align="center" gap="2" mb="2">
            <ActivityLogIcon />
            <Text size="3" weight="bold">NINA Logs</Text>
          </Flex>
        )}

        {/* Error state */}
        {error && (
          <Callout.Root color="red" size="1">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text size="2" weight="medium">Connection Error</Text><br />
              <Text size="1" color="gray">{error}</Text>
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Loading state */}
        {loading && !error && (
          <Flex justify="center" align="center" py="6">
            <Flex direction="column" align="center" gap="2">
              <Spinner size="2" />
              <Text size="1" color="gray">Loading logs...</Text>
            </Flex>
          </Flex>
        )}

        {/* Logs display */}
        {!loading && !error && logs.length > 0 && (
          <ScrollArea style={{ height: '500px' }}>
            <Flex direction="column" gap="1">
              {logs.map((log, index) => {
                const levelProps = getLogLevelProps(log.Level);
                return (
                  <React.Fragment key={index}>
                    <Flex direction="column" gap="1" p="2" style={{ 
                      backgroundColor: 'var(--gray-2)',
                      borderRadius: '4px'
                    }}>
                      {/* Log header */}
                      <Flex justify="between" align="center" gap="2">
                        <Flex align="center" gap="2">
                          <Badge 
                            color={levelProps.color} 
                            variant={levelProps.variant}
                            size="1"
                          >
                            {levelProps.icon}
                            {log.Level}
                          </Badge>
                          <Text size="1" color="gray">
                            {formatRelativeTime(log.Timestamp)}
                          </Text>
                          <Text size="1" color="gray">
                            {log.Source}:{log.Member}
                          </Text>
                        </Flex>
                      </Flex>
                      
                      {/* Log message */}
                      <Text size="2" style={{ 
                        fontFamily: 'monospace',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {formatMessage(log.Message)}
                      </Text>
                    </Flex>
                    
                    {index < logs.length - 1 && (
                      <Separator size="1" style={{ margin: '1px 0' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </Flex>
          </ScrollArea>
        )}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <Flex justify="center" align="center" py="6">
            <Flex direction="column" align="center" gap="2">
              <ActivityLogIcon style={{ width: '24px', height: '24px', opacity: 0.5 }} />
              <Text size="2" color="gray">No logs available</Text>
              <Text size="1" color="gray">Try refreshing or check NINA connection</Text>
            </Flex>
          </Flex>
        )}

        {/* Footer with controls */}
        {!loading && (
          <Flex justify="between" align="center" pt="2">
            <Text size="1" color="gray">
              {logs.length > 0 ? `Showing ${logs.length} log entries • Auto-refresh every minute` : 'No logs available'}
            </Text>
            
            <Flex align="center" gap="2">
              {/* Line count selector */}
              <Text size="1" color="gray">Lines:</Text>
              <Select.Root value={lineCount} onValueChange={handleLineCountChange}>
                <Select.Trigger />
                <Select.Content>
                  {lineCountOptions.map(count => (
                    <Select.Item key={count} value={count}>
                      {count}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              
              {/* Refresh button */}
              <Button 
                variant="soft" 
                size="1" 
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? <Spinner size="1" /> : <ReloadIcon />}
                Refresh
              </Button>
            </Flex>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default NINALogsWidget;