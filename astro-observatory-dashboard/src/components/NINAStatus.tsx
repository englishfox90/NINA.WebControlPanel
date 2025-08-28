import React from 'react';
import { Flex, Text, Badge, Progress, Box } from '@radix-ui/themes';
import { PlayIcon, TargetIcon, GearIcon } from '@radix-ui/react-icons';

interface NINAStatusProps {
  status: string;
  progress: number;
  isConnected: boolean;
}

const NINAStatus: React.FC<NINAStatusProps> = ({ status, progress, isConnected }) => {
  const getStatusColor = (status: string): 'green' | 'red' | 'orange' => {
    if (!isConnected) return 'red';
    if (status.toLowerCase().includes('error')) return 'red';
    if (status.toLowerCase().includes('warning')) return 'orange';
    return 'green';
  };

  const statusColor = getStatusColor(status);

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between">
        <Text size="2" color="gray">Connection</Text>
        <Badge color={isConnected ? 'green' : 'red'} variant="soft">
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </Flex>
      
      <Flex justify="between">
        <Text size="2" color="gray">Status</Text>
        <Badge color={statusColor} variant="soft">
          {status}
        </Badge>
      </Flex>
      
      <Flex justify="between">
        <Text size="2" color="gray">Session Progress</Text>
        <Text size="2" weight="medium">{Math.round(progress)}%</Text>
      </Flex>

      {/* Progress Bar */}
      <Box>
        <Flex justify="between" mb="2">
          <Flex align="center" gap="1">
            <PlayIcon width="14" height="14" />
            <Text size="2" weight="medium">Imaging Session</Text>
          </Flex>
          <Text size="2" weight="bold">{Math.round(progress)}%</Text>
        </Flex>
        <Progress 
          value={progress} 
          max={100}
          color={statusColor}
          size="2"
        />
      </Box>

      <Flex justify="between">
        <Flex align="center" gap="1">
          <TargetIcon width="14" height="14" />
          <Text size="2" color="gray">Target</Text>
        </Flex>
        <Text size="2" weight="medium">M31 - Andromeda Galaxy</Text>
      </Flex>
      
      <Flex justify="between">
        <Text size="2" color="gray">Sequence</Text>
        <Text size="2" weight="medium">12/24 frames</Text>
      </Flex>
      
      <Flex justify="between">
        <Flex align="center" gap="1">
          <GearIcon width="14" height="14" />
          <Text size="2" color="gray">Filter</Text>
        </Flex>
        <Text size="2" weight="medium">Luminance</Text>
      </Flex>
    </Flex>
  );
};

export default NINAStatus;