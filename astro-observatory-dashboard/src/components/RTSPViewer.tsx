import React, { useState } from 'react';
import { Button, Badge, Flex, Box, Text, AspectRatio } from '@radix-ui/themes';
import { VideoIcon, ReloadIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface RTSPViewerProps {
  streams: string[];
  isConnected: boolean;
}

const RTSPViewer: React.FC<RTSPViewerProps> = ({ streams, isConnected }) => {
  const [activeStream, setActiveStream] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connected');

  const handleStreamChange = (index: number) => {
    setActiveStream(index);
    setConnectionStatus('connecting');
    // Simulate connection delay
    setTimeout(() => {
      setConnectionStatus(Math.random() > 0.8 ? 'error' : 'connected');
    }, 1000);
  };

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);
  };

  if (!streams.length) {
    return (
      <Box>
        <AspectRatio ratio={16 / 9}>
          <Flex 
            align="center" 
            justify="center" 
            style={{ 
              backgroundColor: 'var(--color-surface-raised)', 
              borderRadius: 'var(--radius-2)',
              border: '1px solid var(--gray-6)'
            }}
          >
            <Flex direction="column" align="center" gap="2">
              <VideoIcon width="32" height="32" color="var(--gray-9)" />
              <Text size="2" color="gray">No streams configured</Text>
            </Flex>
          </Flex>
        </AspectRatio>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {/* Stream Selection */}
      {streams.length > 1 && (
        <Flex gap="2" wrap="wrap">
          {streams.map((stream, index) => (
            <Button
              key={index}
              variant={index === activeStream ? "solid" : "soft"}
              size="1"
              onClick={() => handleStreamChange(index)}
            >
              Camera {index + 1}
            </Button>
          ))}
        </Flex>
      )}

      {/* Video Container */}
      <AspectRatio ratio={16 / 9}>
        <Flex 
          align="center" 
          justify="center"
          style={{ 
            backgroundColor: 'var(--color-surface-raised)', 
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--gray-6)',
            position: 'relative'
          }}
        >
          {connectionStatus === 'connecting' ? (
            <Flex direction="column" align="center" gap="2">
              <ReloadIcon width="24" height="24" className="animate-spin" />
              <Text size="2">Connecting to stream...</Text>
            </Flex>
          ) : connectionStatus === 'error' ? (
            <Flex direction="column" align="center" gap="3">
              <ExclamationTriangleIcon width="24" height="24" color="var(--red-9)" />
              <Text size="2" color="red">Connection failed</Text>
              <Button size="1" onClick={handleReconnect}>
                <ReloadIcon width="14" height="14" />
                Reconnect
              </Button>
            </Flex>
          ) : (
            <Flex direction="column" align="center" gap="2">
              <VideoIcon width="32" height="32" color="var(--green-9)" />
              <Text size="3" weight="medium">🎥 Live Stream</Text>
              <Text size="1" color="gray">Stream: {streams[activeStream]}</Text>
              <Badge color="red" size="1" style={{
                position: 'absolute',
                top: '8px',
                right: '8px'
              }}>
                LIVE
              </Badge>
            </Flex>
          )}
        </Flex>
      </AspectRatio>

      {/* Stream Info */}
      <Flex direction="column" gap="2">
        <Flex justify="between">
          <Text size="2" color="gray">Resolution</Text>
          <Text size="2" weight="medium">1920x1080</Text>
        </Flex>
        <Flex justify="between">
          <Text size="2" color="gray">Frame Rate</Text>
          <Text size="2" weight="medium">30 fps</Text>
        </Flex>
        <Flex justify="between">
          <Text size="2" color="gray">Bitrate</Text>
          <Text size="2" weight="medium">2.5 Mbps</Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default RTSPViewer;