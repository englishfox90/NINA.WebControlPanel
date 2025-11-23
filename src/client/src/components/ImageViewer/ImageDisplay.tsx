/**
 * Image Display Component
 * Handles the actual image rendering with error states and loading
 */

import React, { useState } from 'react';
import { Box, Flex, Text, Spinner, Callout, Badge } from '@radix-ui/themes';
import { ExclamationTriangleIcon, ClockIcon } from '@radix-ui/react-icons';
import ImageModal from '../ImageModal';
import type { ImageStatistics } from '../../interfaces/image';

interface ImageDisplayProps {
  latestImage: string | null;
  imageLoading: boolean;
  error: string | null;
  isImagingSession: boolean;
  nextRefreshIn?: number | null;
  imageStats?: ImageStatistics | null;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  latestImage,
  imageLoading,
  error,
  isImagingSession,
  nextRefreshIn,
  imageStats
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine image type badge color
  const getImageTypeBadgeColor = (imageType?: string) => {
    if (!imageType) return 'gray';
    const type = imageType.toUpperCase();
    switch (type) {
      case 'LIGHT': return 'green';
      case 'DARK': return 'purple';
      case 'FLAT': return 'blue';
      case 'BIAS': return 'orange';
      case 'DARKFLAT': return 'violet';
      default: return 'gray';
    }
  };

  // Error state
  if (error) {
    return (
      <Callout.Root color="red" mb="3">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">Image Error</Text><br />
          <Text size="1" color="gray">{error}</Text>
        </Callout.Text>
      </Callout.Root>
    );
  }

  // Loading state
  if (imageLoading) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        style={{ 
          minHeight: '200px',
          background: 'var(--gray-2)',
          borderRadius: 'var(--radius-3)',
          border: '1px solid var(--gray-6)'
        }}
        gap="3"
      >
        <Spinner size="3" />
        <Text size="2" color="gray">Loading latest image...</Text>
      </Flex>
    );
  }

  // No image available
  if (!latestImage) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        style={{ 
          minHeight: '200px',
          background: 'var(--gray-2)',
          borderRadius: 'var(--radius-3)',
          border: '1px solid var(--gray-6)'
        }}
        gap="3"
      >
        <Text size="3" color="gray">
          {isImagingSession ? 'Waiting for next image...' : 'No image available'}
        </Text>
        <Text size="1" color="gray">
          {isImagingSession 
            ? 'Images will appear here when captured' 
            : 'Start an imaging session to see the latest captured image'
          }
        </Text>
      </Flex>
    );
  }

  // Image display
  return (
    <>
      <Box style={{ position: 'relative' }}>
        <img
          src={latestImage}
          alt="Latest captured image"
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '400px',
            objectFit: 'contain',
            borderRadius: 'var(--radius-3)',
            border: '1px solid var(--gray-6)',
            background: 'var(--gray-1)',
            cursor: 'pointer'
          }}
          onClick={() => setIsModalOpen(true)}
          onError={(e) => {
            console.error('📸 Image failed to load:', e);
          }}
          onLoad={() => {
            // Image loaded successfully
          }}
        />
        
        {/* Image type badge in bottom left corner */}
        {imageStats?.ImageType && (
          <Box
            style={{
              position: 'absolute',
              bottom: '15px',
              left: '8px',
              // background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 'var(--radius-2)',
              padding: '4px 8px'
            }}
          >
            <Badge 
              color={getImageTypeBadgeColor(imageStats.ImageType)} 
              variant="solid"
              size="1"
            >
              {imageStats.ImageType}
            </Badge>
          </Box>
        )}
        
        {/* Countdown overlay in bottom right corner */}
        {nextRefreshIn && nextRefreshIn > 0 && (
          <Box
            style={{
              position: 'absolute',
              bottom: '15px',
              right: '8px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 'var(--radius-2)',
              padding: '4px 8px'
            }}
          >
            <Flex align="center" gap="1">
              <Text size="1" style={{ color: 'orange', fontWeight: 'bold' }}>
                {Math.floor(nextRefreshIn / 60)}:{(nextRefreshIn % 60).toString().padStart(2, '0')}
              </Text>
              <ClockIcon width="12" height="12" style={{ color: 'orange' }} />
            </Flex>
          </Box>
        )}
      </Box>

      {/* Full-screen image modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageSrc={latestImage}
        imageAlt="Latest captured image - Full size"
      />
    </>
  );
};
