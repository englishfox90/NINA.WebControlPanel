import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Box, 
  Flex, 
  Text, 
  Button, 
  Badge, 
  Spinner,
  Callout,
  Separator
} from '@radix-ui/themes';
import { 
  CameraIcon, 
  ReloadIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons';
import { useImageViewerWebSocket } from '../hooks/useUnifiedWebSocket';
import { getApiUrl } from '../config/api';
import type { ImageHistoryItem, ImageData } from '../interfaces/equipment';
import type { ImageViewerProps } from '../interfaces/dashboard';

export const ImageViewerWidget: React.FC<ImageViewerProps> = ({ onRefresh, hideHeader = false }) => {
  const [images, setImages] = useState<ImageHistoryItem[]>([]);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImageSave, setLastImageSave] = useState<string>('');

  // Use enhanced unified WebSocket for image events
  const { 
    onWidgetEvent
  } = useImageViewerWebSocket();

  const fetchImageHistory = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(getApiUrl('nina/image-history'));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image history: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.Success || result.Error) {
        throw new Error(result.Error || 'Failed to fetch image history');
      }

      // Sort images by creation date (newest first) and take first 10
      const sortedImages = (result.Response || [])
        .sort((a: ImageHistoryItem, b: ImageHistoryItem) => 
          new Date(b.Date).getTime() - new Date(a.Date).getTime()
        )
        .slice(0, 10);

      setImages(sortedImages);
      
      // Automatically load the most recent image if available (using first image's Date as index)
      if (sortedImages.length > 0) {
        // For now, we'll use index 0 since we don't have individual image indices from this API
        // This endpoint seems to be for image history metadata, not individual image loading
        console.log('Most recent image:', sortedImages[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching image history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLatestImage = useCallback(async (imageIndex: number = 0) => {
    try {
      setImageLoading(true);
      setCurrentImageIndex(imageIndex);
      
      // Fetch image by index with web optimization
      const response = await fetch(getApiUrl(`nina/image/${imageIndex}?resize=true&size=medium&quality=85`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const data: ImageData = await response.json();
      
      if (data.Success && data.Response) {
        // Convert base64 to data URL for display
        setLatestImage(`data:image/jpeg;base64,${data.Response}`);
        console.log(`📸 Image ${imageIndex} loaded successfully`);
      } else {
        console.warn(`⚠️ No image available at index ${imageIndex} or API error:`, data.Error);
        setLatestImage(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      console.error(`❌ Image fetch error (index ${imageIndex}):`, errorMessage);
      setLatestImage(null);
    } finally {
      setImageLoading(false);
    }
  }, []);

  // Enhanced WebSocket event handler for image saves
  const handleImageSaveEvent = useCallback((event: any) => {
    console.log('📸 Image save event received:', event.Type, event.Data);
    
    // Only process IMAGE-SAVE events with ImageStatistics (ignore calibration images)
    if (event.Type === 'IMAGE-SAVE' && event.Data?.ImageStatistics && event.Data.ImageStatistics.index !== undefined) {
      const imageStats = event.Data.ImageStatistics;
      console.log('✅ Processing light frame with ImageStatistics:', imageStats);
      
      setLastImageSave(event.Timestamp);
      
      let imageIndex = imageStats.index; 
      
      // Extract image index from ImageStatistics
      if (imageStats.Index !== undefined) {
        imageIndex = Math.floor(imageStats.Index);
        console.log(`📸 Using image index from ImageStatistics: ${imageIndex}`);
      } else {
        console.log('📸 No index in ImageStatistics, using latest image (index 0)');
      }
      
      fetchImageHistory();
      fetchLatestImage(imageIndex);
    } else if (event.Type === 'IMAGE-SAVE') {
      console.log('📸 Ignoring IMAGE-SAVE event without ImageStatistics (likely calibration frame)');
    }
  }, [fetchImageHistory, fetchLatestImage]);

  // Subscribe to image save WebSocket events using enhanced system
  useEffect(() => {
    const unsubscribeWidget = onWidgetEvent(handleImageSaveEvent);
    
    return () => {
      unsubscribeWidget();
    };
  }, [onWidgetEvent, handleImageSaveEvent]);

  useEffect(() => {
    fetchImageHistory();
    fetchLatestImage(0); // Load most recent image initially
  }, [fetchImageHistory, fetchLatestImage]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatNumber = (num: number | undefined) => {
    return num?.toFixed(2) || 'N/A';
  };

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <CameraIcon />
              <Text size="3" weight="medium">Latest NINA Images</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ReloadIcon className="loading-spinner" />
              <Text size="2" color="gray">Loading images...</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (error && images.length === 0) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <CameraIcon />
              <Text size="3" weight="medium">Latest NINA Images</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ExclamationTriangleIcon color="red" width="24" height="24" />
              <Text size="2" color="red">Failed to load images</Text>
              <Text size="1" color="gray">{error}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        {/* Header */}
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <CameraIcon />
              <Text size="3" weight="medium">Latest NINA Images</Text>
              {lastImageSave && (
                <Badge variant="soft" color="green" size="1">
                  Live Updates
                </Badge>
              )}
            </Flex>
            <Button 
              onClick={() => {
                fetchImageHistory();
                fetchLatestImage(0); // Load most recent image on manual refresh
              }}
              variant="outline" 
              size="2"
              disabled={loading || imageLoading}
            >
              <ReloadIcon />
              Refresh
            </Button>
          </Flex>
        )}

        {/* Status badge for grid layout */}
        {hideHeader && (
          <Flex justify="center">
            <Badge color="blue" size="2">
              <CameraIcon width="12" height="12" />
              {images.length} Images
            </Badge>
          </Flex>
        )}

        {error && (
          <Callout.Root color="orange">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {images.length === 0 ? (
          <Flex direction="column" align="center" gap="3" py="6">
            <CameraIcon width="24" height="24" />
            <Text color="gray">No images available</Text>
            <Text size="2" color="gray">
              Images will appear here when NINA captures new photos
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            {/* Latest Image Display */}
            {latestImage && (
              <Box>
                <Flex justify="between" align="center" mb="3">
                  <Text size="2" weight="medium">Latest Captured Image:</Text>
                  <Badge variant="soft" color="blue" size="1">
                    Index {currentImageIndex}
                  </Badge>
                </Flex>
                <Card>
                  <Box p="3">
                    {imageLoading ? (
                      <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
                        <Spinner size="3" />
                      </Flex>
                    ) : (
                      <Box style={{ textAlign: 'center' }}>
                        <img 
                          src={latestImage}
                          alt="Latest NINA capture"
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-3)'
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Card>
                <Separator size="4" my="4" />
              </Box>
            )}

            {/* Image Metadata List */}
            <Box>
              <Text size="2" weight="medium" mb="3">Recent Images:</Text>
              <Flex direction="column" gap="2">
                {images.map((image, index) => (
                  <Card key={`${image.Date}-${index}`} variant="surface">
                    <Flex 
                      justify="between" 
                      align="center" 
                      p="3"
                    >
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="medium">
                          {image.Filter} - {image.ExposureTime}s {image.ImageType}
                        </Text>
                        <Text size="1" color="gray">
                          {formatDate(image.Date)}
                        </Text>
                        <Text size="1" color="gray">
                          {image.CameraName} • {image.TelescopeName}
                        </Text>
                      </Flex>
                      <Flex direction="column" gap="1" align="end">
                        <Badge color="blue">{image.Filter}</Badge>
                        {image.HFR && (
                          <Text size="1" color="gray">
                            HFR: {formatNumber(image.HFR)}
                          </Text>
                        )}
                        {image.Stars && (
                          <Text size="1" color="gray">
                            Stars: {image.Stars}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </Box>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default ImageViewerWidget;
