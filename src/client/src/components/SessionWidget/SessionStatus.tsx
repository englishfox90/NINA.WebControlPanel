/**
 * Session Status Component
 * Displays session window information and safety status
 */

import React from 'react';
import { Flex, Text, Badge, Box } from '@radix-ui/themes';
import { 
  PlayIcon,
  StopIcon,
  TimerIcon,
  GearIcon
} from '@radix-ui/react-icons';
import { 
  isEnhancedSessionData, 
  getSessionStatus,
  extractSafetyInfo,
  formatTimestamp,
  formatDuration 
} from './utils';

interface SessionStatusProps {
  sessionData: any;
  enableTimezoneFormatting?: boolean;
  showSessionWindow?: boolean;
}

export const SessionStatus: React.FC<SessionStatusProps> = ({ 
  sessionData, 
  enableTimezoneFormatting = true,
  showSessionWindow = true 
}) => {
  const sessionStatus = getSessionStatus(sessionData);
  const safetyInfo = extractSafetyInfo(sessionData);
  const isEnhanced = isEnhancedSessionData(sessionData);

  // Enhanced session window
  const renderSessionWindow = () => {
    if (!showSessionWindow || !isEnhanced) return null;
    
    const enhanced = sessionData as any;
    if (!enhanced?.session) return null;
    
    const isActiveSession = enhanced.session.startedAt && !enhanced.session.finishedAt;
    const sessionDuration = formatDuration(enhanced.session.startedAt, enhanced.session.finishedAt);
    
    return (
      <Box mb="3">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            {isActiveSession ? (
              <Badge color="blue" variant="soft" size="2">
                <PlayIcon width="12" height="12" />
                Active Session
              </Badge>
            ) : (
              <Badge color="gray" variant="soft" size="2">
                <StopIcon width="12" height="12" />
                Session Idle
              </Badge>
            )}
            
            {sessionDuration && (
              <Flex align="center" gap="1">
                <TimerIcon width="12" height="12" />
                <Text size="2" color="gray">
                  {sessionDuration}
                </Text>
              </Flex>
            )}
          </Flex>
          
          {enhanced.session.startedAt && (
            <Text size="1" color="gray">
              Started: {formatTimestamp(enhanced.session.startedAt, enableTimezoneFormatting)}
            </Text>
          )}
        </Flex>
      </Box>
    );
  };

  // Safety status
  const renderSafetyStatus = () => {
    if (!safetyInfo || safetyInfo.isSafe === null || safetyInfo.isSafe === undefined) {
      return null;
    }

    const safetyTime = safetyInfo.changedAt || safetyInfo.time;
    
    return (
      <Flex justify="between" align="center">
        <Flex align="center" gap="2">
          <GearIcon width="14" height="14" />
          <Text size="2">Safety Monitor</Text>
        </Flex>
        <Badge color={safetyInfo.isSafe ? "green" : "red"} variant="soft">
          {safetyInfo.isSafe ? "Safe" : "Unsafe"}
          {safetyTime && (
            <Text size="1" ml="1">
              ({formatTimestamp(safetyTime, enableTimezoneFormatting)})
            </Text>
          )}
        </Badge>
      </Flex>
    );
  };

  return (
    <>
      {renderSessionWindow()}
      {renderSafetyStatus()}
    </>
  );
};
