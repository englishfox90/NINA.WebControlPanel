import React, { useState, useEffect, useRef } from 'react';
import { Button, Badge, Flex, Box, Text, AspectRatio, Card, Dialog, IconButton } from '@radix-ui/themes';
import { VideoIcon, ReloadIcon, ExclamationTriangleIcon, Cross2Icon, EnterFullScreenIcon } from '@radix-ui/react-icons';
import type { RTSPViewerProps } from '../interfaces/dashboard';

const RTSPViewer: React.FC<RTSPViewerProps> = ({ streams, isConnected, hideHeader = false, stats }) => {
  const [activeStream, setActiveStream] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [imgSrc, setImgSrc] = useState<string>('');
  const [imgLoading, setImgLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{width: number, height: number} | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [modalImgSrc, setModalImgSrc] = useState<string>('');
  const [modalImgLoading, setModalImgLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const modalImgRef = useRef<HTMLImageElement>(null);

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

  // Separate effect for modal image refresh
  useEffect(() => {
    if (isDialogOpen && streams[activeStream]) {
      const updateModalImg = () => {
        setModalImgSrc(`${streams[activeStream]}?t=${Date.now()}`);
      };
      
      updateModalImg(); // Update immediately when modal opens
      const interval = setInterval(updateModalImg, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [isDialogOpen, streams, activeStream]);

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

  const handleImageClick = () => {
    if (connectionStatus === 'connected' && !imgLoading) {
      setIsDialogOpen(true);
      setModalImgLoading(true);
      // Modal image will be updated by the useEffect when dialog opens
    }
  };

  const handleModalImageLoad = () => {
    setModalImgLoading(false);
  };

  const handleModalImageError = () => {
    setModalImgLoading(false);
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
                style={{
                  ...getImageStyle(getStreamType(activeStream)),
                  cursor: connectionStatus === 'connected' && !imgLoading ? 'pointer' : 'default'
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                onClick={handleImageClick}
                title={connectionStatus === 'connected' && !imgLoading ? 'Click to view fullscreen' : undefined}
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

          {/* Fullscreen Icon Overlay */}
          {connectionStatus === 'connected' && !imgLoading && !isTransitioning && (
            <IconButton
              size="2"
              variant="soft"
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                zIndex: 1,
                opacity: 0.8,
                cursor: 'pointer'
              }}
              onClick={handleImageClick}
              title="View fullscreen"
            >
              <EnterFullScreenIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Fullscreen Dialog Modal */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content 
          style={{ 
            maxWidth: '95vw', 
            maxHeight: '95vh', 
            width: 'auto',
            height: 'auto',
            padding: '16px',
            backgroundColor: 'var(--color-panel-solid)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden' // Prevent any scroll
          }}
        >
          <Dialog.Title>
            <Flex align="center" justify="between" mb="3" style={{ flexShrink: 0 }}>
              <Flex align="center" gap="2">
                <VideoIcon width="20" height="20" />
                <Text size="4" weight="bold">Live Stream - Camera {activeStream + 1}</Text>
                <Badge color="red" size="1">LIVE</Badge>
              </Flex>
              <Dialog.Close>
                <IconButton variant="ghost" size="2">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          <Box 
            style={{
              position: 'relative',
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0, // Allow flex item to shrink below content size
              overflow: 'hidden',
              padding: '8px' // Add some padding to prevent tight edges
            }}
          >
            {modalImgLoading && (
              <Flex 
                align="center" 
                justify="center" 
                gap="2"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2
                }}
              >
                <ReloadIcon 
                  width="32" 
                  height="32" 
                  className="loading-spinner"
                  style={{ color: 'var(--accent-9)' }}
                />
                <Text size="3" color="gray">Loading fullscreen view...</Text>
              </Flex>
            )}

            <img
              ref={modalImgRef}
              src={modalImgSrc}
              alt={`Live Stream ${activeStream + 1} - Fullscreen`}
              style={{
                maxWidth: 'calc(100% - 16px)', // Account for container padding
                maxHeight: 'calc(100% - 16px)', // Account for container padding
                width: 'auto',
                height: 'auto',
                borderRadius: 'var(--radius-3)',
                opacity: modalImgLoading ? 0.3 : 1,
                transition: 'opacity 0.3s ease-in-out',
                objectFit: 'contain', // This preserves aspect ratio and shows full image
                objectPosition: 'center', // Centers the image within container
                display: 'block'
              }}
              onLoad={handleModalImageLoad}
              onError={handleModalImageError}
            />
          </Box>

          {/* Modal Stream Info - Only show if there's space */}
          {stats && stats[activeStream] && (
            <Box style={{ flexShrink: 0, maxHeight: '120px', overflow: 'auto' }}>
              <Flex direction="column" gap="2" mt="3" p="3" style={{ 
                backgroundColor: 'var(--color-surface-raised)',
                borderRadius: 'var(--radius-2)'
              }}>
                <Text size="2" weight="bold" color="gray">Stream Information</Text>
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
            </Box>
          )}
        </Dialog.Content>
      </Dialog.Root>

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
