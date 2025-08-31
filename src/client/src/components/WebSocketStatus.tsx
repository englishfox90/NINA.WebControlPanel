import React from 'react';
import { Flex, Badge, Text } from '@radix-ui/themes';
import { DotFilledIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useUnifiedWebSocket } from '../hooks/useUnifiedWebSocket';
import type { WebSocketConnectionStatus } from '../interfaces/websocket';

interface WebSocketStatusProps {
  compact?: boolean;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ compact = false }) => {
  const { connected, reconnectAttempts, lastHeartbeat, error } = useUnifiedWebSocket({
    autoConnect: false // Don't auto-connect, just monitor
  });

  const getStatusColor = () => {
    if (error) return 'red';
    if (!connected && reconnectAttempts > 0) return 'orange';
    if (connected) return 'green';
    return 'gray';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (!connected && reconnectAttempts > 0) return `Reconnecting (${reconnectAttempts})`;
    if (connected) {
      const timeSinceHeartbeat = Date.now() - lastHeartbeat;
      if (timeSinceHeartbeat < 30000) return 'Connected';
      return 'Stale';
    }
    return 'Disconnected';
  };

  const getIcon = () => {
    if (!connected && reconnectAttempts > 0) {
      return <ReloadIcon className="animate-spin" />;
    }
    return <DotFilledIcon />;
  };

  if (compact) {
    return (
      <Badge color={getStatusColor()} size="1">
        <Flex align="center" gap="1">
          {getIcon()}
          WS
        </Flex>
      </Badge>
    );
  }

  return (
    <Flex align="center" gap="2">
      <Badge color={getStatusColor()} size="1">
        <Flex align="center" gap="1">
          {getIcon()}
          {getStatusText()}
        </Flex>
      </Badge>
      {error && (
        <Text size="1" color="red">
          {error}
        </Text>
      )}
    </Flex>
  );
};

export default WebSocketStatus;
