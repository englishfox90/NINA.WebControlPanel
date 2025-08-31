/**
 * Session Widget Header Component
 * Handles the widget header with title, connection status, and refresh button
 */

import React from 'react';
import { Flex, Text, Badge, Button } from '@radix-ui/themes';
import { 
  ReloadIcon,
  ExclamationTriangleIcon,
  ActivityLogIcon
} from '@radix-ui/react-icons';

interface SessionHeaderProps {
  title: string;
  wsConnected: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  hideHeader?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  title,
  wsConnected,
  refreshing,
  onRefresh,
  hideHeader = false
}) => {
  if (hideHeader) return null;

  const renderConnectionStatus = () => {
    if (!wsConnected) {
      return (
        <Badge color="red" variant="soft">
          <ExclamationTriangleIcon width="12" height="12" />
          Disconnected
        </Badge>
      );
    }
    
    return (
      <Badge color="green" variant="soft">
        <ActivityLogIcon width="12" height="12" />
        Live
      </Badge>
    );
  };

  return (
    <Flex align="center" justify="between" mb="3">
      <Text weight="bold" size="4">
        {title}
      </Text>
      <Flex align="center" gap="2">
        {renderConnectionStatus()}
        <Button 
          size="1" 
          variant="ghost" 
          onClick={onRefresh}
          disabled={refreshing}
        >
          <ReloadIcon className={refreshing ? "animate-spin" : ""} width="12" height="12" />
        </Button>
      </Flex>
    </Flex>
  );
};
