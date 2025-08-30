import React, { useState, useEffect, useRef } from 'react';
import { Button, Badge, Flex, Box, Text, AspectRatio, Card } from '@radix-ui/themes';
import { VideoIcon, ReloadIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface RTSPViewerProps {
  streams: string[];
  isConnected: boolean;
  hideHeader?: boolean;
  stats?: {
    resolution?: string;
    frameRate?: string;
    bitrate?: string;
  }[];
}

const RTSPViewer: React.FC<RTSPViewerProps> = ({ streams, isConnected, hideHeader = false, stats }) => {
  const [activeStream, setActiveStream] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [imgSrc, setImgSrc] = useState<string>('');
  const [imgLoading, setImgLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{width: number, height: number} | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Update image source when streams change
  useEffect(() => {
    if (streams.length > 0 && streams[activeStream]) {
      const updateImg = () => {
        setImgSrc(`${streams[activeStream]}?t=${Date.now()}`);
      };
      
      updateImg(); // Update immediately
      const interval = setInterval(updateImg, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [streams, activeStream]);

  // Determine optimal container sizing based on content
  const getStreamType = (streamIndex: number) => {
    if (streams[streamIndex]?.includes('allsky')) {
      return 'allsky'; // Square/circular content
    }
    return 'widescreen'; // Rectangular content
  };

  const getContainerStyle = () => {
    const streamType = getStreamType(activeStream);
    
    if (streamType === 'allsky') {
      return {
        width: '100%',
        maxWidth: '380px', // Optimized size for allsky content
        aspectRatio: '1',
        margin: '0 auto', // Center the container
        // Fallback for older browsers
        '@supports not (aspect-ratio: 1)': {
          height: '380px'
        }
      };
    } else {
      return {
        width: '100%',
        aspectRatio: '16/9',
        // Fallback for older browsers  
        '@supports not (aspect-ratio: 16/9)': {
          paddingBottom: '56.25%', // 16:9 aspect ratio
          height: 0,
          position: 'relative' as const
        }
      };
    }
  };

  const getImageStyle = (streamType: string) => {
    const baseStyle = {
      width: '100%', 
      height: '100%', 
      borderRadius: 'var(--radius-2)',
      opacity: (imgLoading || isTransitioning) ? 0.3 : 1,
      transition: 'opacity 0.5s ease-in-out',
      display: 'block' as const
    };

    if (streamType === 'allsky') {
      return {
        ...baseStyle,
        objectFit: 'contain' as const,
        // Ensure the circular/square content is properly contained
        maxWidth: '100%',
        maxHeight: '100%'
      };
    } else {
      return {
        ...baseStyle,
        objectFit: 'cover' as const
      };
    }
  };

  const handleStreamChange = (index: number) => {
    if (index === activeStream) return;
    
    // Start transition with improved timing
    setIsTransitioning(true);
    setImgLoading(true);
    setConnectionStatus('connecting');
    
    // Quick transition start for responsive feel
    setTimeout(() => {
      setActiveStream(index);
      
      // Extended time for the container to resize smoothly
      setTimeout(() => {
        setConnectionStatus('connected');
        setIsTransitioning(false);
      }, 450); // Slightly longer to allow container resize
    }, 100); // Quicker start
  };

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setImgLoading(true);
    setImgSrc(`${streams[activeStream]}?t=${Date.now()}`);
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);
  };

  const handleImageLoad = () => {
    setImgLoading(false);
    
    // Capture natural dimensions for responsive sizing
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      setNaturalDimensions({ width: naturalWidth, height: naturalHeight });
    }
  };

  const handleImageError = () => {
    setImgLoading(false);
    setConnectionStatus('error');
  };

  if (!streams.length) {
    return (
      <Card>
        <Box p="4">
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
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Stream Selection */}
        {streams.length > 1 && (
          <Flex gap="2" wrap="wrap">
            {streams.map((stream, index) => (
              <Button
                key={index}
                variant={index === activeStream ? "solid" : "soft"}
                size="1"
                onClick={() => handleStreamChange(index)}
                disabled={isTransitioning}
                style={{ cursor: 'pointer' }}
              >
                Camera {index + 1}
              </Button>
            ))}
          </Flex>
        )}

      {/* Dynamic Video Container */}
      <Box 
        style={{ 
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isTransitioning ? 0.8 : 1,
          transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
          ...getContainerStyle()
        }}
      >
        <Box
          style={{ 
            backgroundColor: 'var(--color-surface-raised)', 
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--gray-6)',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            minHeight: getStreamType(activeStream) === 'allsky' ? '300px' : '200px'
          }}
        >
          {imgSrc ? (
            <>
              {/* Loading Overlay */}
              {(imgLoading || isTransitioning) && (
                <Flex 
                  direction="column" 
                  align="center" 
                  justify="center" 
                  style={{ 
                    position: 'absolute', 
                    left: 0, 
                    top: 0, 
                    width: '100%', 
                    height: '100%', 
                    minHeight: 200, 
                    zIndex: 2, 
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(2px)'
                  }}
                >
                  <ReloadIcon 
                    width="32" 
                    height="32" 
                    className="loading-spinner"
                    style={{ color: 'var(--accent-9)', marginBottom: '8px' }}
                  />
                  <Text size="2" color="gray">
                    {isTransitioning ? 'Switching camera...' : 'Loading stream...'}
                  </Text>
                </Flex>
              )}

              {/* Video Image */}
              <img
                ref={imgRef}
                src={imgSrc}
                alt={`Live Stream ${activeStream + 1}`}
                style={getImageStyle(getStreamType(activeStream))}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {/* Connection Error State */}
              {connectionStatus === 'error' && (
                <Flex 
                  direction="column" 
                  align="center" 
                  justify="center" 
                  gap="2"
                  style={{ 
                    position: 'absolute', 
                    left: 0, 
                    top: 0, 
                    width: '100%', 
                    height: '100%', 
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 3
                  }}
                >
                  <ExclamationTriangleIcon width="32" height="32" color="var(--red-9)" />
                  <Text size="2" color="red">Stream unavailable</Text>
                  <Button 
                    size="1" 
                    variant="soft" 
                    onClick={handleReconnect}
                    style={{ cursor: 'pointer' }}
                  >
                    <ReloadIcon width="14" height="14" />
                    Reconnect
                  </Button>
                </Flex>
              )}
            </>
          ) : (
            <Flex align="center" justify="center" style={{ height: '100%' }}>
              <Text size="2" color="gray">No stream available</Text>
            </Flex>
          )}

          {/* Live Badge */}
          <Badge 
            color="red" 
            size="1" 
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 1
            }}
          >
            LIVE
          </Badge>
        </Box>
      </Box>

      {/* Stream Info */}
      {stats && stats[activeStream] && (
        <Flex direction="column" gap="2">
          {stats[activeStream]?.resolution && stats[activeStream].resolution !== 'Unknown' && (
            <Flex justify="between">
              <Text size="2" color="gray">Resolution</Text>
              <Text size="2" weight="medium">{stats[activeStream].resolution}</Text>
            </Flex>
          )}
          {stats[activeStream]?.frameRate && stats[activeStream].frameRate !== 'Unknown' && (
            <Flex justify="between">
              <Text size="2" color="gray">Frame Rate</Text>
              <Text size="2" weight="medium">{stats[activeStream].frameRate}</Text>
            </Flex>
          )}
          {stats[activeStream]?.bitrate && stats[activeStream].bitrate !== 'Unknown' && (
            <Flex justify="between">
              <Text size="2" color="gray">Bitrate</Text>
              <Text size="2" weight="medium">{stats[activeStream].bitrate}</Text>
            </Flex>
          )}
        </Flex>
      )}
      </Flex>
    </Card>
  );
};

export default RTSPViewer;
