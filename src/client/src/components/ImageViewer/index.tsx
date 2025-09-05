/**
 * Modular Image Viewer Widget
 * Clean, maintainable implementation using the modular architecture pattern
 */

import React from 'react';
import { Card, Flex } from '@radix-ui/themes';
import type { ImageViewerProps } from '../../interfaces/dashboard';

// Modular components
import { useImageData } from './useImageData';
import { ImageHeader } from './ImageHeader';
import { ImageDisplay } from './ImageDisplay';
import { ImageStats } from './ImageStats';

const ImageViewerWidget: React.FC<ImageViewerProps> = ({ 
  onRefresh, 
  hideHeader = false 
}) => {
  // Use the modular data hook
  const {
    latestImage,
    imageStats,
    imageLoading,
    error,
    isImagingSession,
    sessionData,
    refreshImage
  } = useImageData();

  // Handle refresh with callback
  const handleRefresh = async () => {
    await refreshImage();
    onRefresh?.();
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header with session status and controls */}
        <ImageHeader
          hideHeader={hideHeader}
          isImagingSession={isImagingSession}
          imageLoading={imageLoading}
          sessionData={sessionData}
          onRefresh={handleRefresh}
        />

        {/* Main image display */}
        <ImageDisplay
          latestImage={latestImage}
          imageLoading={imageLoading}
          error={error}
          isImagingSession={isImagingSession}
        />

        {/* Image statistics panel */}
        <ImageStats imageStats={imageStats} />
      </Flex>
    </Card>
  );
};

export default ImageViewerWidget;
