/**
 * Session Widget Loading States
 * Components for loading, error, and empty states
 */

import React from 'react';
import { Card, Flex, Text, Badge, Button } from '@radix-ui/themes';
import { 
  ReloadIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@radix-ui/react-icons';

interface SessionLoadingProps {
  hideHeader?: boolean;
  title?: string;
}

export const SessionLoading: React.FC<SessionLoadingProps> = ({ 
  hideHeader = false, 
  title = "Session" 
}) => (
  <Card>
    <Flex direction="column" gap="3" p="4">
      {!hideHeader && (
        <Flex align="center" justify="between">
          <Text weight="bold" size="4">{title}</Text>
          <Badge color="gray">
            <ReloadIcon className="animate-spin" width="12" height="12" />
            Loading
          </Badge>
        </Flex>
      )}
      
      <Flex align="center" gap="2" justify="center" py="6">
        <ReloadIcon className="animate-spin" width="20" height="20" />
        <Text color="gray">Loading session data...</Text>
      </Flex>
    </Flex>
  </Card>
);

interface SessionErrorProps {
  error: string;
  hideHeader?: boolean;
  title?: string;
  onRetry: () => void;
  retrying?: boolean;
}

export const SessionError: React.FC<SessionErrorProps> = ({ 
  error, 
  hideHeader = false, 
  title = "Session",
  onRetry,
  retrying = false
}) => (
  <Card>
    <Flex direction="column" gap="3" p="4">
      {!hideHeader && (
        <Flex align="center" justify="between">
          <Text weight="bold" size="4">{title}</Text>
          <Button 
            size="1" 
            variant="ghost" 
            onClick={onRetry}
            disabled={retrying}
          >
            <ReloadIcon className={retrying ? "animate-spin" : ""} width="12" height="12" />
            Retry
          </Button>
        </Flex>
      )}
      
      <Flex direction="column" gap="2" align="center" py="4">
        <ExclamationTriangleIcon color="red" width="20" height="20" />
        <Text size="2" color="red" align="center">{error}</Text>
      </Flex>
    </Flex>
  </Card>
);

interface SessionIdleProps {
  hideHeader?: boolean;
  title?: string;
  wsConnected?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const SessionIdle: React.FC<SessionIdleProps> = ({ 
  hideHeader = false, 
  title = "Session",
  wsConnected = false,
  onRefresh,
  refreshing = false
}) => (
  <Card>
    <Flex direction="column" gap="3" p="4">
      {!hideHeader && (
        <Flex align="center" justify="between">
          <Text weight="bold" size="4">{title}</Text>
          <Flex align="center" gap="2">
            <Badge color={wsConnected ? "green" : "orange"}>
              {wsConnected ? "Connected" : "Connecting"}
            </Badge>
            {onRefresh && (
              <Button 
                size="1" 
                variant="ghost" 
                onClick={onRefresh}
                disabled={refreshing}
              >
                <ReloadIcon className={refreshing ? "animate-spin" : ""} width="12" height="12" />
              </Button>
            )}
          </Flex>
        </Flex>
      )}
      
      <Flex direction="column" align="center" gap="2" py="6">
        <ClockIcon width="24" height="24" color="gray" />
        <Text size="2" color="gray">No active session</Text>
        <Text size="1" color="gray">Waiting for imaging sequence to start...</Text>
      </Flex>
    </Flex>
  </Card>
);
