import React, { useState, useEffect, useRef } from 'react';
import { Card, Flex, Text, Badge, Box } from '@radix-ui/themes';
import { 
  CameraIcon, 
  ReloadIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ActivityLogIcon,
  EyeOpenIcon,
  TargetIcon
} from '@radix-ui/react-icons';

// Session state interfaces
interface SessionTarget {
  name: string;
  project: string;
  coordinates: {
    ra: number;
    dec: number;
    raString: string;
    decString: string;
    epoch: string;
    raDegrees: number;
  };
  rotation: number | null;
}

interface SessionFilter {
  name: string;
}

interface SessionLastImage {
  time: string;
}

interface SessionSafe {
  isSafe: boolean | null;
  time: string | null;
}

interface SessionActivity {
  subsystem: 'autofocus' | 'guiding' | 'mount' | 'rotator' | null;
  state: 'running' | 'guiding' | 'slewing' | 'homed' | 'syncing' | null;
  since: string | null;
}

interface SessionEquipmentChange {
  device: string;
  event: 'CONNECTED' | 'DISCONNECTED';
  time: string;
}

interface SessionData {
  target: SessionTarget | null;
  filter: SessionFilter | null;
  lastImage: SessionLastImage | null;
  safe: SessionSafe;
  activity: SessionActivity;
  lastEquipmentChange: SessionEquipmentChange | null;
  sessionStart: string | null;
  isActive: boolean;
  lastUpdate: string | null;
}

interface SessionWidgetProps {
  hideHeader?: boolean;
}

const SessionWidget: React.FC<SessionWidgetProps> = ({ hideHeader = false }) => {
  const [sessionData, setSessionData] = useState<SessionData>({
    target: null,
    filter: null,
    lastImage: null,
    safe: { isSafe: null, time: null },
    activity: { subsystem: null, state: null, since: null },
    lastEquipmentChange: null,
    sessionStart: null,
    isActive: false,
    lastUpdate: null
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Add render tracking
  React.useEffect(() => {
    console.log(`🎨 SessionWidget re-rendered #${renderCount + 1}, filter: ${sessionData.filter?.name || 'none'}`);
  });

  // Load initial session state from REST API
  const loadInitialState = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/nina/session-state');
      const data = await response.json();
      
      if (data.Success && data.Response) {
        setSessionData(data.Response);
        console.log('✅ Loaded initial session state:', data.Response.isActive ? 'Active' : 'Idle');
      } else {
        throw new Error(data.Error || 'Failed to load session state');
      }
      
    } catch (err) {
      console.error('❌ Failed to load initial session state:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session state');
    } finally {
      setLoading(false);
    }
  };

  // Connect to backend WebSocket for real-time updates
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3001/ws/session`;
      
      console.log('🔌 Connecting to session WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('✅ Connected to session WebSocket');
        setWsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          console.log('🔌 WebSocket message received:', event.data);
          const message = JSON.parse(event.data);
          
          if (message.type === 'sessionUpdate' && message.data) {
            console.log('📡 Session update received:', message.data.isActive ? 'Active' : 'Idle');
            console.log('📊 Session data:', message.data);
            console.log('🔄 Setting new session data, triggering re-render...');
            setSessionData(message.data);
            setRenderCount(prev => prev + 1);
            setError(null);
          }
        } catch (err) {
          console.error('❌ Error processing WebSocket message:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('❌ Session WebSocket disconnected');
        setWsConnected(false);
        scheduleReconnect();
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ Session WebSocket error:', error);
        setWsConnected(false);
        scheduleReconnect();
      };
      
    } catch (error) {
      console.error('❌ Failed to connect to session WebSocket:', error);
      scheduleReconnect();
    }
  };

  // Schedule WebSocket reconnection with exponential backoff
  const scheduleReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError('Connection lost. Please refresh the page.');
      return;
    }

    if (reconnectTimeoutRef.current) return; // Already scheduled

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000); // Max 10s
    console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = null;
      connectWebSocket();
    }, delay);
  };

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setError(null);
      const response = await fetch('/api/nina/session-state/refresh', { method: 'POST' });
      const data = await response.json();
      
      if (data.Success && data.Response) {
        setSessionData(data.Response);
        console.log('🔄 Manually refreshed session state');
      } else {
        throw new Error(data.Error || 'Failed to refresh session state');
      }
    } catch (err) {
      console.error('❌ Manual refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    }
  };

  // Initialize component
  useEffect(() => {
    loadInitialState();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Utility functions
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <CameraIcon />
                <Text size="4" weight="bold">Current Session</Text>
              </Flex>
              <Badge color="gray">
                <ReloadIcon className="animate-spin" />
                Loading
              </Badge>
            </Flex>
          )}
          <Flex justify="center" align="center" style={{ minHeight: '100px' }}>
            <Text size="2" color="gray">Loading session state...</Text>
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
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <CameraIcon />
                <Text size="4" weight="bold">Current Session</Text>
              </Flex>
              <Badge color="red" style={{ cursor: 'pointer' }} onClick={handleRefresh}>
                <ReloadIcon />
                Retry
              </Badge>
            </Flex>
          )}
          <Flex direction="column" gap="2">
            <ExclamationTriangleIcon color="red" />
            <Text size="2" color="red">{error}</Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (!sessionData.isActive) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <CameraIcon />
                <Text size="4" weight="bold">Current Session</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Badge color={wsConnected ? "green" : "orange"}>
                  {wsConnected ? "Connected" : "Connecting"}
                </Badge>
                <Badge color="gray" style={{ cursor: 'pointer' }} onClick={handleRefresh}>
                  <ReloadIcon />
                  Refresh
                </Badge>
              </Flex>
            </Flex>
          )}
          <Flex direction="column" align="center" gap="2" style={{ minHeight: '100px' }}>
            <ClockIcon width="24" height="24" color="gray" />
            <Text size="2" color="gray">No active imaging session</Text>
            <Text size="1" color="gray">Waiting for sequence to start...</Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <CameraIcon />
              <Text size="4" weight="bold">Current Session</Text>
              <Badge color="purple" size="1">Render #{renderCount}</Badge>
            </Flex>
            <Flex align="center" gap="2">
              {sessionData.sessionStart && (
                <Text size="1" color="gray">
                  Running {formatDuration(sessionData.sessionStart)}
                </Text>
              )}
              {sessionData.lastUpdate && (
                <Text size="1" color="gray">
                  {formatTime(sessionData.lastUpdate)}
                </Text>
              )}
              <Badge color={wsConnected ? "green" : "orange"}>
                {wsConnected ? "Live" : "Connecting"}
              </Badge>
              <Badge color="gray" style={{ cursor: 'pointer' }} onClick={handleRefresh}>
                <ReloadIcon />
                Refresh
              </Badge>
            </Flex>
          </Flex>
        )}

        {/* Current Target */}
        {sessionData.target && (
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <TargetIcon />
              <Text size="3" weight="medium">Current Target</Text>
            </Flex>
            <Box p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
              <Flex direction="column" gap="2">
                <Text size="4" weight="bold">{sessionData.target.name}</Text>
                <Text size="2" color="gray">Project: {sessionData.target.project}</Text>
                <Flex justify="between">
                  <Text size="2">RA: {sessionData.target.coordinates.raString}</Text>
                  <Text size="2">Dec: {sessionData.target.coordinates.decString}</Text>
                </Flex>
                {sessionData.target.rotation !== null && (
                  <Text size="2">Rotation: {sessionData.target.rotation}°</Text>
                )}
              </Flex>
            </Box>
          </Flex>
        )}

        {/* Current Activity */}
        {sessionData.activity.subsystem && (
          <Flex direction="column" gap="2">
            <Text size="3" weight="medium">Current Activity</Text>
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <ActivityLogIcon />
                <Text size="2" style={{ textTransform: 'capitalize' }}>
                  {sessionData.activity.subsystem} {sessionData.activity.state}
                </Text>
              </Flex>
              {sessionData.activity.since && (
                <Text size="1" color="gray">
                  {formatDuration(sessionData.activity.since)}
                </Text>
              )}
            </Flex>
          </Flex>
        )}

        {/* Filter & Last Image */}
        <Flex direction="column" gap="2">
          <Flex justify="between">
            {sessionData.filter && (
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">Current Filter</Text>
                <Badge color="blue" size="2" style={{ fontSize: '14px', padding: '4px 8px' }}>
                  🔍 {sessionData.filter.name} (R#{renderCount})
                </Badge>
              </Flex>
            )}
            {sessionData.lastImage && (
              <Flex direction="column" gap="1" align="end">
                <Text size="2" weight="medium">Last Image</Text>
                <Text size="1" color="gray">{formatTime(sessionData.lastImage.time)}</Text>
              </Flex>
            )}
          </Flex>
        </Flex>

        {/* Safety Status */}
        {sessionData.safe.isSafe !== null && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <EyeOpenIcon />
              <Text size="2">Safety Monitor</Text>
            </Flex>
            <Badge color={sessionData.safe.isSafe ? "green" : "red"}>
              {sessionData.safe.isSafe ? "Safe" : "Unsafe"}
            </Badge>
          </Flex>
        )}

        {/* Last Equipment Change */}
        {sessionData.lastEquipmentChange && (
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">Last Equipment Change</Text>
            <Text size="1" color="gray">
              {sessionData.lastEquipmentChange.device} {sessionData.lastEquipmentChange.event.toLowerCase()} at {formatTime(sessionData.lastEquipmentChange.time)}
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default SessionWidget;

