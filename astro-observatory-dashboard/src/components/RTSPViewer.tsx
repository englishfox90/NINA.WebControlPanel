import React, { useState, useEffect } from 'react';
import { Button, Badge, Flex, Box, Text, AspectRatio } from '@radix-ui/themes';
import { VideoIcon, ReloadIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface RTSPViewerProps {
  streams: string[];
  isConnected: boolean;
  stats?: {
    resolution?: string;
    frameRate?: string;
    bitrate?: string;
  }[];
}

const RTSPViewer: React.FC<RTSPViewerProps> = ({ streams, isConnected, stats }) => {
  const [activeStream, setActiveStream] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [imgSrc, setImgSrc] = useState<string>(streams[0] || '');
  const [imgLoading, setImgLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  // Refresh image every minute
  useEffect(() => {
    if (!streams.length) return;
    // Only show loading animation on first load or when switching feeds
    if (firstLoad) {
      setImgLoading(true);
      setFirstLoad(false);
    }
    const updateImg = () => {
      // Do not show loading animation on periodic refresh
      setImgSrc(`${streams[activeStream]}?t=${Date.now()}`);
    };
    updateImg();
    const interval = setInterval(updateImg, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [streams, activeStream]);

  // Determine aspect ratio based on stream URL
  let aspectRatio = 16 / 9;
  if (streams[activeStream]?.includes('allsky')) {
    aspectRatio = 1; // Square aspect for allsky
  }

  const handleStreamChange = (index: number) => {
    setActiveStream(index);
    setConnectionStatus('connecting');
    setImgLoading(true);
    setFirstLoad(false);
    // Simulate connection delay
    setTimeout(() => {
      setConnectionStatus('connected');
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

      {/* MJPEG Image Container */}
      <AspectRatio ratio={aspectRatio}>
        <Flex 
          align="center" 
          justify="center"
          style={{ 
            backgroundColor: 'var(--color-surface-raised)', 
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--gray-6)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {imgSrc ? (
            <>
              {imgLoading && (
                <Flex direction="column" align="center" justify="center" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', minHeight: 240, zIndex: 2, background: 'rgba(0,0,0,0.2)' }}>
                  <ReloadIcon width="32" height="32" className="animate-spin" />
                  <Text size="2" color="gray">Loading stream...</Text>
                </Flex>
              )}
              <img
                src={imgSrc}
                alt={`Live Stream ${activeStream + 1}`}
                style={{ width: '100%', height: '100%', objectFit: aspectRatio === 1 ? 'contain' : 'cover', borderRadius: 'var(--radius-2)', opacity: imgLoading ? 0 : 1, transition: 'opacity 0.3s' }}
                onLoad={() => setImgLoading(false)}
                onError={() => setImgLoading(false)}
              />
            </>
          ) : (
            <Text size="2" color="gray">No stream available</Text>
          )}
          <Badge color="red" size="1" style={{
            position: 'absolute',
            top: '8px',
            right: '8px'
          }}>
            LIVE
          </Badge>
        </Flex>
      </AspectRatio>

      {/* Stream Info */}
      <Flex direction="column" gap="2">
        {(stats && stats[activeStream]?.resolution && stats[activeStream].resolution !== 'Unknown') && (
          <Flex justify="between">
            <Text size="2" color="gray">Resolution</Text>
            <Text size="2" weight="medium">{stats[activeStream].resolution}</Text>
          </Flex>
        )}
        {(stats && stats[activeStream]?.frameRate && stats[activeStream].frameRate !== 'Unknown') && (
          <Flex justify="between">
            <Text size="2" color="gray">Frame Rate</Text>
            <Text size="2" weight="medium">{stats[activeStream].frameRate}</Text>
          </Flex>
        )}
        {(stats && stats[activeStream]?.bitrate && stats[activeStream].bitrate !== 'Unknown') && (
          <Flex justify="between">
            <Text size="2" color="gray">Bitrate</Text>
            <Text size="2" weight="medium">{stats[activeStream].bitrate}</Text>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};

export default RTSPViewer;