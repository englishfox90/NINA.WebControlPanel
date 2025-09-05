/**
 * Image Display Component
 * Handles the actual image rendering with error states and loading
 */

import React from 'react';
import { Box, Flex, Text, Spinner, Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface ImageDisplayProps {
  latestImage: string | null;
  imageLoading: boolean;
  error: string | null;
  isImagingSession: boolean;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  latestImage,
  imageLoading,
  error,
  isImagingSession
}) => {
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
    <Box>
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
          background: 'var(--gray-1)'
        }}
        onError={(e) => {
          console.error('📸 Image failed to load:', e);
        }}
        onLoad={() => {
          console.log('📸 Image loaded successfully in DOM');
        }}
      />
    </Box>
  );
};
