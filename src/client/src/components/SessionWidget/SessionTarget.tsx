/**
 * Session Target Component
 * Displays current target information
 */

import React from 'react';
import { Flex, Text, Badge, Box } from '@radix-ui/themes';
import { TargetIcon } from '@radix-ui/react-icons';
import { extractTargetInfo } from './utils';

interface SessionTargetProps {
  sessionData: any;
}

export const SessionTarget: React.FC<SessionTargetProps> = ({ sessionData }) => {
  const targetInfo = extractTargetInfo(sessionData);
  
  if (!targetInfo?.name) return null;

  // Handle both enhanced and legacy target formats, plus TS-TARGETSTART event format
  const raString = targetInfo.raString || 
                   targetInfo.coordinates?.raString || 
                   targetInfo.Coordinates?.RAString;
  const decString = targetInfo.decString || 
                    targetInfo.coordinates?.decString || 
                    targetInfo.Coordinates?.DecString;

  return (
    <Flex direction="column" gap="2" mb="3">
      <Flex align="center" gap="2">
        <TargetIcon width="14" height="14" />
        <Text weight="medium" size="3">Current Target</Text>
      </Flex>
      
      <Box p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
        <Flex direction="column" gap="2">
          <Flex justify="between" align="start">
            <Text weight="bold" size="4">{targetInfo.name}</Text>
            {targetInfo.project && (
              <Badge variant="soft" size="1">{targetInfo.project}</Badge>
            )}
          </Flex>
          
          <Flex gap="4" wrap="wrap">
            {raString && (
              <Text size="2" color="gray">RA: {raString}</Text>
            )}
            {decString && (
              <Text size="2" color="gray">Dec: {decString}</Text>
            )}
            {targetInfo.rotation !== null && targetInfo.rotation !== undefined && (
              <Text size="2" color="gray">Rot: {targetInfo.rotation}°</Text>
            )}
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
};
